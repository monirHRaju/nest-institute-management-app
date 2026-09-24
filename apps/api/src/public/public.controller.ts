import { Controller, Get, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import type { TenantContext } from '../common/types/request.types';

@ApiTags('Public API')
@Controller('public')
export class PublicController {
  
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
}
