import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
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
  UpdateTenantSettingsSchema,
  PaginationSchema,
  Role,
} from '@repo/shared';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/types/request.types';
import { TenantsService } from './tenants.service';
import { TenantStatus } from '@repo/db';

@ApiTags('Tenants')
@ApiBearerAuth()
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  // ── TENANT ADMIN / STAFF ENDPOINTS ──────────────────────────────────────────

  // GET /api/v1/tenants/settings
  @Get('settings')
  @Roles(Role.TENANT_ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Get settings for current tenant institute' })
  @ApiResponse({ status: 200, description: 'Settings retrieved successfully' })
  getSettings(@CurrentUser() user: AuthUser) {
    if (!user.tenantId) {
      throw new BadRequestException('User is not associated with an institute tenant');
    }
    return this.tenantsService.getSettings(user.tenantId);
  }

  // PATCH /api/v1/tenants/settings
  @Patch('settings')
  @Roles(Role.TENANT_ADMIN)
  @UsePipes(new ZodValidationPipe(UpdateTenantSettingsSchema))
  @ApiOperation({ summary: 'Update profile and branding settings for current tenant' })
  @ApiResponse({ status: 200, description: 'Settings updated successfully' })
  updateSettings(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    if (!user.tenantId) {
      throw new BadRequestException('User is not associated with an institute tenant');
    }
    const dto = UpdateTenantSettingsSchema.parse(body);
    return this.tenantsService.updateSettings(user.tenantId, dto);
  }

  // ── SUPER ADMIN ONLY ENDPOINTS ──────────────────────────────────────────────

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
  @ApiOperation({ summary: 'List all tenants for Super Admin (paginated + search)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: TenantStatus })
  @ApiQuery({ name: 'search', required: false, type: String })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: TenantStatus,
    @Query('search') search?: string,
  ) {
    const pagination = PaginationSchema.parse({ page, limit });
    return this.tenantsService.findAll(pagination, { status, search });
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
