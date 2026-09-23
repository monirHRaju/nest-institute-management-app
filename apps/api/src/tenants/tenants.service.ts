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
  PaginationDto,
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

    // Check owner email uniqueness within this (future) tenant
    // We'll validate after tenant creation via a transaction
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

  // ── List all tenants (paginated) ─────────────────────────────────────────────
  async findAll(
    pagination: PaginationDto,
    filters: { status?: TenantStatus; plan?: string },
  ): Promise<PaginatedResponse<TenantListItem>> {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const where = {
      ...(filters.status && { status: filters.status }),
      ...(filters.plan && { plan: filters.plan as never }),
    };

    const [tenants, total] = await Promise.all([
      this.prisma.tenant.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { users: true } },
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
        _count: { select: { users: true } },
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
      include: { _count: { select: { users: true } } },
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

// ── Exported response types ───────────────────────────────────────────────────

export interface TenantListItem {
  id: string;
  name: string;
  slug: string;
  status: string;
  plan: string;
  userCount: number;
  createdAt: string;
}

export interface TenantDetail extends TenantListItem {
  themeConfig: Record<string, unknown>;
  updatedAt: string;
}
