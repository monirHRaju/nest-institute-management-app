import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BulkUpsertExamResultsDto,
  CreateExamDto,
  ExamStatus,
  Role,
  UpdateExamDto,
  UpsertGradeScaleDto,
} from '@repo/shared';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../common/types/request.types';

export interface GradeScaleRule {
  grade: string;
  minPercent: number;
  maxPercent: number;
  gpaPoint: number;
}

export const DEFAULT_GRADE_SCALES: GradeScaleRule[] = [
  { grade: 'A+', minPercent: 80, maxPercent: 100, gpaPoint: 5.0 },
  { grade: 'A', minPercent: 70, maxPercent: 79.99, gpaPoint: 4.0 },
  { grade: 'A-', minPercent: 60, maxPercent: 69.99, gpaPoint: 3.5 },
  { grade: 'B', minPercent: 50, maxPercent: 59.99, gpaPoint: 3.0 },
  { grade: 'C', minPercent: 40, maxPercent: 49.99, gpaPoint: 2.0 },
  { grade: 'D', minPercent: 33, maxPercent: 39.99, gpaPoint: 1.0 },
  { grade: 'F', minPercent: 0, maxPercent: 32.99, gpaPoint: 0.0 },
];

export function computeGrade(
  marksObtained: number,
  totalMarks: number,
  passMarks: number,
  isAbsent: boolean,
  scales: GradeScaleRule[],
): { grade: string; gpaPoint: number; passed: boolean; percent: number } {
  if (isAbsent) {
    return { grade: 'F', gpaPoint: 0, passed: false, percent: 0 };
  }
  const safeTotal = totalMarks > 0 ? totalMarks : 100;
  const percent = Number(((marksObtained / safeTotal) * 100).toFixed(2));
  const passed = marksObtained >= passMarks;

  if (!passed) {
    return { grade: 'F', gpaPoint: 0, passed: false, percent };
  }

  const sorted = [...scales].sort((a, b) => b.minPercent - a.minPercent);
  const matched = sorted.find(
    (s) => percent >= s.minPercent && percent <= s.maxPercent,
  );

  if (matched) {
    return {
      grade: matched.grade,
      gpaPoint: matched.gpaPoint,
      passed: matched.grade !== 'F' && passed,
      percent,
    };
  }

  return { grade: passed ? 'P' : 'F', gpaPoint: passed ? 1.0 : 0, passed, percent };
}

export interface FindExamsQuery {
  batchId?: string;
  courseId?: string;
  type?: string;
  status?: string;
  term?: string;
}

