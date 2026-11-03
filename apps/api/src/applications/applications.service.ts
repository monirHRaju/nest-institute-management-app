import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  ApplicationStatus,
  StudentStatus,
  EnrollmentStatus,
  FeeType,
  InvoiceStatus,
} from '@repo/shared';
import type {
  UpdateApplicationStatusDto,
  ApproveAndAdmitDto,
  PaginatedResponse,
  AdmissionApplicationRecord,
} from '@repo/shared';

@Injectable()
export class ApplicationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * List all online admission applications for the tenant.
   */
  async findAll(
    tenantId: string,
    query: {
      page?: number;
      limit?: number;
      status?: ApplicationStatus;
      courseId?: string;
      search?: string;
    },
  ): Promise<PaginatedResponse<AdmissionApplicationRecord>> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = { tenantId };

    if (query.status) {
      where.status = query.status;
    }

    if (query.courseId) {
      where.courseId = query.courseId;
    }

    if (query.search && query.search.trim()) {
      const term = query.search.trim();
      where.OR = [
        { applicationNumber: { contains: term, mode: 'insensitive' } },
        { firstName: { contains: term, mode: 'insensitive' } },
        { lastName: { contains: term, mode: 'insensitive' } },
        { phone: { contains: term } },
        { email: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.admissionApplication.count({ where }),
      this.prisma.admissionApplication.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          course: { select: { id: true, name: true, fees: true } },
          batch: { select: { id: true, name: true, schedule: true, classTime: true, classDays: true } },
        },
      }),
    ]);

    return {
      success: true,
      data: items.map((a) => ({
        id: a.id,
        applicationNumber: a.applicationNumber,
        firstName: a.firstName,
        lastName: a.lastName,
        email: a.email,
        phone: a.phone,
        gender: a.gender,
        dateOfBirth: a.dateOfBirth ? a.dateOfBirth.toISOString().split('T')[0] : null,
        address: a.address,
        guardianName: a.guardianName,
        guardianPhone: a.guardianPhone,
        guardianRelation: a.guardianRelation,
        notes: a.notes,
        adminNotes: a.adminNotes,
        status: a.status as ApplicationStatus,
        courseId: a.courseId,
        course: a.course,
        batchId: a.batchId,
        batch: a.batch,
        studentId: a.studentId,
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single application by ID.
   */
  async findOne(tenantId: string, id: string) {
    const application = await this.prisma.admissionApplication.findFirst({
      where: { id, tenantId },
      include: {
        course: { select: { id: true, name: true, fees: true } },
        batch: { select: { id: true, name: true, schedule: true, classTime: true, classDays: true } },
        student: { select: { id: true, studentId: true, firstName: true, lastName: true } },
      },
    });

    if (!application) {
      throw new NotFoundException(`Application with ID "${id}" not found.`);
    }

    return application;
  }

  /**
   * Update application status (e.g., mark as REJECTED or add admin review notes).
   */
  async updateStatus(tenantId: string, id: string, dto: UpdateApplicationStatusDto) {
    await this.findOne(tenantId, id);

    const updated = await this.prisma.admissionApplication.update({
      where: { id },
      data: {
        status: dto.status as any,
        ...(dto.adminNotes !== undefined ? { adminNotes: dto.adminNotes } : {}),
      },
      include: {
        course: { select: { id: true, name: true } },
        batch: { select: { id: true, name: true } },
      },
    });

    return {
      success: true,
      data: updated,
      message: `Application marked as ${dto.status}`,
    };
  }

  /**
   * 1-Click Approve and Admit: Atomically converts an online application into an enrolled Student.
   */
  async approveAndAdmit(
    tenantId: string,
    id: string,
    dto: ApproveAndAdmitDto,
    _currentUserId?: string,
  ) {
    const application = await this.findOne(tenantId, id);

    if (application.status === ApplicationStatus.APPROVED && application.studentId) {
      throw new BadRequestException('This application has already been approved and converted to a student.');
    }

    const assignedBatchId = dto.batchId || application.batchId;

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Determine student ID
      const year = new Date().getFullYear();
      let studentId = dto.customStudentId?.trim();
      if (!studentId) {
        const count = await tx.student.count({
          where: {
            tenantId,
            createdAt: { gte: new Date(`${year}-01-01T00:00:00.000Z`) },
          },
        });
        studentId = `STD-${year}-${String(count + 1).padStart(4, '0')}`;
      }

      // Check unique
      const existingStudent = await tx.student.findFirst({
        where: { tenantId, studentId },
      });
      if (existingStudent) {
        throw new ConflictException(`Student ID "${studentId}" is already in use.`);
      }

      // 2. Create Student
      const student = await tx.student.create({
        data: {
          studentId,
          firstName: application.firstName,
          lastName: application.lastName,
          email: application.email,
          phone: application.phone,
          gender: application.gender,
          dateOfBirth: application.dateOfBirth,
          address: application.address,
          guardianName: application.guardianName,
          guardianPhone: application.guardianPhone,
          guardianRelation: application.guardianRelation,
          status: StudentStatus.ACTIVE,
          tenantId,
        },
      });

      // 3. Create Enrollment
      const enrollment = await tx.enrollment.create({
        data: {
          studentId: student.id,
          courseId: application.courseId,
          batchId: assignedBatchId || null,
          tenantId,
          status: EnrollmentStatus.ACTIVE,
          notes: `Converted from online application ${application.applicationNumber}`,
        },
      });

      // 4. Optionally create initial admission/tuition invoice
      let invoice = null;
      if (dto.createInvoice !== false) {
        const invCount = await tx.feeInvoice.count({
          where: {
            tenantId,
            createdAt: { gte: new Date(`${year}-01-01T00:00:00.000Z`) },
          },
        });
        const invoiceNumber = `INV-${year}-${String(invCount + 1).padStart(4, '0')}`;
        const amount = dto.invoiceAmount !== undefined ? dto.invoiceAmount : application.course.fees;

        invoice = await tx.feeInvoice.create({
          data: {
            invoiceNumber,
            title: `Course Admission - ${application.course.name}`,
            feeType: FeeType.ADMISSION,
            amount,
            discount: 0,
            totalAmount: amount,
            paidAmount: 0,
            dueAmount: amount,
            status: InvoiceStatus.UNPAID,
            studentId: student.id,
            courseId: application.courseId,
            tenantId,
            notes: `Auto-generated upon online admission approval (${application.applicationNumber})`,
          },
        });
      }

      // 5. Update Application status
      const updatedApp = await tx.admissionApplication.update({
        where: { id: application.id },
        data: {
          status: ApplicationStatus.APPROVED,
          studentId: student.id,
          batchId: assignedBatchId || null,
          adminNotes: dto.adminNotes
            ? `${application.adminNotes ? application.adminNotes + ' | ' : ''}${dto.adminNotes}`
            : application.adminNotes,
        },
      });

      return {
        student,
        enrollment,
        invoice,
        application: updatedApp,
      };
    });

    return {
      success: true,
      data: result,
      message: `Student "${result.student.firstName} ${result.student.lastName}" successfully admitted with ID ${result.student.studentId}`,
    };
  }
}
