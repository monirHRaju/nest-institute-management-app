import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  SaveBatchAttendanceDto,
  UpdateAttendanceRecordDto,
  AttendanceQueryDto,
  AttendanceStatus,
  BatchAttendanceSheetResponse,
  StudentAttendanceSummary,
  BatchAttendanceStats,
} from '@repo/shared';
import { withTenant } from '@repo/db';

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  /**
   * Helper to normalize a date string (YYYY-MM-DD or ISO) to UTC midnight date
   */
  private parseDateToUtc(dateInput: string | Date): Date {
    const str = typeof dateInput === 'string' ? dateInput.split('T')[0] : dateInput.toISOString().split('T')[0];
    return new Date(`${str}T00:00:00.000Z`);
  }

  /**
   * Bulk upserts attendance records for an entire batch on a specific date.
   * Uses an atomic transaction so re-submissions seamlessly update existing records.
   */
  async saveBatchAttendance(
    tenantId: string,
    userId: string,
    dto: SaveBatchAttendanceDto,
  ) {
    const sessionDate = this.parseDateToUtc(dto.date);

    // Validate batch exists and belongs to tenant
    const batch = await this.prisma.batch.findFirst({
      where: { id: dto.batchId, tenantId },
    });
    if (!batch) {
      throw new NotFoundException('Batch not found');
    }

    // Execute atomic upserts
    await this.prisma.$transaction(async (tx) => {
      for (const record of dto.records) {
        await tx.attendance.upsert({
          where: {
            studentId_batchId_date_tenantId: {
              studentId: record.studentId,
              batchId: dto.batchId,
              date: sessionDate,
              tenantId,
            },
          },
          update: {
            status: record.status,
            notes: record.notes ?? null,
            markedById: userId,
          },
          create: withTenant(tenantId, {
            studentId: record.studentId,
            batchId: dto.batchId,
            date: sessionDate,
            status: record.status,
            notes: record.notes ?? null,
            markedById: userId,
          }),
        });
      }
    });

    const dateStr = sessionDate.toISOString().split('T')[0];
    return this.getBatchAttendanceSheet(tenantId, dto.batchId, dateStr);
  }

  /**
   * Retrieves roll call sheet for a batch on a given date.
   * Returns all enrolled students in the batch and their recorded attendance (if already marked).
   */
  async getBatchAttendanceSheet(
    tenantId: string,
    batchId: string,
    dateStr?: string,
  ): Promise<BatchAttendanceSheetResponse> {
    const effectiveDateStr = dateStr?.trim() || new Date().toISOString().split('T')[0];
    const sessionDate = this.parseDateToUtc(effectiveDateStr);

    const batch = await this.prisma.batch.findFirst({
      where: { id: batchId, tenantId },
      include: {
        course: true,
        enrollments: {
          where: {
            status: { in: ['ENROLLED', 'ACTIVE'] },
          },
          include: {
            student: true,
          },
          orderBy: [
            { rollNumber: 'asc' },
            { student: { firstName: 'asc' } },
          ],
        },
      },
    });

    if (!batch) {
      throw new NotFoundException('Batch not found');
    }

    // Fetch existing attendance records for this batch and date
    const existingRecords = await this.prisma.attendance.findMany({
      where: {
        batchId,
        date: sessionDate,
        tenantId,
      },
    });

    const recordsMap = new Map(existingRecords.map((r) => [r.studentId, r]));

    const students = batch.enrollments.map((enr) => {
      const rec = recordsMap.get(enr.studentId);
      return {
        studentId: enr.student.id,
        systemId: enr.student.studentId,
        firstName: enr.student.firstName,
        lastName: enr.student.lastName,
        phone: enr.student.phone,
        rollNumber: enr.rollNumber,
        classDays: enr.classDays?.length ? enr.classDays : enr.student.classDays,
        classTime:
          enr.classTime ||
          enr.student.classTime ||
          batch.classTime ||
          batch.schedule ||
          null,
        attendanceId: rec?.id ?? null,
        status: (rec?.status as AttendanceStatus) ?? AttendanceStatus.PRESENT,
        notes: rec?.notes ?? null,
      };
    });

    return {
      batchId: batch.id,
      batchName: batch.name,
      courseName: batch.course.name,
      date: effectiveDateStr,
      totalEnrolled: students.length,
      markedCount: existingRecords.length,
      students,
    };
  }

  /**
   * Aggregates attendance statistics for a batch across sessions.
   */
  async getBatchAttendanceStats(
    tenantId: string,
    batchId: string,
  ): Promise<BatchAttendanceStats> {
    const records = await this.prisma.attendance.findMany({
      where: { batchId, tenantId },
    });

    // Unique session dates
    const uniqueDates = new Set(records.map((r) => r.date.toISOString().split('T')[0]));
    const totalSessions = uniqueDates.size;
    const totalRecords = records.length;

    let present = 0;
    let absent = 0;
    let late = 0;
    let excused = 0;

    for (const r of records) {
      if (r.status === AttendanceStatus.PRESENT) present++;
      else if (r.status === AttendanceStatus.ABSENT) absent++;
      else if (r.status === AttendanceStatus.LATE) late++;
      else if (r.status === AttendanceStatus.EXCUSED) excused++;
    }

    const averageRate =
      totalRecords > 0
        ? Math.round(((present + late) / totalRecords) * 100)
        : 100;

    return {
      totalSessions,
      totalRecords,
      averageRate,
      breakdown: { present, absent, late, excused },
    };
  }

  /**
   * Retrieves individual student attendance history and overall percentage.
   */
  async getStudentAttendance(
    tenantId: string,
    studentId: string,
  ): Promise<StudentAttendanceSummary> {
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, tenantId },
    });
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const rawRecords = await this.prisma.attendance.findMany({
      where: { studentId, tenantId },
      include: {
        batch: { select: { id: true, name: true } },
        markedBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { date: 'desc' },
    });

    let present = 0;
    let absent = 0;
    let late = 0;
    let excused = 0;

    for (const r of rawRecords) {
      if (r.status === AttendanceStatus.PRESENT) present++;
      else if (r.status === AttendanceStatus.ABSENT) absent++;
      else if (r.status === AttendanceStatus.LATE) late++;
      else if (r.status === AttendanceStatus.EXCUSED) excused++;
    }

    const totalSessions = rawRecords.length;
    const attendanceRate =
      totalSessions > 0
        ? Math.round(((present + late) / totalSessions) * 100)
        : 100;

    const records = rawRecords.map((r) => ({
      id: r.id,
      date: r.date.toISOString().split('T')[0],
      status: r.status as AttendanceStatus,
      notes: r.notes,
      batchId: r.batchId,
      studentId: r.studentId,
      markedById: r.markedById,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      batch: r.batch,
      markedBy: r.markedBy,
    }));

    return {
      totalSessions,
      present,
      absent,
      late,
      excused,
      attendanceRate,
      records,
    };
  }

  /**
   * Updates a single attendance record by ID.
   */
  async updateRecord(
    tenantId: string,
    id: string,
    dto: UpdateAttendanceRecordDto,
  ) {
    const record = await this.prisma.attendance.findFirst({
      where: { id, tenantId },
    });
    if (!record) {
      throw new NotFoundException('Attendance record not found');
    }

    return this.prisma.attendance.update({
      where: { id },
      data: {
        status: dto.status ?? record.status,
        notes: dto.notes !== undefined ? dto.notes : record.notes,
      },
    });
  }

  /**
   * Paginated list of attendance logs.
   */
  async findAll(tenantId: string, query: AttendanceQueryDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };

    if (query.batchId) where.batchId = query.batchId;
    if (query.studentId) where.studentId = query.studentId;
    if (query.date) where.date = this.parseDateToUtc(query.date);

    if (query.startDate || query.endDate) {
      where.date = {};
      if (query.startDate) where.date.gte = this.parseDateToUtc(query.startDate);
      if (query.endDate) where.date.lte = this.parseDateToUtc(query.endDate);
    }

    const [total, records] = await Promise.all([
      this.prisma.attendance.count({ where }),
      this.prisma.attendance.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        include: {
          student: {
            select: {
              id: true,
              studentId: true,
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
          batch: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
    ]);

    return {
      success: true,
      data: records.map((r) => ({
        ...r,
        date: r.date.toISOString().split('T')[0],
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
