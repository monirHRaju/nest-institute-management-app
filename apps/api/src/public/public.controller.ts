import { Controller, Get, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { PrismaService } from '../prisma/prisma.service';
import type { TenantContext } from '../common/types/request.types';

@ApiTags('Public API')
@Controller('public')
export class PublicController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('tenant-config')
  @Public()
  @ApiOperation({ summary: 'Get public configuration for the current tenant' })
  @ApiResponse({ status: 200, description: 'Tenant config retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  getTenantConfig(@CurrentTenant() tenant: TenantContext | undefined) {
    if (!tenant) {
      throw new NotFoundException('Tenant context missing or invalid');
    }

    return {
      success: true,
      data: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        themeConfig: tenant.themeConfig,
      },
    };
  }

  @Get('courses')
  @Public()
  @ApiOperation({ summary: 'Get public course catalog for the current tenant' })
  @ApiResponse({ status: 200, description: 'Courses retrieved successfully' })
  async getPublicCourses(@CurrentTenant() tenant: TenantContext | undefined) {
    if (!tenant) {
      throw new NotFoundException('Tenant context missing or invalid');
    }

    const courses = await this.prisma.course.findMany({
      where: { tenantId: tenant.id },
      include: {
        category: true,
        batches: {
          orderBy: { startDate: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      data: courses,
    };
  }
}
