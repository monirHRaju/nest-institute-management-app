import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UsePipes,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  CreateTenantSchema,
  UpdateTenantSchema,
  UpdateTenantBrandingSchema,
  UpdateTenantBrandingDto,
  PaginationSchema,
  Role,
} from '@repo/shared';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/types/request.types';
import { TenantsService } from './tenants.service';
import { TenantStatus } from '@repo/db';

@ApiTags('Tenants & Branding')
@ApiBearerAuth()
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  // GET /api/v1/tenants/stats (Super Admin platform KPIs)
  @Get('stats')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get platform-wide tenant & usage KPIs (Super Admin)' })
  getPlatformStats() {
    return this.tenantsService.getPlatformStats();
  }

  // GET /api/v1/tenants/me/branding (Tenant Admin / Staff)
  @Get('me/branding')
  @Roles(Role.TENANT_ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Get current tenant branding & public website themeConfig' })
  getMyBranding(
    @CurrentTenant('id') tenantId: string | undefined,
    @CurrentUser() user: AuthUser,
  ) {
    return this.tenantsService.getMyBranding(tenantId || user.tenantId || '');
  }

  // PUT /api/v1/tenants/me/branding (Tenant Admin)
  @Put('me/branding')
  @Roles(Role.TENANT_ADMIN)
  @ApiOperation({ summary: 'Update current tenant branding & public website themeConfig' })
  updateMyBranding(
    @CurrentTenant('id') tenantId: string | undefined,
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(UpdateTenantBrandingSchema))
    dto: UpdateTenantBrandingDto,
  ) {
    return this.tenantsService.updateMyBranding(
      tenantId || user.tenantId || '',
      dto,
    );
  }

  // POST /api/v1/tenants
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.SUPER_ADMIN)
  @UsePipes(new ZodValidationPipe(CreateTenantSchema))
  @ApiOperation({ summary: 'Create a new tenant + first TENANT_ADMIN user' })
  @ApiResponse({ status: 201, description: 'Tenant created' })
  @ApiResponse({ status: 409, description: 'Slug already taken' })
  create(@Body() body: unknown) {
    const dto = CreateTenantSchema.parse(body);
    return this.tenantsService.create(dto);
  }

  // GET /api/v1/tenants
  @Get()
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'List all tenants (paginated)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: TenantStatus })
  @ApiQuery({ name: 'plan', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: TenantStatus,
    @Query('plan') plan?: string,
    @Query('search') search?: string,
  ) {
    const pagination = PaginationSchema.parse({ page, limit });
    return this.tenantsService.findAll(pagination, { status, plan, search });
  }

  // GET /api/v1/tenants/:id
  @Get(':id')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get a single tenant by ID' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  findOne(@Param('id') id: string) {
    return this.tenantsService.findOne(id);
  }

  // PATCH /api/v1/tenants/:id
  @Patch(':id')
  @Roles(Role.SUPER_ADMIN)
  @UsePipes(new ZodValidationPipe(UpdateTenantSchema))
  @ApiOperation({ summary: 'Update tenant name / status / plan' })
  update(@Param('id') id: string, @Body() body: unknown) {
    const dto = UpdateTenantSchema.parse(body);
    return this.tenantsService.update(id, dto);
  }

  // DELETE /api/v1/tenants/:id  (soft delete = suspend)
  @Delete(':id')
  @Roles(Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Suspend a tenant (soft delete)' })
  remove(@Param('id') id: string) {
    return this.tenantsService.remove(id);
  }
}
