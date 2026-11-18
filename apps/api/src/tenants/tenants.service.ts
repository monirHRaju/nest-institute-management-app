import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { Role, TenantStatus } from '@repo/db';
import type {
  ApiResponse,
  PaginatedResponse,
  CreateTenantDto,
  UpdateTenantDto,
  UpdateTenantBrandingDto,
  PaginationDto,
} from '@repo/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Platform Stats (SUPER_ADMIN) ─────────────────────────────────────────────
  async getPlatformStats(): Promise<any> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      tenants,
      totalStudents,
      totalStaff,
      totalCourses,
      smsSent30d,
      paymentsAgg,
    ] = await Promise.all([
      this.prisma.tenant.findMany({
        select: { id: true, status: true, plan: true, createdAt: true },
      }),
      this.prisma.student.count(),
      this.prisma.staffProfile.count(),
      this.prisma.course.count(),
      this.prisma.smsLog.count({
        where: { status: 'SENT', sentAt: { gte: thirtyDaysAgo } },
      }),
      this.prisma.payment.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { amount: true },
      }),
    ]);

    const byStatus = {
      ACTIVE: tenants.filter((t) => t.status === 'ACTIVE').length,
      TRIAL: tenants.filter((t) => t.status === 'TRIAL').length,
      SUSPENDED: tenants.filter((t) => t.status === 'SUSPENDED').length,
    };

    const byPlan = {
      FREE: tenants.filter((t) => t.plan === 'FREE').length,
      BASIC: tenants.filter((t) => t.plan === 'BASIC').length,
      PRO: tenants.filter((t) => t.plan === 'PRO').length,
    };

    return {
      totalTenants: tenants.length,
      byStatus,
      byPlan,
      totalStudents,
      totalStaff,
      totalCourses,
      smsSent30d,
      totalPlatformRevenue: Number(paymentsAgg._sum.amount || 0),
    };
  }

  // ── Tenant Branding (TENANT_ADMIN) ───────────────────────────────────────────
  async getMyBranding(tenantId: string): Promise<any> {
    if (!tenantId) {
      throw new BadRequestException('Tenant context is required');
    }
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        plan: true,
        themeConfig: true,
      },
    });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }
    return tenant;
  }

  async updateMyBranding(
    tenantId: string,
    dto: UpdateTenantBrandingDto,
  ): Promise<any> {
    if (!tenantId) {
      throw new BadRequestException('Tenant context is required');
    }
    const existing = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!existing) {
      throw new NotFoundException('Tenant not found');
    }

    const currentTheme = (existing.themeConfig as Record<string, unknown>) || {};
    const { name, ...themeFields } = dto;
    const nextTheme = {
      ...currentTheme,
      ...themeFields,
    };

    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        ...(name?.trim() ? { name: name.trim() } : {}),
        themeConfig: nextTheme,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        plan: true,
        themeConfig: true,
      },
    });
  }

  // ── Create tenant + first TENANT_ADMIN user ─────────────────────────────────
  async create(dto: CreateTenantDto): Promise<ApiResponse<{ tenantId: string; userId: string }>> {
    const existing = await this.prisma.tenant.findUnique({
      where: { slug: dto.slug },
    });
    if (existing) {
      throw new ConflictException(`Slug "${dto.slug}" is already taken`);
    }

    const passwordHash = await bcrypt.hash(dto.ownerPassword, 12);

    const result = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: dto.name,
          slug: dto.slug,
          status: TenantStatus.TRIAL,
          themeConfig: {
            primaryColor: '#2563eb',
            accentColor: '#f59e0b',
            showCourses: true,
            showAdmission: true,
            showResults: true,
          },
        },
      });

      const emailExists = await tx.user.findFirst({
        where: { email: dto.ownerEmail, tenantId: tenant.id },
      });
      if (emailExists) {
        throw new BadRequestException(`Email "${dto.ownerEmail}" already in use`);
      }

      const owner = await tx.user.create({
        data: {
          email: dto.ownerEmail,
          passwordHash,
          firstName: dto.ownerFirstName,
          lastName: dto.ownerLastName,
          role: Role.TENANT_ADMIN,
          tenantId: tenant.id,
        },
      });

      return { tenantId: tenant.id, userId: owner.id };
    });

    return {
      success: true,
      data: result,
      message: `Tenant "${dto.name}" created successfully`,
    };
  }

  // ── List all tenants (paginated) ─────────────────────────────────────────────
  async findAll(
    pagination: PaginationDto,
    filters: { status?: TenantStatus; plan?: string; search?: string },
  ): Promise<PaginatedResponse<TenantListItem>> {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const where: any = {
      ...(filters.status && { status: filters.status }),
      ...(filters.plan && { plan: filters.plan as never }),
    };

    if (filters.search?.trim()) {
      const term = filters.search.trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { slug: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [tenants, total] = await Promise.all([
      this.prisma.tenant.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              users: true,
              students: true,
              courses: true,
              batches: true,
            },
          },
        },
      }),
      this.prisma.tenant.count({ where }),
    ]);

    return {
      success: true,
      data: tenants.map((t) => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        status: t.status,
        plan: t.plan,
        userCount: t._count.users,
        studentCount: t._count.students,
        courseCount: t._count.courses,
        batchCount: t._count.batches,
        createdAt: t.createdAt.toISOString(),
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ── Get single tenant ────────────────────────────────────────────────────────
  async findOne(id: string): Promise<ApiResponse<TenantDetail>> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
            students: true,
            courses: true,
            batches: true,
          },
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant "${id}" not found`);
    }

    return {
      success: true,
      data: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        status: tenant.status,
        plan: tenant.plan,
        themeConfig: tenant.themeConfig as Record<string, unknown>,
        userCount: tenant._count.users,
        studentCount: tenant._count.students,
        courseCount: tenant._count.courses,
        batchCount: tenant._count.batches,
        createdAt: tenant.createdAt.toISOString(),
        updatedAt: tenant.updatedAt.toISOString(),
      },
    };
  }

  // ── Update tenant ────────────────────────────────────────────────────────────
  async update(id: string, dto: UpdateTenantDto): Promise<ApiResponse<TenantDetail>> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundException(`Tenant "${id}" not found`);

    const updated = await this.prisma.tenant.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.status && { status: dto.status }),
        ...(dto.plan && { plan: dto.plan }),
      },
      include: {
        _count: {
          select: { users: true, students: true, courses: true, batches: true },
        },
      },
    });

    return {
      success: true,
      data: {
        id: updated.id,
        name: updated.name,
        slug: updated.slug,
        status: updated.status,
        plan: updated.plan,
        themeConfig: updated.themeConfig as Record<string, unknown>,
        userCount: updated._count.users,
        studentCount: updated._count.students,
        courseCount: updated._count.courses,
        batchCount: updated._count.batches,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
      message: 'Tenant updated successfully',
    };
  }

  // ── Soft delete (suspend) ────────────────────────────────────────────────────
  async remove(id: string): Promise<ApiResponse<null>> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundException(`Tenant "${id}" not found`);

    await this.prisma.tenant.update({
      where: { id },
      data: { status: TenantStatus.SUSPENDED },
    });

    return {
      success: true,
      data: null,
      message: `Tenant "${tenant.name}" suspended successfully`,
    };
  }
}

export interface TenantListItem {
  id: string;
  name: string;
  slug: string;
  status: string;
  plan: string;
  userCount: number;
  studentCount?: number;
  courseCount?: number;
  batchCount?: number;
  createdAt: string;
}

export interface TenantDetail extends TenantListItem {
  themeConfig: Record<string, unknown>;
  updatedAt: string;
}
