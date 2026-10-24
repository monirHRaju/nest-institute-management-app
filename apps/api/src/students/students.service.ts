import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateStudentDto,
  UpdateStudentDto,
  CreateEnrollmentDto,
  UpdateEnrollmentDto,
  StudentQueryDto,
} from '@repo/shared';
import { withTenant } from '@repo/db';

@Injectable()
export class StudentsService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateStudentDto) {
    const { initialEnrollment, ...studentData } = dto;

    // Generate formatted student registration ID if not specified
    let studentId = studentData.studentId?.trim();
    if (!studentId) {
      const year = new Date().getFullYear();
      const count = await this.prisma.student.count({ where: { tenantId } });
      studentId = `STD-${year}-${String(count + 1).padStart(4, '0')}`;
    } else {
      const existing = await this.prisma.student.findUnique({
        where: {
          studentId_tenantId: {
            studentId,
            tenantId,
          },
        },
      });
      if (existing) {
        throw new ConflictException(`Student ID "${studentId}" is already in use.`);
      }
    }

    if (initialEnrollment?.courseId) {
      // Create student and initial enrollment atomically
      return this.prisma.$transaction(async (tx) => {
        const student = await tx.student.create({
          data: withTenant(tenantId, {
            ...studentData,
            studentId,
            email: studentData.email || null,
            classDays: studentData.classDays || [],
            classTime: studentData.classTime || null,
          }),
        });

        await tx.enrollment.create({
          data: withTenant(tenantId, {
            studentId: student.id,
            courseId: initialEnrollment.courseId,
            batchId: initialEnrollment.batchId || null,
            rollNumber: initialEnrollment.rollNumber || null,
            classDays: initialEnrollment.classDays || [],
            classTime: initialEnrollment.classTime || null,
          }),
        });

        return tx.student.findUnique({
          where: { id: student.id },
          include: {
            enrollments: {
              include: {
                course: true,
                batch: true,
              },
            },
          },
        });
      });
    }

    return this.prisma.student.create({
      data: withTenant(tenantId, {
        ...studentData,
        studentId,
        email: studentData.email || null,
        classDays: studentData.classDays || [],
        classTime: studentData.classTime || null,
      }),
      include: {
        enrollments: {
          include: {
            course: true,
            batch: true,
          },
        },
      },
    });
  }

  async findAll(tenantId: string, query: StudentQueryDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };

    if (query.status) {
      where.status = query.status;
    }

    if (query.search?.trim()) {
      const term = query.search.trim();
      where.OR = [
        { firstName: { contains: term, mode: 'insensitive' } },
        { lastName: { contains: term, mode: 'insensitive' } },
        { studentId: { contains: term, mode: 'insensitive' } },
        { phone: { contains: term, mode: 'insensitive' } },
        { email: { contains: term, mode: 'insensitive' } },
      ];
    }

    if (query.courseId) {
      where.enrollments = {
        some: {
          courseId: query.courseId,
        },
      };
    }

    if (query.batchId) {
      where.enrollments = {
        some: {
          batchId: query.batchId,
        },
      };
    }

    if (query.classDay) {
      where.classDays = {
        has: query.classDay,
      };
    }

    if (query.classTime?.trim()) {
      where.classTime = {
        contains: query.classTime.trim(),
        mode: 'insensitive',
      };
    }

    const [total, students] = await Promise.all([
      this.prisma.student.count({ where }),
      this.prisma.student.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          enrollments: {
            include: {
              course: true,
              batch: true,
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      }),
    ]);

    return {
      success: true,
      data: students,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(tenantId: string, id: string) {
    const student = await this.prisma.student.findFirst({
      where: { id, tenantId },
      include: {
        enrollments: {
          include: {
            course: true,
            batch: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return student;
  }

  async update(tenantId: string, id: string, dto: UpdateStudentDto) {
    await this.findOne(tenantId, id);

    return this.prisma.student.update({
      where: { id, tenantId },
      data: {
        ...dto,
        email: dto.email === '' ? null : dto.email,
      },
      include: {
        enrollments: {
          include: {
            course: true,
            batch: true,
          },
        },
      },
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.student.delete({
      where: { id, tenantId },
    });
  }

  async addEnrollment(
    tenantId: string,
    studentId: string,
    dto: CreateEnrollmentDto,
  ) {
    await this.findOne(tenantId, studentId);

    // Validate course belongs to tenant
    const course = await this.prisma.course.findFirst({
      where: { id: dto.courseId, tenantId },
    });
    if (!course) {
      throw new NotFoundException('Selected course not found');
    }

    // Validate batch if provided
    if (dto.batchId) {
      const batch = await this.prisma.batch.findFirst({
        where: { id: dto.batchId, tenantId, courseId: dto.courseId },
      });
      if (!batch) {
        throw new NotFoundException('Selected batch not found for this course');
      }
    }

    return this.prisma.enrollment.create({
      data: withTenant(tenantId, {
        studentId,
        courseId: dto.courseId,
        batchId: dto.batchId || null,
        rollNumber: dto.rollNumber || null,
        notes: dto.notes || null,
        status: dto.status,
        classDays: dto.classDays || [],
        classTime: dto.classTime || null,
      }),
      include: {
        course: true,
        batch: true,
      },
    });
  }

  async updateEnrollment(
    tenantId: string,
    studentId: string,
    enrollmentId: string,
    dto: UpdateEnrollmentDto,
  ) {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { id: enrollmentId, studentId, tenantId },
    });
    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }

    if (dto.batchId) {
      const batch = await this.prisma.batch.findFirst({
        where: { id: dto.batchId, tenantId, courseId: enrollment.courseId },
      });
      if (!batch) {
        throw new NotFoundException('Selected batch does not belong to this course');
      }
    }

    return this.prisma.enrollment.update({
      where: { id: enrollmentId, tenantId },
      data: {
        batchId: dto.batchId !== undefined ? dto.batchId : enrollment.batchId,
        status: dto.status ?? enrollment.status,
        rollNumber: dto.rollNumber !== undefined ? dto.rollNumber : enrollment.rollNumber,
        notes: dto.notes !== undefined ? dto.notes : enrollment.notes,
        classDays: dto.classDays !== undefined ? dto.classDays : enrollment.classDays,
        classTime: dto.classTime !== undefined ? dto.classTime : enrollment.classTime,
      },
      include: {
        course: true,
        batch: true,
      },
    });
  }

  async removeEnrollment(
    tenantId: string,
    studentId: string,
    enrollmentId: string,
  ) {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { id: enrollmentId, studentId, tenantId },
    });
    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }

    return this.prisma.enrollment.delete({
      where: { id: enrollmentId, tenantId },
    });
  }
}
