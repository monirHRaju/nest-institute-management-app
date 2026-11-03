import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  ApplicationStatus,
} from '@repo/shared';
import type {
  CreatePublicApplicationDto,
  PublicCourseRecord,
  StudentVerificationResult,
} from '@repo/shared';
import type { TenantContext } from '../common/types/request.types';

export interface PublicTenantConfigResponse {
  id: string;
  name: string;
  slug: string;
  status: string;
  plan: string;
  themeConfig: Record<string, any>;
  createdAt: string;
}

@Injectable()
export class PublicService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get public configuration and theme for the tenant.
   */
  async getTenantConfig(tenant: TenantContext): Promise<PublicTenantConfigResponse> {
    const fullTenant = await this.prisma.tenant.findUnique({
      where: { id: tenant.id },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        plan: true,
        themeConfig: true,
        createdAt: true,
      },
    });

    if (!fullTenant) {
      throw new NotFoundException('Institute not found');
    }

    return {
      id: fullTenant.id,
      name: fullTenant.name,
      slug: fullTenant.slug,
      status: fullTenant.status,
      plan: fullTenant.plan,
      themeConfig: (fullTenant.themeConfig as Record<string, any>) || {},
      createdAt: fullTenant.createdAt.toISOString(),
    };
  }

  /**
   * List all public courses for the tenant with active batches and pricing.
   */
  async getCourses(tenantId: string): Promise<PublicCourseRecord[]> {
    const courses = await this.prisma.course.findMany({
      where: { tenantId },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        batches: {
          include: {
            _count: {
              select: { enrollments: true },
            },
          },
          orderBy: { startDate: 'desc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    return courses.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      duration: c.duration,
      fees: c.fees,
      categoryId: c.categoryId,
      category: c.category,
      batchesCount: c.batches.length,
      activeBatches: c.batches.map((b) => ({
        id: b.id,
        name: b.name,
        startDate: b.startDate ? b.startDate.toISOString() : null,
        schedule: b.schedule,
        classDays: b.classDays,
        classTime: b.classTime,
        capacity: b.capacity,
        enrolledCount: b._count.enrollments,
      })),
    }));
  }

  /**
   * Get a single public course with full batch options and syllabus description.
   */
  async getCourseById(tenantId: string, courseId: string) {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, tenantId },
      include: {
        category: { select: { id: true, name: true } },
        batches: {
          include: {
            instructor: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                designation: true,
              },
            },
            _count: {
              select: { enrollments: true },
            },
          },
          orderBy: { startDate: 'asc' },
        },
      },
    });

    if (!course) {
      throw new NotFoundException(`Course not found.`);
    }

    return {
      id: course.id,
      name: course.name,
      description: course.description,
      duration: course.duration,
      fees: course.fees,
      category: course.category,
      batches: course.batches.map((b) => ({
        id: b.id,
        name: b.name,
        startDate: b.startDate ? b.startDate.toISOString() : null,
        endDate: b.endDate ? b.endDate.toISOString() : null,
        schedule: b.schedule,
        classDays: b.classDays,
        classTime: b.classTime,
        capacity: b.capacity,
        enrolledCount: b._count.enrollments,
        instructor: b.instructor
          ? {
              name: `${b.instructor.firstName} ${b.instructor.lastName}`,
              designation: b.instructor.designation,
            }
          : null,
      })),
    };
  }

  /**
   * Submit an online admission application from the public portal.
   */
  async submitApplication(tenantId: string, dto: CreatePublicApplicationDto) {
    // 1. Validate course belongs to tenant
    const course = await this.prisma.course.findFirst({
      where: { id: dto.courseId, tenantId },
    });
    if (!course) {
      throw new BadRequestException('Selected course does not exist in this institute.');
    }

    // 2. Validate batch if provided
    if (dto.batchId) {
      const batch = await this.prisma.batch.findFirst({
        where: { id: dto.batchId, courseId: dto.courseId, tenantId },
      });
      if (!batch) {
        throw new BadRequestException('Selected batch is invalid for this course.');
      }
    }

    // 3. Generate sequential application number: APP-YYYY-XXXX
    const currentYear = new Date().getFullYear();
    const countThisYear = await this.prisma.admissionApplication.count({
      where: {
        tenantId,
        createdAt: {
          gte: new Date(`${currentYear}-01-01T00:00:00.000Z`),
        },
      },
    });

    const sequence = String(countThisYear + 1).padStart(4, '0');
    const applicationNumber = `APP-${currentYear}-${sequence}`;

    // 4. Create application
    const application = await this.prisma.admissionApplication.create({
      data: {
        applicationNumber,
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        email: dto.email?.trim() || null,
        phone: dto.phone.trim(),
        gender: dto.gender || null,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
        address: dto.address?.trim() || null,
        guardianName: dto.guardianName?.trim() || null,
        guardianPhone: dto.guardianPhone?.trim() || null,
        guardianRelation: dto.guardianRelation?.trim() || null,
        notes: dto.notes?.trim() || null,
        courseId: dto.courseId,
        batchId: dto.batchId || null,
        tenantId,
        status: ApplicationStatus.PENDING,
      },
      include: {
        course: { select: { id: true, name: true, fees: true } },
        batch: { select: { id: true, name: true, classTime: true } },
      },
    });

    return {
      success: true,
      data: {
        id: application.id,
        applicationNumber: application.applicationNumber,
        applicantName: `${application.firstName} ${application.lastName}`,
        courseName: application.course.name,
        batchName: application.batch?.name || 'To Be Assigned',
        phone: application.phone,
        status: application.status,
        createdAt: application.createdAt.toISOString(),
      },
      message: 'Application submitted successfully! Please keep your application number for tracking.',
    };
  }

  /**
   * Track an application's review status by tracking number & phone.
   */
  async trackApplication(tenantId: string, applicationNumber: string, phone: string) {
    if (!applicationNumber || !phone) {
      throw new BadRequestException('Application number and phone number are required.');
    }

    const cleanAppNum = applicationNumber.trim().toUpperCase();
    const cleanPhone = phone.trim();

    const application = await this.prisma.admissionApplication.findFirst({
      where: {
        tenantId,
        applicationNumber: cleanAppNum,
        phone: { contains: cleanPhone },
      },
      include: {
        course: { select: { id: true, name: true, fees: true } },
        batch: { select: { id: true, name: true, classTime: true, schedule: true } },
      },
    });

    if (!application) {
      throw new NotFoundException(
        'No matching application found. Please verify your application number and registered phone number.',
      );
    }

    return {
      applicationNumber: application.applicationNumber,
      applicantName: `${application.firstName} ${application.lastName}`,
      status: application.status,
      courseTitle: application.course.name,
      batchName: application.batch?.name || 'Unassigned',
      schedule: application.batch?.classTime || application.batch?.schedule || 'TBD',
      adminNotes: application.adminNotes,
      submittedAt: application.createdAt.toISOString(),
      updatedAt: application.updatedAt.toISOString(),
    };
  }

  /**
   * Verify an enrolled student's credentials publicly by Student ID.
   */
  async verifyStudent(tenantId: string, studentId: string): Promise<StudentVerificationResult> {
    if (!studentId || !studentId.trim()) {
      throw new BadRequestException('Student ID is required for verification.');
    }

    const cleanId = studentId.trim();

    const [student, tenant] = await Promise.all([
      this.prisma.student.findFirst({
        where: {
          tenantId,
          OR: [
            { studentId: { equals: cleanId, mode: 'insensitive' } },
            { id: cleanId },
          ],
        },
        include: {
          enrollments: {
            include: {
              course: { select: { id: true, name: true } },
              batch: { select: { id: true, name: true } },
            },
            orderBy: { enrollmentDate: 'desc' },
          },
        },
      }),
      this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { name: true },
      }),
    ]);

    if (!student || !tenant) {
      throw new NotFoundException('No enrolled student found matching this Student ID.');
    }

    return {
      isVerified: true,
      studentId: student.studentId,
      fullName: `${student.firstName} ${student.lastName}`,
      status: student.status as any,
      instituteName: tenant.name,
      joinedDate: student.createdAt.toISOString(),
      courses: student.enrollments.map((e) => ({
        courseName: e.course.name,
        batchName: e.batch?.name || null,
        status: e.status as any,
        enrollmentDate: e.enrollmentDate.toISOString(),
      })),
      verificationDate: new Date().toISOString(),
    };
  }
}
