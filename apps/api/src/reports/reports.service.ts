import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  ReportFilterDto,
  AttendanceStatus,
  StudentStatus,
  PaymentMethod,
} from '@repo/shared';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Comprehensive attendance performance report.
   */
  async getAttendanceReport(tenantId: string, filter: ReportFilterDto) {
    const { startDate, endDate, courseId, batchId } = filter;

    const whereBatch: any = { tenantId };
    if (batchId) whereBatch.id = batchId;
    if (courseId) whereBatch.courseId = courseId;

    const batches = await this.prisma.batch.findMany({
      where: whereBatch,
      include: {
        course: { select: { id: true, name: true } },
        enrollments: {
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
          },
        },
      },
    });

    const batchIds = batches.map((b) => b.id);

    const whereAttendance: any = {
      tenantId,
      batchId: { in: batchIds },
    };

    if (startDate || endDate) {
      whereAttendance.date = {};
      if (startDate) whereAttendance.date.gte = new Date(startDate);
      if (endDate) whereAttendance.date.lte = new Date(endDate);
    }

    const attendanceRecords = await this.prisma.attendance.findMany({
      where: whereAttendance,
    });

    let totalPresent = 0;
    let totalAbsent = 0;
    let totalLate = 0;
    let totalExcused = 0;

    const batchStatsMap = new Map<string, {
      batchId: string;
      batchName: string;
      courseName: string;
      dates: Set<string>;
      present: number;
      absent: number;
      late: number;
      excused: number;
    }>();

    batches.forEach((b) => {
      batchStatsMap.set(b.id, {
        batchId: b.id,
        batchName: b.name,
        courseName: b.course.name,
        dates: new Set<string>(),
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
      });
    });

    // Student stats map for detecting at-risk students
    const studentStatsMap = new Map<string, {
      studentId: string;
      systemId: string;
      name: string;
      phone: string;
      batchName: string;
      total: number;
      attended: number;
    }>();

    attendanceRecords.forEach((rec) => {
      const bStat = batchStatsMap.get(rec.batchId);
      const dateStr = rec.date.toISOString().split('T')[0];
      if (bStat) {
        bStat.dates.add(dateStr);
        if (rec.status === AttendanceStatus.PRESENT) {
          bStat.present++;
          totalPresent++;
        } else if (rec.status === AttendanceStatus.ABSENT) {
          bStat.absent++;
          totalAbsent++;
        } else if (rec.status === AttendanceStatus.LATE) {
          bStat.late++;
          totalLate++;
        } else if (rec.status === AttendanceStatus.EXCUSED) {
          bStat.excused++;
          totalExcused++;
        }
      }

      // Track individual student
      if (!studentStatsMap.has(rec.studentId)) {
        studentStatsMap.set(rec.studentId, {
          studentId: rec.studentId,
          systemId: '',
          name: '',
          phone: '',
          batchName: bStat?.batchName || '',
          total: 0,
          attended: 0,
        });
      }
      const sStat = studentStatsMap.get(rec.studentId)!;
      sStat.total++;
      if (rec.status === AttendanceStatus.PRESENT || rec.status === AttendanceStatus.LATE) {
        sStat.attended++;
      }
    });

    // Enrich student names from enrollments
    batches.forEach((b) => {
      b.enrollments.forEach((e) => {
        const sStat = studentStatsMap.get(e.studentId);
        if (sStat) {
          sStat.systemId = e.student.studentId;
          sStat.name = `${e.student.firstName} ${e.student.lastName}`;
          sStat.phone = e.student.phone;
          if (!sStat.batchName) sStat.batchName = b.name;
        }
      });
    });

    const totalRecords = totalPresent + totalAbsent + totalLate + totalExcused;
    const overallRate = totalRecords > 0
      ? Math.round(((totalPresent + totalLate) / totalRecords) * 100 * 10) / 10
      : 0;

    const batchStats = Array.from(batchStatsMap.values()).map((b) => {
      const recordsCount = b.present + b.absent + b.late + b.excused;
      const rate = recordsCount > 0
        ? Math.round(((b.present + b.late) / recordsCount) * 100 * 10) / 10
        : 0;
      return {
        batchId: b.batchId,
        batchName: b.batchName,
        courseName: b.courseName,
        totalSessions: b.dates.size,
        averageRate: rate,
        presentCount: b.present,
        absentCount: b.absent,
        lateCount: b.late,
        excusedCount: b.excused,
      };
    });

    // At risk students: rate < 60% with at least 3 sessions
    const atRiskStudents = Array.from(studentStatsMap.values())
      .filter((s) => s.total >= 3 && (s.attended / s.total) < 0.6)
      .map((s) => ({
        studentId: s.studentId,
        systemId: s.systemId,
        name: s.name,
        phone: s.phone,
        batchName: s.batchName,
        rate: Math.round((s.attended / s.total) * 100 * 10) / 10,
        sessions: s.total,
      }))
      .sort((a, b) => a.rate - b.rate);

    // Count unique total sessions
    const totalSessions = batchStats.reduce((sum, b) => sum + b.totalSessions, 0);

    return {
      totalSessions,
      averageRate: overallRate,
      batchStats,
      atRiskStudents,
    };
  }

  /**
   * Consolidated financial collection & revenue statement.
   */
  async getFinancialReport(tenantId: string, filter: ReportFilterDto) {
    const { startDate, endDate, courseId } = filter;

    const whereInvoice: any = { tenantId };
    if (courseId) whereInvoice.courseId = courseId;
    if (startDate || endDate) {
      whereInvoice.createdAt = {};
      if (startDate) whereInvoice.createdAt.gte = new Date(startDate);
      if (endDate) whereInvoice.createdAt.lte = new Date(endDate);
    }

    const wherePayment: any = { tenantId };
    if (startDate || endDate) {
      wherePayment.paymentDate = {};
      if (startDate) wherePayment.paymentDate.gte = new Date(startDate);
      if (endDate) wherePayment.paymentDate.lte = new Date(endDate);
    }

    const [invoices, payments, courses] = await Promise.all([
      this.prisma.feeInvoice.findMany({
        where: whereInvoice,
        include: { course: true },
      }),
      this.prisma.payment.findMany({
        where: wherePayment,
        orderBy: { paymentDate: 'asc' },
      }),
      this.prisma.course.findMany({
        where: { tenantId },
      }),
    ]);

    const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const totalCollected = payments.reduce((sum, pmt) => sum + pmt.amount, 0);
    const totalOutstanding = invoices.reduce((sum, inv) => sum + inv.dueAmount, 0);
    const collectionRate = totalInvoiced > 0
      ? Math.round((totalCollected / totalInvoiced) * 100 * 10) / 10
      : 0;

    // Payment method breakdown
    const methodBreakdown: Record<string, number> = {};
    Object.values(PaymentMethod).forEach((m) => {
      methodBreakdown[m] = 0;
    });
    payments.forEach((p) => {
      methodBreakdown[p.method] = (methodBreakdown[p.method] || 0) + p.amount;
    });

    // Monthly collection trend
    const monthlyMap = new Map<string, { amount: number; count: number }>();
    payments.forEach((p) => {
      const monthStr = p.paymentDate.toISOString().slice(0, 7); // YYYY-MM
      if (!monthlyMap.has(monthStr)) {
        monthlyMap.set(monthStr, { amount: 0, count: 0 });
      }
      const entry = monthlyMap.get(monthStr)!;
      entry.amount += p.amount;
      entry.count++;
    });

    const monthlyCollections = Array.from(monthlyMap.entries()).map(([month, data]) => ({
      month,
      amount: data.amount,
      count: data.count,
    }));

    // Revenue by course
    const courseRevenueMap = new Map<string, {
      courseId: string;
      courseName: string;
      totalBilled: number;
      totalCollected: number;
      totalDue: number;
    }>();

    courses.forEach((c) => {
      courseRevenueMap.set(c.id, {
        courseId: c.id,
        courseName: c.name,
        totalBilled: 0,
        totalCollected: 0,
        totalDue: 0,
      });
    });

    invoices.forEach((inv) => {
      if (inv.courseId && courseRevenueMap.has(inv.courseId)) {
        const cEntry = courseRevenueMap.get(inv.courseId)!;
        cEntry.totalBilled += inv.totalAmount;
        cEntry.totalCollected += inv.paidAmount;
        cEntry.totalDue += inv.dueAmount;
      }
    });

    const courseRevenue = Array.from(courseRevenueMap.values());

    return {
      totalInvoiced,
      totalCollected,
      totalOutstanding,
      collectionRate,
      methodBreakdown,
      monthlyCollections,
      courseRevenue,
    };
  }

  /**
   * Admissions & student intake analytics.
   */
  async getAdmissionsReport(tenantId: string, filter: ReportFilterDto) {
    const { startDate, endDate } = filter;

    const whereStudent: any = { tenantId };
    if (startDate || endDate) {
      whereStudent.createdAt = {};
      if (startDate) whereStudent.createdAt.gte = new Date(startDate);
      if (endDate) whereStudent.createdAt.lte = new Date(endDate);
    }

    const [students, courses, enrollments] = await Promise.all([
      this.prisma.student.findMany({
        where: whereStudent,
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.course.findMany({
        where: { tenantId },
        include: {
          _count: { select: { enrollments: true } },
        },
      }),
      this.prisma.enrollment.findMany({
        where: { tenantId },
      }),
    ]);

    const totalStudents = students.length;
    const activeStudents = students.filter((s) => s.status === StudentStatus.ACTIVE).length;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const newAdmissionsThisMonth = students.filter((s) => s.createdAt >= thirtyDaysAgo).length;

    // Monthly admissions trend
    const monthlyMap = new Map<string, number>();
    students.forEach((s) => {
      const monthStr = s.createdAt.toISOString().slice(0, 7); // YYYY-MM
      monthlyMap.set(monthStr, (monthlyMap.get(monthStr) || 0) + 1);
    });

    const monthlyAdmissions = Array.from(monthlyMap.entries()).map(([month, count]) => ({
      month,
      count,
    }));

    // Course distribution
    const totalEnrollments = enrollments.length;
    const courseDistribution = courses.map((c) => ({
      courseId: c.id,
      courseName: c.name,
      count: c._count.enrollments,
      percentage: totalEnrollments > 0
        ? Math.round((c._count.enrollments / totalEnrollments) * 100 * 10) / 10
        : 0,
    })).sort((a, b) => b.count - a.count);

    return {
      totalStudents,
      activeStudents,
      newAdmissionsThisMonth,
      monthlyAdmissions,
      courseDistribution,
    };
  }
}
