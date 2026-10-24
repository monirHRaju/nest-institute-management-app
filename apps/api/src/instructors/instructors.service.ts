import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateInstructorDto,
  UpdateInstructorDto,
  InstructorQueryDto,
  Role,
} from '@repo/shared';
import { withTenant } from '@repo/db';

@Injectable()
export class InstructorsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Register a new faculty / instructor user.
   */
  async create(tenantId: string, dto: CreateInstructorDto) {
    const existing = await this.prisma.user.findFirst({
      where: { email: dto.email, tenantId },
    });
    if (existing) {
      throw new ConflictException(`A user with email "${dto.email}" already exists.`);
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: withTenant(tenantId, {
        email: dto.email.trim().toLowerCase(),
        passwordHash,
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        phone: dto.phone?.trim() || null,
        role: Role.INSTRUCTOR,
        isActive: true,
        designation: dto.designation?.trim() || null,
        specialization: dto.specialization || [],
        qualification: dto.qualification?.trim() || null,
        joiningDate: dto.joiningDate ? new Date(dto.joiningDate) : null,
        bio: dto.bio?.trim() || null,
      }),
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isActive: true,
        designation: true,
        specialization: true,
        qualification: true,
        joiningDate: true,
        bio: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  }

  /**
   * List all instructors for the tenant.
   */
  async findAll(tenantId: string, query: InstructorQueryDto) {
    const { page = 1, limit = 50, search, isActive } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      tenantId,
      role: Role.INSTRUCTOR,
    };

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (search && search.trim()) {
      const term = search.trim();
      where.OR = [
        { firstName: { contains: term, mode: 'insensitive' } },
        { lastName: { contains: term, mode: 'insensitive' } },
        { email: { contains: term, mode: 'insensitive' } },
        { phone: { contains: term } },
        { designation: { contains: term, mode: 'insensitive' } },
        { specialization: { has: term } },
      ];
    }

    const [total, data] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          isActive: true,
          designation: true,
          specialization: true,
          qualification: true,
          joiningDate: true,
          bio: true,
          createdAt: true,
          updatedAt: true,
          instructorBatches: {
            select: {
              id: true,
              name: true,
              schedule: true,
              classDays: true,
              classTime: true,
              capacity: true,
              course: {
                select: {
                  id: true,
                  name: true,
                },
              },
              _count: {
                select: { enrollments: true },
              },
            },
          },
          _count: {
            select: { instructorBatches: true },
          },
        },
      }),
    ]);

    return {
      success: true,
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Get single instructor details.
   */
  async findOne(tenantId: string, id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId, role: Role.INSTRUCTOR },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isActive: true,
        designation: true,
        specialization: true,
        qualification: true,
        joiningDate: true,
        bio: true,
        createdAt: true,
        updatedAt: true,
        instructorBatches: {
          include: {
            course: true,
            _count: {
              select: { enrollments: true },
            },
          },
        },
        _count: {
          select: { instructorBatches: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`Instructor with ID "${id}" not found.`);
    }

    return user;
  }

  /**
   * Update instructor details or status.
   */
  async update(tenantId: string, id: string, dto: UpdateInstructorDto) {
    const user = await this.findOne(tenantId, id);

    const updateData: any = {
      firstName: dto.firstName?.trim() ?? user.firstName,
      lastName: dto.lastName?.trim() ?? user.lastName,
      phone: dto.phone !== undefined ? dto.phone?.trim() || null : user.phone,
      designation: dto.designation !== undefined ? dto.designation?.trim() || null : user.designation,
      specialization: dto.specialization !== undefined ? dto.specialization : user.specialization,
      qualification: dto.qualification !== undefined ? dto.qualification?.trim() || null : user.qualification,
      joiningDate: dto.joiningDate !== undefined ? (dto.joiningDate ? new Date(dto.joiningDate) : null) : user.joiningDate,
      bio: dto.bio !== undefined ? dto.bio?.trim() || null : user.bio,
      isActive: dto.isActive !== undefined ? dto.isActive : user.isActive,
    };

    if (dto.password && dto.password.length >= 6) {
      updateData.passwordHash = await bcrypt.hash(dto.password, 10);
    }

    return this.prisma.user.update({
      where: { id: user.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isActive: true,
        designation: true,
        specialization: true,
        qualification: true,
        joiningDate: true,
        bio: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Get weekly timetable matrix for all batches in the tenant.
   */
  async getWeeklyTimetable(tenantId: string) {
    const batches = await this.prisma.batch.findMany({
      where: { tenantId },
      include: {
        course: { select: { id: true, name: true } },
        instructor: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { enrollments: true } },
      },
      orderBy: { name: 'asc' },
    });

    return batches.map((b) => ({
      batchId: b.id,
      batchName: b.name,
      courseId: b.courseId,
      courseName: b.course.name,
      instructorId: b.instructorId,
      instructorName: b.instructor ? `${b.instructor.firstName} ${b.instructor.lastName}` : null,
      classDays: b.classDays,
      classTime: b.classTime,
      studentCount: b._count.enrollments,
      capacity: b.capacity,
    }));
  }
}
