import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AttendanceStatus,
  MarkBatchAttendanceDto,
  Role,
} from '@repo/shared';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../common/types/request.types';

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeDate(dateStr?: string): Date {
    const isoDate =
      dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)
        ? dateStr
        : new Date().toISOString().slice(0, 10);
    return new Date(`${isoDate}T00:00:00.000Z`);
  }

  private computeSummary(records: Array<{ status: string }>) {
    const totalClasses = records.length;
    const present = records.filter((r) => r.status === 'PRESENT').length;
    const absent = records.filter((r) => r.status === 'ABSENT').length;
    const late = records.filter((r) => r.status === 'LATE').length;
    const excused = records.filter((r) => r.status === 'EXCUSED').length;
    const attended = present + late;
    const attendanceRate =
      totalClasses > 0 ? Math.round((attended / totalClasses) * 100) : 0;

    return {
      totalClasses,
      present,
      absent,
      late,
      excused,
      attendanceRate,
    };
  }

  /**
   * Get batch attendance sheet for a specific date (returns all enrolled students + their record for that date).
   */
  async getBatchAttendanceSheet(
    tenantId: string,
    batchId: string,
    dateStr: string | undefined,
    user: AuthUser,
  ) {
    if (!tenantId) {
      throw new BadRequestException('Tenant context is required');
    }

    const batch = await this.prisma.batch.findFirst({
      where: { id: batchId, tenantId },
      include: { course: true },
    });

    if (!batch) {
      throw new NotFoundException('Batch not found');
    }

    if (
      user.role === Role.INSTRUCTOR &&
      batch.instructorId !== user.userId
    ) {
      throw new ForbiddenException('You do not have access to this batch');
    }

    const sessionDate = this.normalizeDate(dateStr);

    const [students, existingRecords] = await Promise.all([
      this.prisma.student.findMany({
        where: { batchId, tenantId, user: { isActive: true } },
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
        orderBy: { user: { firstName: 'asc' } },
      }),
      this.prisma.attendanceRecord.findMany({
        where: { batchId, tenantId, date: sessionDate },
      }),
    ]);

    const recordMap = new Map(
      existingRecords.map((rec) => [rec.studentId, rec]),
    );

    const sheet = students.map((student) => {
      const existing = recordMap.get(student.id);
      return {
        studentId: student.id,
        firstName: student.user.firstName,
        lastName: student.user.lastName,
        phone: student.user.phone,
        email: student.user.email,
        status:
          (existing?.status as AttendanceStatus) ?? AttendanceStatus.PRESENT,
        remarks: existing?.remarks ?? '',
        isMarked: Boolean(existing),
      };
    });

    return {
      batch,
      date: sessionDate.toISOString().slice(0, 10),
      isAlreadyMarked: existingRecords.length > 0,
      students: sheet,
    };
  }

  /**
   * Mark or update attendance for a batch on a given date.
   */
  async markBatchAttendance(
    tenantId: string,
    user: AuthUser,
    dto: MarkBatchAttendanceDto,
  ) {
    if (!tenantId) {
      throw new BadRequestException('Tenant context is required');
    }

    const batch = await this.prisma.batch.findFirst({
      where: { id: dto.batchId, tenantId },
    });

    if (!batch) {
      throw new NotFoundException('Batch not found');
    }

    if (
      user.role === Role.INSTRUCTOR &&
      batch.instructorId !== user.userId
    ) {
      throw new ForbiddenException('You can only mark attendance for your own batches');
    }

    const sessionDate = this.normalizeDate(dto.date);

    const saved = await this.prisma.$transaction(
      dto.records.map((entry) =>
        this.prisma.attendanceRecord.upsert({
          where: {
            studentId_batchId_date: {
              studentId: entry.studentId,
              batchId: dto.batchId,
              date: sessionDate,
            },
          },
          update: {
            status: entry.status,
            remarks: entry.remarks?.trim() || null,
            markedById: user.userId,
          },
          create: {
            studentId: entry.studentId,
            batchId: dto.batchId,
            date: sessionDate,
            status: entry.status,
            remarks: entry.remarks?.trim() || null,
            markedById: user.userId,
            tenantId,
          },
        }),
      ),
    );

    return {
      success: true,
      message: `Saved attendance for ${saved.length} student(s)`,
      count: saved.length,
    };
  }

  /**
   * Get attendance summary and history for a specific student (Admin / Staff / Instructor).
   */
  async getStudentAttendance(
    tenantId: string,
    studentId: string,
    user: AuthUser,
  ) {
    if (!tenantId) {
      throw new BadRequestException('Tenant context is required');
    }

    const student = await this.prisma.student.findFirst({
      where: { id: studentId, tenantId },
      include: {
        user: {
          select: { firstName: true, lastName: true, email: true, phone: true },
        },
        batch: { include: { course: true } },
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    if (
      user.role === Role.INSTRUCTOR &&
      student.batch?.instructorId !== user.userId
    ) {
      throw new ForbiddenException('You do not have access to this student');
    }

    const records = await this.prisma.attendanceRecord.findMany({
      where: { studentId, tenantId },
      include: {
        batch: { include: { course: true } },
      },
      orderBy: { date: 'desc' },
    });

    return {
      student,
      summary: this.computeSummary(records),
      records,
    };
  }

  /**
   * Get logged-in student's own attendance summary and history.
   */
  async getMyAttendance(tenantId: string, userId: string) {
    if (!tenantId) {
      throw new BadRequestException('Tenant context is required');
    }

    const student = await this.prisma.student.findFirst({
      where: { userId, tenantId },
      include: {
        user: {
          select: { firstName: true, lastName: true, email: true, phone: true },
        },
        batch: { include: { course: true } },
      },
    });

    if (!student) {
      throw new NotFoundException('Student profile not found');
    }

    const records = await this.prisma.attendanceRecord.findMany({
      where: { studentId: student.id, tenantId },
      include: {
        batch: { include: { course: true } },
      },
      orderBy: { date: 'desc' },
    });

    return {
      student,
      summary: this.computeSummary(records),
      records,
    };
  }
}
