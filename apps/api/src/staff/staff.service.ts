import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { CreateStaffDto, Role, UpdateStaffDto } from '@repo/shared';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../common/types/request.types';

export interface FindStaffQuery {
  search?: string;
  role?: Role.STAFF | Role.INSTRUCTOR;
  status?: 'active' | 'inactive' | 'all';
}

@Injectable()
export class StaffService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, query: FindStaffQuery = {}): Promise<any[]> {
    if (!tenantId) {
      throw new BadRequestException('Tenant context is required');
    }

    const where: any = { tenantId };

    if (query.status === 'active') {
      where.isActive = true;
    } else if (query.status === 'inactive') {
      where.isActive = false;
    }

    const userWhere: any = {};
    if (query.role) {
      userWhere.role = query.role;
    }

    if (query.search?.trim()) {
      const term = query.search.trim();
      where.OR = [
        { designation: { contains: term, mode: 'insensitive' } },
        { department: { contains: term, mode: 'insensitive' } },
        { user: { firstName: { contains: term, mode: 'insensitive' } } },
        { user: { lastName: { contains: term, mode: 'insensitive' } } },
        { user: { email: { contains: term, mode: 'insensitive' } } },
        { user: { phone: { contains: term, mode: 'insensitive' } } },
      ];
    }

    if (Object.keys(userWhere).length > 0) {
      where.user = userWhere;
    }

    return this.prisma.staffProfile.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            role: true,
            isActive: true,
            createdAt: true,
            _count: {
              select: {
                instructorBatches: true,
              },
            },
          },
        },
        _count: {
          select: {
            payrolls: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findMyProfile(tenantId: string, userId: string): Promise<any> {
    if (!tenantId) {
      throw new BadRequestException('Tenant context is required');
    }

    const staff = await this.prisma.staffProfile.findFirst({
      where: { tenantId, userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            role: true,
            isActive: true,
            instructorBatches: {
              include: {
                course: true,
                _count: { select: { students: true } },
              },
            },
          },
        },
        payrolls: {
          orderBy: [{ year: 'desc' }, { month: 'desc' }],
          take: 12,
        },
      },
    });

    if (!staff) {
      throw new NotFoundException('Staff profile not found for current user');
    }

    return staff;
  }

  async findOne(tenantId: string, id: string, user: AuthUser): Promise<any> {
    if (!tenantId) {
      throw new BadRequestException('Tenant context is required');
    }

    const staff = await this.prisma.staffProfile.findFirst({
      where: { id, tenantId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            role: true,
            isActive: true,
            createdAt: true,
            instructorBatches: {
              include: {
                course: true,
                _count: { select: { students: true } },
              },
            },
          },
        },
        payrolls: {
          orderBy: [{ year: 'desc' }, { month: 'desc' }],
          take: 24,
        },
      },
    });

    if (!staff) {
      throw new NotFoundException('Staff member not found');
    }

    if (user.role === Role.INSTRUCTOR && staff.userId !== user.userId) {
      throw new ForbiddenException('You can only view your own staff profile');
    }

    return staff;
  }

  async getBatches(tenantId: string, id: string, user: AuthUser): Promise<any[]> {
    const staff = await this.findOne(tenantId, id, user);
    return this.prisma.batch.findMany({
      where: {
        tenantId,
        instructorId: staff.userId,
      },
      include: {
        course: true,
        _count: { select: { students: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(tenantId: string, dto: CreateStaffDto): Promise<any> {
    if (!tenantId) {
      throw new BadRequestException('Tenant context is required');
    }

    const existing = await this.prisma.user.findFirst({
      where: { email: dto.email, tenantId },
    });
    if (existing) {
      throw new ConflictException('A user with this email already exists in this institute');
    }

    const rawPassword = dto.password || 'Staff@1234';
    const passwordHash = await bcrypt.hash(rawPassword, 10);

    return this.prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email: dto.email,
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone ?? null,
          role: dto.role,
          isActive: true,
          tenantId,
        },
      });

      return tx.staffProfile.create({
        data: {
          userId: createdUser.id,
          tenantId,
          designation: dto.designation,
          department: dto.department ?? null,
          joinDate: dto.joinDate ?? new Date(),
          baseSalary: dto.baseSalary,
          bankInfo: dto.bankInfo ?? null,
          mobileWallet: dto.mobileWallet ?? null,
          isActive: true,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              phone: true,
              role: true,
              isActive: true,
              createdAt: true,
            },
          },
        },
      });
    });
  }

  async update(tenantId: string, id: string, dto: UpdateStaffDto): Promise<any> {
    if (!tenantId) {
      throw new BadRequestException('Tenant context is required');
    }

    const existing = await this.prisma.staffProfile.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      throw new NotFoundException('Staff member not found');
    }

    return this.prisma.$transaction(async (tx) => {
      const userData: any = {};
      if (dto.firstName !== undefined) userData.firstName = dto.firstName;
      if (dto.lastName !== undefined) userData.lastName = dto.lastName;
      if (dto.phone !== undefined) userData.phone = dto.phone;
      if (dto.role !== undefined) userData.role = dto.role;
      if (dto.isActive !== undefined) userData.isActive = dto.isActive;

      if (Object.keys(userData).length > 0) {
        await tx.user.update({
          where: { id: existing.userId },
          data: userData,
        });
      }

      const profileData: any = {};
      if (dto.designation !== undefined) profileData.designation = dto.designation;
      if (dto.department !== undefined) profileData.department = dto.department;
      if (dto.joinDate !== undefined) profileData.joinDate = dto.joinDate;
      if (dto.baseSalary !== undefined) profileData.baseSalary = dto.baseSalary;
      if (dto.bankInfo !== undefined) profileData.bankInfo = dto.bankInfo;
      if (dto.mobileWallet !== undefined) profileData.mobileWallet = dto.mobileWallet;
      if (dto.isActive !== undefined) profileData.isActive = dto.isActive;

      return tx.staffProfile.update({
        where: { id },
        data: profileData,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              phone: true,
              role: true,
              isActive: true,
              createdAt: true,
            },
          },
        },
      });
    });
  }

  async deactivate(tenantId: string, id: string): Promise<any> {
    if (!tenantId) {
      throw new BadRequestException('Tenant context is required');
    }

    const existing = await this.prisma.staffProfile.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      throw new NotFoundException('Staff member not found');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: existing.userId },
        data: { isActive: false },
      });

      return tx.staffProfile.update({
        where: { id },
        data: { isActive: false },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              phone: true,
              role: true,
              isActive: true,
            },
          },
        },
      });
    });
  }
}
