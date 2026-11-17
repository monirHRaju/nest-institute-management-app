import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import {
  CreateStudentDto,
  Role,
  UpdateStudentDto,
} from '@repo/shared';
import { PrismaService } from '../prisma/prisma.service';
import { FeesService } from '../fees/fees.service';
import type { AuthUser } from '../common/types/request.types';

export interface FindStudentsQuery {
  search?: string;
  batchId?: string;
  courseId?: string;
  status?: 'active' | 'inactive' | 'all';
}

@Injectable()
export class StudentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly feesService: FeesService,
  ) {}

  /**
   * List students for the tenant with search and filter support.
   * INSTRUCTOR only sees students in batches assigned to them.
   */
  async findAll(
    tenantId: string,
    user: AuthUser,
    query: FindStudentsQuery,
  ): Promise<any[]> {
    if (!tenantId) {
      throw new BadRequestException('Tenant context is required');
    }

    const where: any = { tenantId };

    if (user.role === Role.INSTRUCTOR) {
      where.batch = {
        instructorId: user.userId,
        ...(query.courseId ? { courseId: query.courseId } : {}),
      };
    } else if (query.courseId) {
      where.batch = { courseId: query.courseId };
    }

    if (query.batchId) {
      where.batchId = query.batchId;
    }

    if (query.status === 'active') {
      where.user = { isActive: true };
    } else if (query.status === 'inactive') {
      where.user = { isActive: false };
    }

    if (query.search?.trim()) {
      const term = query.search.trim();
      where.OR = [
        { user: { firstName: { contains: term, mode: 'insensitive' } } },
        { user: { lastName: { contains: term, mode: 'insensitive' } } },
        { user: { email: { contains: term, mode: 'insensitive' } } },
        { user: { phone: { contains: term, mode: 'insensitive' } } },
        { guardianName: { contains: term, mode: 'insensitive' } },
        { guardianPhone: { contains: term, mode: 'insensitive' } },
      ];
    }

    return this.prisma.student.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            isActive: true,
            createdAt: true,
          },
        },
        batch: {
          include: {
            course: true,
          },
        },
        feeAssignments: {
          include: {
            structure: true,
            discount: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        feeInvoices: {
          select: {
            id: true,
            invoiceNo: true,
            amount: true,
            paidAmount: true,
            status: true,
            dueDate: true,
          },
          orderBy: { dueDate: 'asc' },
        },
        _count: {
          select: {
            attendanceRecords: true,
            feeInvoices: true,
          },
        },
      },
      orderBy: { enrollmentDate: 'desc' },
    });
  }

  /**
   * Get single student profile with attendance summary.
   */
  async findOne(tenantId: string, id: string, user: AuthUser) {
    if (!tenantId) {
      throw new BadRequestException('Tenant context is required');
    }

    const student = await this.prisma.student.findFirst({
      where: { id, tenantId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            isActive: true,
            createdAt: true,
          },
        },
        batch: {
          include: {
            course: true,
            instructor: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        attendanceRecords: {
          orderBy: { date: 'desc' },
          take: 30,
        },
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

    return student;
  }

  /**
   * Get logged-in student's own profile.
   */
  async findMyProfile(tenantId: string, userId: string) {
    if (!tenantId) {
      throw new BadRequestException('Tenant context is required');
    }

    const student = await this.prisma.student.findFirst({
      where: { userId, tenantId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            isActive: true,
          },
        },
        batch: {
          include: {
            course: true,
          },
        },
      },
    });

    if (!student) {
      throw new NotFoundException('Student profile not found');
    }

    return student;
  }

  /**
   * Directly enroll a new student (Admin / Staff).
   */
  async create(tenantId: string, dto: CreateStudentDto) {
    if (!tenantId) {
      throw new BadRequestException('Tenant context is required');
    }

    if (dto.batchId) {
      const batch = await this.prisma.batch.findFirst({
        where: { id: dto.batchId, tenantId },
      });
      if (!batch) {
        throw new NotFoundException('Selected batch not found');
      }
    }

    const email =
      dto.email?.trim().toLowerCase() || `${dto.phone.trim()}@student.local`;

    const existingUser = await this.prisma.user.findFirst({
      where: { email, tenantId },
    });

    if (existingUser) {
      throw new BadRequestException(
        'A user with this email or phone already exists in this institute',
      );
    }

    const rawPassword = dto.password || dto.phone.trim();
    const passwordHash = await bcrypt.hash(rawPassword, 12);

    return this.prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email,
          passwordHash,
          firstName: dto.firstName.trim(),
          lastName: dto.lastName.trim(),
          phone: dto.phone.trim(),
          role: Role.STUDENT,
          tenantId,
        },
      });

      const createdStudent = await tx.student.create({
        data: {
          userId: createdUser.id,
          tenantId,
          batchId: dto.batchId || null,
          guardianName: dto.guardianName?.trim() || null,
          guardianPhone: dto.guardianPhone?.trim() || null,
          address: dto.address?.trim() || null,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              phone: true,
              isActive: true,
            },
          },
          batch: {
            include: { course: true },
          },
        },
      });

      // Auto-assign fee structure if specified or if an active structure exists for the batch's course
      let targetStructureId = dto.structureId;
      if (!targetStructureId && createdStudent.batch?.courseId) {
        const defaultStructure = await tx.feeStructure.findFirst({
          where: {
            tenantId,
            courseId: createdStudent.batch.courseId,
            isActive: true,
          },
          orderBy: { createdAt: 'asc' },
        });
        if (defaultStructure) {
          targetStructureId = defaultStructure.id;
        }
      }

      if (targetStructureId) {
        await this.feesService.assignFeeInTransaction(
          tx,
          tenantId,
          createdStudent.id,
          undefined,
          {
            structureId: targetStructureId,
            overrideTotal: dto.overrideTotal,
            discountId: dto.discountId,
            generateInvoices: true,
          },
        );
      }

      return createdStudent;
    });
  }

  /**
   * Update student profile & linked user details.
   */
  async update(tenantId: string, id: string, dto: UpdateStudentDto) {
    const existing = await this.prisma.student.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new NotFoundException('Student not found');
    }

    if (dto.batchId) {
      const batch = await this.prisma.batch.findFirst({
        where: { id: dto.batchId, tenantId },
      });
      if (!batch) {
        throw new NotFoundException('Selected batch not found');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      if (
        dto.firstName !== undefined ||
        dto.lastName !== undefined ||
        dto.phone !== undefined ||
        dto.isActive !== undefined
      ) {
        await tx.user.update({
          where: { id: existing.userId },
          data: {
            ...(dto.firstName !== undefined ? { firstName: dto.firstName } : {}),
            ...(dto.lastName !== undefined ? { lastName: dto.lastName } : {}),
            ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
            ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
          },
        });
      }

      return tx.student.update({
        where: { id },
        data: {
          ...(dto.batchId !== undefined ? { batchId: dto.batchId || null } : {}),
          ...(dto.guardianName !== undefined
            ? { guardianName: dto.guardianName }
            : {}),
          ...(dto.guardianPhone !== undefined
            ? { guardianPhone: dto.guardianPhone }
            : {}),
          ...(dto.address !== undefined ? { address: dto.address } : {}),
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              phone: true,
              isActive: true,
            },
          },
          batch: {
            include: { course: true },
          },
        },
      });
    });
  }
}
