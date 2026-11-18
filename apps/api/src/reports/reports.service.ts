import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export function escapeCsvCell(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function toCsvWithBom(
  headers: string[],
  rows: Array<Array<string | number | null | undefined>>,
): string {
  const headerLine = headers.map(escapeCsvCell).join(',');
  const dataLines = rows.map((row) => row.map(escapeCsvCell).join(','));
  return `\uFEFF${[headerLine, ...dataLines].join('\r\n')}`;
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  // ── 1. Academic Report ─────────────────────────────────────────────────────
  async getAcademicReport(tenantId: string, batchId?: string) {
    if (!tenantId) throw new BadRequestException('Tenant context is required');

    const exams = await this.prisma.exam.findMany({
      where: {
        tenantId,
        ...(batchId ? { batchId } : {}),
      },
      include: {
        batch: { select: { id: true, name: true } },
        course: { select: { id: true, name: true } },
        results: {
          include: {
            student: {
              include: {
                user: { select: { firstName: true, lastName: true } },
              },
            },
          },
        },
      },
      orderBy: { date: 'desc' },
    });

    const gradeDistribution: Record<string, number> = {};
    const examSummaries = exams.map((ex) => {
      const totalMarks = Number(ex.totalMarks);
      const passMarks = Number(ex.passMarks);
      const graded = ex.results.length;
      const present = ex.results.filter((r) => !r.isAbsent);
      const passed = present.filter((r) => Number(r.marksObtained) >= passMarks);
      const sumMarks = present.reduce((s, r) => s + Number(r.marksObtained), 0);
      const avgMarks =
        present.length > 0 ? Number((sumMarks / present.length).toFixed(2)) : 0;
      const passRate =
        graded > 0 ? Number(((passed.length / graded) * 100).toFixed(1)) : 0;

      for (const r of ex.results) {
        const g = r.grade || (r.isAbsent ? 'ABS' : 'UNGRADED');
        gradeDistribution[g] = (gradeDistribution[g] || 0) + 1;
      }

      return {
        examId: ex.id,
        examName: ex.name,
        type: ex.type,
        status: ex.status,
        date: ex.date,
        batchName: ex.batch.name,
        courseName: ex.course.name,
        totalMarks,
        passMarks,
        gradedCount: graded,
        passCount: passed.length,
        failCount: graded - passed.length,
        passRate,
        avgMarks,
      };
    });

    const csv = toCsvWithBom(
      [
        'Exam',
        'Type',
        'Batch',
        'Course',
        'Date',
        'Graded',
        'Passed',
        'Failed',
        'Pass Rate (%)',
        'Average Marks',
      ],
      examSummaries.map((e) => [
        e.examName,
        e.type,
        e.batchName,
        e.courseName,
        new Date(e.date).toISOString().slice(0, 10),
        e.gradedCount,
        e.passCount,
        e.failCount,
        e.passRate,
        e.avgMarks,
      ]),
    );

    return {
      examCount: exams.length,
      examSummaries,
      gradeDistribution,
      csv,
    };
  }

  // ── 2. Attendance Report ───────────────────────────────────────────────────
  async getAttendanceReport(
    tenantId: string,
    batchId?: string,
    threshold = 75,
  ) {
    if (!tenantId) throw new BadRequestException('Tenant context is required');

    const students = await this.prisma.student.findMany({
      where: {
        tenantId,
        ...(batchId ? { batchId } : {}),
      },
      include: {
        user: { select: { firstName: true, lastName: true, phone: true } },
        batch: { select: { id: true, name: true } },
        attendanceRecords: {
          select: { status: true },
        },
      },
    });

    const rows = students.map((s) => {
      const total = s.attendanceRecords.length;
      const present = s.attendanceRecords.filter(
        (a) => a.status === 'PRESENT' || a.status === 'LATE',
      ).length;
      const absent = s.attendanceRecords.filter(
        (a) => a.status === 'ABSENT',
      ).length;
      const rate =
        total > 0 ? Number(((present / total) * 100).toFixed(1)) : 0;

      return {
        studentId: s.id,
        studentCode: s.studentCode || s.id.slice(-6).toUpperCase(),
        studentName: `${s.user.firstName} ${s.user.lastName}`,
        phone: s.user.phone || s.guardianPhone || '',
        batchName: s.batch?.name || 'Unassigned',
        totalClasses: total,
        presentClasses: present,
        absentClasses: absent,
        attendanceRate: rate,
        isLowAttendance: total > 0 && rate < threshold,
      };
    });

    const lowAttendance = rows.filter((r) => r.isLowAttendance);

    const csv = toCsvWithBom(
      [
        'Student Code',
        'Student Name',
        'Phone',
        'Batch',
        'Total Classes',
        'Present',
        'Absent',
        'Attendance (%)',
      ],
      rows.map((r) => [
        r.studentCode,
        r.studentName,
        r.phone,
        r.batchName,
        r.totalClasses,
        r.presentClasses,
        r.absentClasses,
        r.attendanceRate,
      ]),
    );

    return {
      totalStudents: rows.length,
      lowAttendanceCount: lowAttendance.length,
      threshold,
      students: rows,
      lowAttendance,
      csv,
    };
  }

  // ── 3. Enrollment & Admissions Funnel Report ───────────────────────────────
  async getEnrollmentReport(tenantId: string) {
    if (!tenantId) throw new BadRequestException('Tenant context is required');

    const [applications, courses] = await Promise.all([
      this.prisma.admissionApplication.findMany({
        where: { tenantId },
        select: { status: true, courseId: true, createdAt: true },
      }),
      this.prisma.course.findMany({
        where: { tenantId },
        include: {
          batches: {
            include: {
              _count: { select: { students: true } },
            },
          },
          _count: { select: { admissionApplications: true } },
        },
      }),
    ]);

    const funnel = {
      totalApplications: applications.length,
      PENDING: applications.filter((a) => a.status === 'PENDING').length,
      APPROVED: applications.filter((a) => a.status === 'APPROVED').length,
      REJECTED: applications.filter((a) => a.status === 'REJECTED').length,
    };

    const byCourse = courses.map((c) => {
      const enrolledStudents = c.batches.reduce(
        (s, b) => s + b._count.students,
        0,
      );
      return {
        courseId: c.id,
        courseName: c.name,
        batchCount: c.batches.length,
        applicationsCount: c._count.admissionApplications,
        enrolledStudents,
      };
    });

    const csv = toCsvWithBom(
      ['Course', 'Batches', 'Applications', 'Enrolled Students'],
      byCourse.map((c) => [
        c.courseName,
        c.batchCount,
        c.applicationsCount,
        c.enrolledStudents,
      ]),
    );

    return {
      funnel,
      byCourse,
      csv,
    };
  }

  // ── 4. Payroll Report ──────────────────────────────────────────────────────
  async getPayrollReport(tenantId: string, year?: number) {
    if (!tenantId) throw new BadRequestException('Tenant context is required');

    const targetYear = year || new Date().getFullYear();
    const payrolls = await this.prisma.payroll.findMany({
      where: { tenantId, year: targetYear },
      include: {
        staff: {
          include: {
            user: { select: { firstName: true, lastName: true, role: true } },
          },
        },
      },
      orderBy: [{ month: 'asc' }],
    });

    let totalPaid = 0;
    let totalApproved = 0;
    let totalDraft = 0;

    const rows = payrolls.map((p) => {
      const net = Number(p.netAmount);
      if (p.status === 'PAID') totalPaid += net;
      else if (p.status === 'APPROVED') totalApproved += net;
      else totalDraft += net;

      return {
        id: p.id,
        period: `${String(p.month).padStart(2, '0')}/${p.year}`,
        staffName: `${p.staff.user.firstName} ${p.staff.user.lastName}`,
        designation: p.staff.designation,
        baseAmount: Number(p.baseAmount),
        allowances: Number(p.allowances),
        bonus: Number(p.bonus),
        deductions: Number(p.deductions),
        netAmount: net,
        status: p.status,
      };
    });

    const csv = toCsvWithBom(
      [
        'Period',
        'Staff Name',
        'Designation',
        'Base',
        'Allowances',
        'Bonus',
        'Deductions',
        'Net Amount',
        'Status',
      ],
      rows.map((r) => [
        r.period,
        r.staffName,
        r.designation,
        r.baseAmount,
        r.allowances,
        r.bonus,
        r.deductions,
        r.netAmount,
        r.status,
      ]),
    );

    return {
      year: targetYear,
      totalPaid: Number(totalPaid.toFixed(2)),
      totalApproved: Number(totalApproved.toFixed(2)),
      totalDraft: Number(totalDraft.toFixed(2)),
      records: rows,
      csv,
    };
  }

  // ── 5. SMS Usage Report ────────────────────────────────────────────────────
  async getSmsReport(tenantId: string) {
    if (!tenantId) throw new BadRequestException('Tenant context is required');

    const logs = await this.prisma.smsLog.findMany({
      where: { tenantId },
      orderBy: { sentAt: 'desc' },
      take: 500,
    });

    const byStatus: Record<string, number> = {
      SENT: 0,
      FAILED: 0,
      SKIPPED: 0,
      QUEUED: 0,
    };
    const byEvent: Record<string, number> = {};
    let totalSegmentsSent = 0;

    for (const l of logs) {
      byStatus[l.status] = (byStatus[l.status] || 0) + 1;
      byEvent[l.eventType] = (byEvent[l.eventType] || 0) + 1;
      if (l.status === 'SENT') {
        totalSegmentsSent += l.segments || 1;
      }
    }

    const csv = toCsvWithBom(
      ['Sent At', 'Phone', 'Event Type', 'Status', 'Segments', 'Provider Code'],
      logs.map((l) => [
        new Date(l.sentAt).toISOString(),
        l.phone,
        l.eventType,
        l.status,
        l.segments,
        l.providerCode || '',
      ]),
    );

    return {
      totalLogs: logs.length,
      totalSegmentsSent,
      byStatus,
      byEvent,
      csv,
    };
  }
}
