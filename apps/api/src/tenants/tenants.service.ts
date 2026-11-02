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
  UpdateTenantSettingsDto,
  PaginationDto,
  TenantSettingsResponse,
  SuperAdminTenantRecord,
} from '@repo/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Create tenant + first TENANT_ADMIN user ─────────────────────────────────
  async create(dto: CreateTenantDto): Promise<ApiResponse<{ tenantId: string; userId: string }>> {
    // Check slug uniqueness
    const existing = await this.prisma.tenant.findUnique({
      where: { slug: dto.slug },
    });
    if (existing) {
      throw new ConflictException(`Slug "${dto.slug}" is already taken`);
    }

    const passwordHash = await bcrypt.hash(dto.ownerPassword, 12);

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Create tenant
      const tenant = await tx.tenant.create({
        data: {
          name: dto.name,
          slug: dto.slug,
          status: TenantStatus.TRIAL,
          themeConfig: {
            primaryColor: '#2563eb',
            accentColor: '#f59e0b',
            currencySymbol: '৳',
            aboutText: 'Empowering students with modern professional skills and career training.',
          },
        },
      });

      // 2. Check email uniqueness within new tenant
      const emailExists = await tx.user.findFirst({
        where: { email: dto.ownerEmail, tenantId: tenant.id },
      });
      if (emailExists) {
        throw new BadRequestException(`Email "${dto.ownerEmail}" already in use`);
      }

      // 3. Create TENANT_ADMIN owner
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

  // ── List all tenants for Super Admin (paginated + search) ─────────────────────
  async findAll(
    pagination: PaginationDto,
    filters: { status?: TenantStatus; plan?: string; search?: string },
  ): Promise<PaginatedResponse<SuperAdminTenantRecord>> {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const where: any = {
      ...(filters.status && { status: filters.status }),
      ...(filters.plan && { plan: filters.plan as never }),
    };

    if (filters.search && filters.search.trim()) {
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
          users: {
            where: { role: Role.TENANT_ADMIN },
            take: 1,
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              phone: true,
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
        status: t.status as any,
        plan: t.plan as any,
        themeConfig: t.themeConfig as any,
        owner: t.users[0] || null,
        _count: {
          users: t._count.users,
          students: t._count.students,
          courses: t._count.courses,
          batches: t._count.batches,
        },
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
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
  async findOne(id: string): Promise<ApiResponse<SuperAdminTenantRecord>> {
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
        users: {
          where: { role: Role.TENANT_ADMIN },
          take: 1,
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
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
        status: tenant.status as any,
        plan: tenant.plan as any,
        themeConfig: tenant.themeConfig as any,
        owner: tenant.users[0] || null,
        _count: {
          users: tenant._count.users,
          students: tenant._count.students,
          courses: tenant._count.courses,
          batches: tenant._count.batches,
        },
        createdAt: tenant.createdAt.toISOString(),
        updatedAt: tenant.updatedAt.toISOString(),
      },
    };
  }

  // ── Get settings for the current tenant ───────────────────────────────────────
  async getSettings(tenantId: string): Promise<ApiResponse<TenantSettingsResponse>> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant not found`);
    }

    return {
      success: true,
      data: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        status: tenant.status as any,
        plan: tenant.plan as any,
        themeConfig: (tenant.themeConfig as any) || {
          primaryColor: '#2563eb',
          accentColor: '#f59e0b',
        },
        createdAt: tenant.createdAt.toISOString(),
        updatedAt: tenant.updatedAt.toISOString(),
      },
    };
  }

  // ── Update settings for current tenant (TENANT_ADMIN) ─────────────────────────
  async updateSettings(
    tenantId: string,
    dto: UpdateTenantSettingsDto,
  ): Promise<ApiResponse<TenantSettingsResponse>> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant not found`);
    }

    const currentTheme = (tenant.themeConfig as Record<string, unknown>) || {};
    const mergedTheme = dto.themeConfig ? { ...currentTheme, ...dto.themeConfig } : currentTheme;

    const updated = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        ...(dto.name ? { name: dto.name.trim() } : {}),
        ...(dto.themeConfig ? { themeConfig: mergedTheme as any } : {}),
      },
    });

    return {
      success: true,
      data: {
        id: updated.id,
        name: updated.name,
        slug: updated.slug,
        status: updated.status as any,
        plan: updated.plan as any,
        themeConfig: updated.themeConfig as any,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
      message: 'Institute settings updated successfully',
    };
  }

  // ── Update tenant by Super Admin ─────────────────────────────────────────────
  async update(id: string, dto: UpdateTenantDto): Promise<ApiResponse<TenantSettingsResponse>> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundException(`Tenant "${id}" not found`);

    const currentTheme = (tenant.themeConfig as Record<string, unknown>) || {};
    const mergedTheme = dto.themeConfig ? { ...currentTheme, ...dto.themeConfig } : currentTheme;

    const updated = await this.prisma.tenant.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name.trim() }),
        ...(dto.status && { status: dto.status }),
        ...(dto.plan && { plan: dto.plan }),
        ...(dto.themeConfig && { themeConfig: mergedTheme as any }),
      },
    });

    return {
      success: true,
      data: {
        id: updated.id,
        name: updated.name,
        slug: updated.slug,
        status: updated.status as any,
        plan: updated.plan as any,
        themeConfig: updated.themeConfig as any,
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