@Injectable()
export class ExamsService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Grade Scales ───────────────────────────────────────────────────────────

  async getGradeScales(tenantId: string): Promise<any[]> {
    if (!tenantId) {
      throw new BadRequestException('Tenant context is required');
    }

    const existing = await this.prisma.gradeScale.findMany({
      where: { tenantId },
      orderBy: { minPercent: 'desc' },
    });

    if (existing.length > 0) {
      return existing;
    }

    // Seed default scales for this tenant on first access
    await this.prisma.gradeScale.createMany({
      data: DEFAULT_GRADE_SCALES.map((s) => ({
        tenantId,
        grade: s.grade,
        minPercent: s.minPercent,
        maxPercent: s.maxPercent,
        gpaPoint: s.gpaPoint,
      })),
    });

    return this.prisma.gradeScale.findMany({
      where: { tenantId },
      orderBy: { minPercent: 'desc' },
    });
  }

  async upsertGradeScales(
    tenantId: string,
    dto: UpsertGradeScaleDto,
  ): Promise<any[]> {
    if (!tenantId) {
      throw new BadRequestException('Tenant context is required');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.gradeScale.deleteMany({ where: { tenantId } });
      await tx.gradeScale.createMany({
        data: dto.scales.map((s) => ({
          tenantId,
          grade: s.grade.trim(),
          minPercent: s.minPercent,
          maxPercent: s.maxPercent,
          gpaPoint: s.gpaPoint,
        })),
      });
    });

    return this.prisma.gradeScale.findMany({
      where: { tenantId },
      orderBy: { minPercent: 'desc' },
    });
  }

  // ── Exams CRUD ─────────────────────────────────────────────────────────────

  async findAll(
    tenantId: string,
    user: AuthUser,
    query: FindExamsQuery = {},
  ): Promise<any[]> {
    if (!tenantId) {
      throw new BadRequestException('Tenant context is required');
    }

    const where: any = { tenantId };
    if (query.batchId) where.batchId = query.batchId;
    if (query.courseId) where.courseId = query.courseId;
    if (query.type) where.type = query.type;
    if (query.status) where.status = query.status;
    if (query.term) where.term = { contains: query.term, mode: 'insensitive' };

    if (user.role === Role.INSTRUCTOR) {
      where.batch = { instructorId: user.userId };
    }

    return this.prisma.exam.findMany({
      where,
      include: {
        batch: {
          select: {
            id: true,
            name: true,
            instructorId: true,
            _count: { select: { students: true } },
          },
        },
        course: {
          select: { id: true, name: true },
        },
        _count: {
          select: { results: true },
        },
      },
      orderBy: { date: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string, user: AuthUser): Promise<any> {
    if (!tenantId) {
      throw new BadRequestException('Tenant context is required');
    }

    const exam = await this.prisma.exam.findFirst({
      where: { id, tenantId },
      include: {
        batch: {
          include: {
            course: true,
            instructor: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
        course: true,
        _count: { select: { results: true } },
      },
    });

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    if (
      user.role === Role.INSTRUCTOR &&
      exam.batch.instructorId !== user.userId
    ) {
      throw new ForbiddenException('You are not assigned to this batch');
    }

    return exam;
  }

  async create(
    tenantId: string,
    user: AuthUser,
    dto: CreateExamDto,
  ): Promise<any> {
    if (!tenantId) {
      throw new BadRequestException('Tenant context is required');
    }

    const batch = await this.prisma.batch.findFirst({
      where: { id: dto.batchId, tenantId },
    });
    if (!batch) {
      throw new NotFoundException('Batch not found');
    }

    if (user.role === Role.INSTRUCTOR && batch.instructorId !== user.userId) {
      throw new ForbiddenException('You can only create exams for your assigned batches');
    }

    if (dto.passMarks > dto.totalMarks) {
      throw new BadRequestException('Pass marks cannot exceed total marks');
    }

    return this.prisma.exam.create({
      data: {
        tenantId,
        name: dto.name,
        type: dto.type,
        term: dto.term ?? null,
        date: dto.date,
        totalMarks: dto.totalMarks,
        passMarks: dto.passMarks,
        batchId: batch.id,
        courseId: dto.courseId ?? batch.courseId,
        status: ExamStatus.DRAFT,
      },
      include: {
        batch: { select: { id: true, name: true } },
        course: { select: { id: true, name: true } },
      },
    });
  }

  async update(
    tenantId: string,
    id: string,
    user: AuthUser,
    dto: UpdateExamDto,
  ): Promise<any> {
    const existing = await this.findOne(tenantId, id, user);

    const nextTotal =
      dto.totalMarks !== undefined ? dto.totalMarks : Number(existing.totalMarks);
    const nextPass =
      dto.passMarks !== undefined ? dto.passMarks : Number(existing.passMarks);

    if (nextPass > nextTotal) {
      throw new BadRequestException('Pass marks cannot exceed total marks');
    }

    return this.prisma.exam.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(dto.term !== undefined ? { term: dto.term } : {}),
        ...(dto.date !== undefined ? { date: dto.date } : {}),
        ...(dto.totalMarks !== undefined ? { totalMarks: dto.totalMarks } : {}),
        ...(dto.passMarks !== undefined ? { passMarks: dto.passMarks } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
      },
      include: {
        batch: { select: { id: true, name: true } },
        course: { select: { id: true, name: true } },
      },
    });
  }

  async publish(tenantId: string, id: string, user: AuthUser): Promise<any> {
    await this.findOne(tenantId, id, user);

    return this.prisma.exam.update({
      where: { id },
      data: { status: ExamStatus.PUBLISHED },
    });
  }

  async remove(tenantId: string, id: string, user: AuthUser): Promise<any> {
    await this.findOne(tenantId, id, user);
    await this.prisma.exam.delete({ where: { id } });
    return { deleted: true };
  }

  // ── Marks Entry & Merit List ───────────────────────────────────────────────

  async bulkUpsertResults(
    tenantId: string,
    examId: string,
    user: AuthUser,
    dto: BulkUpsertExamResultsDto,
  ): Promise<any> {
    const exam = await this.findOne(tenantId, examId, user);
    const totalMarks = Number(exam.totalMarks);
    const passMarks = Number(exam.passMarks);

    const scalesRaw = await this.getGradeScales(tenantId);
    const scales: GradeScaleRule[] = scalesRaw.map((s) => ({
      grade: s.grade,
      minPercent: Number(s.minPercent),
      maxPercent: Number(s.maxPercent),
      gpaPoint: Number(s.gpaPoint),
    }));

    for (const entry of dto.results) {
      if (!entry.isAbsent && entry.marksObtained > totalMarks) {
        throw new BadRequestException(
          `Marks (${entry.marksObtained}) cannot exceed total marks (${totalMarks})`,
        );
      }
    }

    const batchStudents = await this.prisma.student.findMany({
      where: { tenantId, batchId: exam.batchId },
      select: { id: true },
    });
    const validStudentIds = new Set(batchStudents.map((s) => s.id));

    for (const entry of dto.results) {
      if (!validStudentIds.has(entry.studentId)) {
        throw new BadRequestException(
          `Student ${entry.studentId} is not enrolled in this exam's batch`,
        );
      }
    }

    await this.prisma.$transaction(
      dto.results.map((entry) => {
        const marks = entry.isAbsent ? 0 : entry.marksObtained;
        const computed = computeGrade(
          marks,
          totalMarks,
          passMarks,
          entry.isAbsent,
          scales,
        );

        return this.prisma.examResult.upsert({
          where: {
            examId_studentId: {
              examId,
              studentId: entry.studentId,
            },
          },
          create: {
            tenantId,
            examId,
            studentId: entry.studentId,
            marksObtained: marks,
            grade: computed.grade,
            gpaPoint: computed.gpaPoint,
            isAbsent: entry.isAbsent,
            remarks: entry.remarks ?? null,
            enteredById: user.userId,
          },
          update: {
            marksObtained: marks,
            grade: computed.grade,
            gpaPoint: computed.gpaPoint,
            isAbsent: entry.isAbsent,
            remarks: entry.remarks ?? null,
            enteredById: user.userId,
          },
        });
      }),
    );

    return this.getExamResults(tenantId, examId, user);
  }

  async getExamResults(
    tenantId: string,
    examId: string,
    user: AuthUser,
  ): Promise<any> {
    const exam = await this.findOne(tenantId, examId, user);
    const totalMarks = Number(exam.totalMarks);
    const passMarks = Number(exam.passMarks);

    const students = await this.prisma.student.findMany({
      where: { tenantId, batchId: exam.batchId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: [{ user: { firstName: 'asc' } }, { user: { lastName: 'asc' } }],
    });

    const results = await this.prisma.examResult.findMany({
      where: { tenantId, examId },
    });
    const resultMap = new Map(results.map((r) => [r.studentId, r]));

    // Build merit ranking for present students with saved results
    const ranked = [...results]
      .filter((r) => !r.isAbsent)
      .sort((a, b) => Number(b.marksObtained) - Number(a.marksObtained));

    const rankMap = new Map<string, number>();
    let currentRank = 0;
    let prevMarks: number | null = null;
    ranked.forEach((r, idx) => {
      const m = Number(r.marksObtained);
      if (prevMarks === null || m < prevMarks) {
        currentRank = idx + 1;
        prevMarks = m;
      }
      rankMap.set(r.studentId, currentRank);
    });

    const entries = students.map((student) => {
      const r = resultMap.get(student.id);
      const marks = r ? Number(r.marksObtained) : null;
      const passed =
        r && !r.isAbsent ? Number(r.marksObtained) >= passMarks : false;

      return {
        studentId: student.id,
        student: {
          id: student.id,
          firstName: student.user.firstName,
          lastName: student.user.lastName,
          email: student.user.email,
          phone: student.user.phone,
        },
        resultId: r?.id ?? null,
        marksObtained: marks,
        grade: r?.grade ?? null,
        gpaPoint: r?.gpaPoint ? Number(r.gpaPoint) : null,
        isAbsent: r?.isAbsent ?? false,
        remarks: r?.remarks ?? '',
        passed: r ? passed : null,
        rank: rankMap.get(student.id) ?? null,
        percent:
          marks !== null && totalMarks > 0
            ? Number(((marks / totalMarks) * 100).toFixed(2))
            : null,
      };
    });

    const presentResults = results.filter((r) => !r.isAbsent);
    const totalPresent = presentResults.length;
    const sumMarks = presentResults.reduce(
      (acc, r) => acc + Number(r.marksObtained),
      0,
    );
    const classAverage =
      totalPresent > 0 ? Number((sumMarks / totalPresent).toFixed(2)) : 0;
    const highestMarks =
      totalPresent > 0
        ? Math.max(...presentResults.map((r) => Number(r.marksObtained)))
        : 0;
    const passCount = presentResults.filter(
      (r) => Number(r.marksObtained) >= passMarks,
    ).length;

    return {
      exam,
      summary: {
        totalStudents: students.length,
        gradedCount: results.length,
        presentCount: totalPresent,
        absentCount: results.filter((r) => r.isAbsent).length,
        passCount,
        failCount: results.length - passCount,
        classAverage,
        highestMarks,
      },
      entries,
    };
  }

  // ── Student Results & Report Card ──────────────────────────────────────────

  async getMyResults(tenantId: string, userId: string): Promise<any> {
    if (!tenantId) {
      throw new BadRequestException('Tenant context is required');
    }

    const student = await this.prisma.student.findFirst({
      where: { tenantId, userId },
    });
    if (!student) {
      throw new NotFoundException('Student profile not found');
    }

    return this.getStudentResults(tenantId, student.id, {
      userId,
      email: '',
      role: Role.STUDENT,
      tenantId,
    });
  }

  async getStudentResults(
    tenantId: string,
    studentId: string,
    user: AuthUser,
  ): Promise<any> {
    if (!tenantId) {
      throw new BadRequestException('Tenant context is required');
    }

    const student = await this.prisma.student.findFirst({
      where: { id: studentId, tenantId },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        batch: {
          include: { course: true },
        },
      },
    });
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    if (user.role === Role.STUDENT && student.userId !== user.userId) {
      throw new ForbiddenException('You can only view your own results');
    }

    if (
      user.role === Role.INSTRUCTOR &&
      student.batch?.instructorId !== user.userId
    ) {
      throw new ForbiddenException('Student is not in your assigned batch');
    }

    const where: any = { tenantId, studentId };
    if (user.role === Role.STUDENT) {
      where.exam = { status: ExamStatus.PUBLISHED };
    }

    const results = await this.prisma.examResult.findMany({
      where,
      include: {
        exam: {
          include: {
            course: { select: { id: true, name: true } },
            batch: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { exam: { date: 'desc' } },
    });

    return { student, results };
  }

  async getReportCard(
    tenantId: string,
    studentId: string,
    user: AuthUser,
    term?: string,
  ): Promise<any> {
    if (!tenantId) {
      throw new BadRequestException('Tenant context is required');
    }

    const student = await this.prisma.student.findFirst({
      where: { id: studentId, tenantId },
      include: {
        tenant: {
          select: { id: true, name: true, slug: true, themeConfig: true },
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        batch: {
          include: {
            course: true,
            instructor: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    if (user.role === Role.STUDENT && student.userId !== user.userId) {
      throw new ForbiddenException('You can only view your own report card');
    }

    const resultWhere: any = {
      tenantId,
      studentId,
      exam: {
        status: ExamStatus.PUBLISHED,
        ...(term ? { term } : {}),
      },
    };

    const results = await this.prisma.examResult.findMany({
      where: resultWhere,
      include: {
        exam: {
          include: {
            course: { select: { id: true, name: true } },
            batch: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { exam: { date: 'asc' } },
    });

    let totalObtained = 0;
    let totalMax = 0;
    let gpaSum = 0;
    let gpaCount = 0;
    let allPassed = results.length > 0;

    const examRows = results.map((r) => {
      const obtained = Number(r.marksObtained);
      const max = Number(r.exam.totalMarks);
      const pass = Number(r.exam.passMarks);
      const passed = !r.isAbsent && obtained >= pass;
      if (!passed) allPassed = false;

      totalObtained += obtained;
      totalMax += max;
      if (r.gpaPoint !== null) {
        gpaSum += Number(r.gpaPoint);
        gpaCount += 1;
      }

      return {
        examId: r.examId,
        examName: r.exam.name,
        examType: r.exam.type,
        term: r.exam.term,
        date: r.exam.date,
        courseName: r.exam.course.name,
        totalMarks: max,
        passMarks: pass,
        marksObtained: obtained,
        percent: max > 0 ? Number(((obtained / max) * 100).toFixed(2)) : 0,
        grade: r.grade ?? (passed ? 'P' : 'F'),
        gpaPoint: r.gpaPoint !== null ? Number(r.gpaPoint) : null,
        isAbsent: r.isAbsent,
        passed,
        remarks: r.remarks,
      };
    });

    const overallPercent =
      totalMax > 0 ? Number(((totalObtained / totalMax) * 100).toFixed(2)) : 0;
    const averageGpa =
      gpaCount > 0 ? Number((gpaSum / gpaCount).toFixed(2)) : 0;

    // Attendance summary
    const attendanceRecords = await this.prisma.attendanceRecord.findMany({
      where: { tenantId, studentId },
      select: { status: true },
    });
    const totalClasses = attendanceRecords.length;
    const presentClasses = attendanceRecords.filter(
      (a) => a.status === 'PRESENT' || a.status === 'LATE',
    ).length;
    const attendancePercent =
      totalClasses > 0
        ? Number(((presentClasses / totalClasses) * 100).toFixed(1))
        : 0;

    return {
      tenant: student.tenant,
      student: {
        id: student.id,
        firstName: student.user.firstName,
        lastName: student.user.lastName,
        email: student.user.email,
        phone: student.user.phone,
        guardianName: student.guardianName,
        enrollmentDate: student.enrollmentDate,
        batchName: student.batch?.name ?? null,
        courseName: student.batch?.course?.name ?? null,
      },
      term: term ?? 'All Terms',
      exams: examRows,
      summary: {
        examCount: examRows.length,
        totalObtained: Number(totalObtained.toFixed(2)),
        totalMarks: Number(totalMax.toFixed(2)),
        overallPercent,
        averageGpa,
        overallResult:
          examRows.length === 0 ? 'NO_EXAMS' : allPassed ? 'PASS' : 'FAIL',
      },
      attendance: {
        totalClasses,
        presentClasses,
        attendancePercent,
      },
      generatedAt: new Date().toISOString(),
    };
  }
}
