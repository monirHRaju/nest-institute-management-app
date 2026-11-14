import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import {
  ApproveAdmissionDto,
  CreateAdmissionDto,
  Role,
} from '@repo/shared';
import { withTenant } from '@repo/db';

@Injectable()
export class AdmissionsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Public endpoint: submit a new admission application for a tenant.
   */
  async createPublicApplication(tenantId: string, dto: CreateAdmissionDto) {
    if (!tenantId) {
      throw new BadRequestException('Tenant context is required');
    }

    const course = await this.prisma.course.findFirst({
      where: { id: dto.courseId, tenantId },
    });

    if (!course) {
      throw new NotFoundException('Selected course not found for this institute');
    }

    const application = await this.prisma.admissionApplication.create({
      data: withTenant(tenantId, {
        name: dto.name.trim(),
        phone: dto.phone.trim(),
        email: dto.email?.trim() ? dto.email.trim().toLowerCase() : null,
        courseId: dto.courseId,
        address: dto.address?.trim() || null,
        guardianName: dto.guardianName?.trim() || null,
        guardianPhone: dto.guardianPhone?.trim() || null,
        message: dto.message?.trim() || null,
      }),
      include: {
        course: true,
      },
    });

    return {
      success: true,
      message: 'Admission application submitted successfully',
      data: application,
    };
  }

  /**
   * Admin endpoint: list all admission applications for the tenant.
   */
  async findAll(tenantId: string, status?: string) {
    if (!tenantId) {
      throw new BadRequestException('Tenant context is required');
    }

    const where: Record<string, unknown> = { tenantId };
    if (status && ['PENDING', 'APPROVED', 'REJECTED'].includes(status)) {
      where.status = status;
    }

    return this.prisma.admissionApplication.findMany({
      where,
      include: {
        course: {
          include: {
            batches: {
              orderBy: { createdAt: 'desc' },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Admin endpoint: approve an admission application and convert to User (STUDENT) + Student profile.
   */
  async approve(tenantId: string, id: string, dto: ApproveAdmissionDto) {
    if (!tenantId) {
      throw new BadRequestException('Tenant context is required');
    }

    const application = await this.prisma.admissionApplication.findFirst({
      where: { id, tenantId },
    });

    if (!application) {
      throw new NotFoundException('Admission application not found');
    }

    if (application.status !== 'PENDING') {
      throw new BadRequestException(
        `Application is already ${application.status.toLowerCase()}`,
      );
    }

    if (dto.batchId) {
      const batch = await this.prisma.batch.findFirst({
        where: { id: dto.batchId, tenantId },
      });
      if (!batch) {
        throw new NotFoundException('Selected batch not found');
      }
    }

    // Split full name into firstName and lastName
    const nameParts = application.name.trim().split(/\s+/);
    const firstName = nameParts[0] || application.name;
    const lastName =
      nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'Student';

    // Determine student login email (use provided email or synthesize unique phone-based email)
    const candidateEmail =
      application.email?.trim().toLowerCase() ||
      `${application.phone}@student.local`;

    // Default initial password is the student's phone number (or admin-supplied password)
    const rawPassword = dto.password || application.phone;
    const passwordHash = await bcrypt.hash(rawPassword, 12);

    const result = await this.prisma.$transaction(async (tx) => {
      // Check if a user with this email already exists in the tenant
      let user = await tx.user.findFirst({
        where: { email: candidateEmail, tenantId },
      });

      if (!user) {
        user = await tx.user.create({
          data: {
            email: candidateEmail,
            passwordHash,
            firstName,
            lastName,
            phone: application.phone,
            role: Role.STUDENT,
            tenantId,
          },
        });
      }

      // Check if a Student profile already exists for this user
      const existingStudent = await tx.student.findUnique({
        where: { userId: user.id },
      });

      const student = existingStudent
        ? await tx.student.update({
            where: { id: existingStudent.id },
            data: {
              batchId: dto.batchId || existingStudent.batchId,
              guardianName:
                dto.guardianName ??
                application.guardianName ??
                existingStudent.guardianName,
              guardianPhone:
                dto.guardianPhone ??
                application.guardianPhone ??
                existingStudent.guardianPhone,
              address: application.address ?? existingStudent.address,
            },
            include: { user: true, batch: true },
          })
        : await tx.student.create({
            data: {
              userId: user.id,
              tenantId,
              batchId: dto.batchId || null,
              guardianName: dto.guardianName || application.guardianName || null,
              guardianPhone:
                dto.guardianPhone || application.guardianPhone || null,
              address: application.address || null,
            },
            include: { user: true, batch: true },
          });

      const updatedApplication = await tx.admissionApplication.update({
        where: { id: application.id },
        data: { status: 'APPROVED' },
        include: { course: true },
      });

      return {
        application: updatedApplication,
        student,
      };
    });

    return {
      success: true,
      message: 'Admission approved and student enrolled',
      data: result,
    };
  }

  /**
   * Admin endpoint: reject an admission application.
   */
  async reject(tenantId: string, id: string) {
    if (!tenantId) {
      throw new BadRequestException('Tenant context is required');
    }

    const application = await this.prisma.admissionApplication.findFirst({
      where: { id, tenantId },
    });

    if (!application) {
      throw new NotFoundException('Admission application not found');
    }

    if (application.status !== 'PENDING') {
      throw new BadRequestException(
        `Application is already ${application.status.toLowerCase()}`,
      );
    }

    const updated = await this.prisma.admissionApplication.update({
      where: { id },
      data: { status: 'REJECTED' },
      include: { course: true },
    });

    return {
      success: true,
      message: 'Admission application rejected',
      data: updated,
    };
  }
}
