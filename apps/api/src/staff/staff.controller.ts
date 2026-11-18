import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CreateStaffDto,
  CreateStaffSchema,
  Role,
  UpdateStaffDto,
  UpdateStaffSchema,
} from '@repo/shared';
import { StaffService } from './staff.service';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { AuthUser } from '../common/types/request.types';

@ApiTags('Staff')
@Controller('staff')
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Get()
  @Roles(Role.TENANT_ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'List staff & instructors for the tenant' })
  findAll(
    @CurrentTenant('id') tenantId: string,
    @Query('search') search?: string,
    @Query('role') role?: Role.STAFF | Role.INSTRUCTOR,
    @Query('status') status?: 'active' | 'inactive' | 'all',
  ): Promise<any> {
    return this.staffService.findAll(tenantId, { search, role, status });
  }

  @Get('me')
  @Roles(Role.TENANT_ADMIN, Role.STAFF, Role.INSTRUCTOR)
  @ApiOperation({ summary: 'Get own staff profile' })
  findMyProfile(
    @CurrentTenant('id') tenantId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<any> {
    return this.staffService.findMyProfile(tenantId, user.userId);
  }

  @Get(':id')
  @Roles(Role.TENANT_ADMIN, Role.STAFF, Role.INSTRUCTOR)
  @ApiOperation({ summary: 'Get staff profile by ID' })
  findOne(
    @CurrentTenant('id') tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<any> {
    return this.staffService.findOne(tenantId, id, user);
  }

  @Get(':id/batches')
  @Roles(Role.TENANT_ADMIN, Role.STAFF, Role.INSTRUCTOR)
  @ApiOperation({ summary: 'Get batches assigned to an instructor/staff member' })
  getBatches(
    @CurrentTenant('id') tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<any> {
    return this.staffService.getBatches(tenantId, id, user);
  }

  @Post()
  @Roles(Role.TENANT_ADMIN)
  @ApiOperation({ summary: 'Create a new staff member or instructor' })
  create(
    @CurrentTenant('id') tenantId: string,
    @Body(new ZodValidationPipe(CreateStaffSchema)) dto: CreateStaffDto,
  ): Promise<any> {
    return this.staffService.create(tenantId, dto);
  }

  @Patch(':id')
  @Roles(Role.TENANT_ADMIN)
  @ApiOperation({ summary: 'Update staff member profile' })
  update(
    @CurrentTenant('id') tenantId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateStaffSchema)) dto: UpdateStaffDto,
  ): Promise<any> {
    return this.staffService.update(tenantId, id, dto);
  }

  @Patch(':id/deactivate')
  @Roles(Role.TENANT_ADMIN)
  @ApiOperation({ summary: 'Soft-deactivate a staff member' })
  deactivate(
    @CurrentTenant('id') tenantId: string,
    @Param('id') id: string,
  ): Promise<any> {
    return this.staffService.deactivate(tenantId, id);
  }
}
