import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { BatchesService } from './batches.service';
import { CreateBatchDto, UpdateBatchDto, Role } from '@repo/shared';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { CreateBatchSchema, UpdateBatchSchema } from '@repo/shared';

@Controller('batches')
@Roles(Role.TENANT_ADMIN, Role.STAFF, Role.INSTRUCTOR)
export class BatchesController {
  constructor(private readonly batchesService: BatchesService) {}

  @Post()
  @Roles(Role.TENANT_ADMIN, Role.STAFF)
  create(
    @CurrentTenant('id') tenantId: string,
    @Body(new ZodValidationPipe(CreateBatchSchema)) createBatchDto: CreateBatchDto,
  ) {
    return this.batchesService.create(tenantId, createBatchDto);
  }

  @Get()
  findAll(@CurrentTenant('id') tenantId: string, @CurrentUser() user: any) {
    return this.batchesService.findAll(tenantId, user);
  }

  @Get(':id')
  findOne(
    @CurrentTenant('id') tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.batchesService.findOne(tenantId, id, user);
  }

  @Patch(':id')
  @Roles(Role.TENANT_ADMIN, Role.STAFF) // Only admins/staff can update
  update(
    @CurrentTenant('id') tenantId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateBatchSchema)) updateBatchDto: UpdateBatchDto,
    @CurrentUser() user: any,
  ) {
    return this.batchesService.update(tenantId, id, updateBatchDto, user);
  }

  @Delete(':id')
  @Roles(Role.TENANT_ADMIN, Role.STAFF) // Only admins/staff can delete
  remove(
    @CurrentTenant('id') tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.batchesService.remove(tenantId, id, user);
  }
}
