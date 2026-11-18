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
  BulkPayrollIdsDto,
  BulkPayrollIdsSchema,
  GeneratePayrollDto,
  GeneratePayrollSchema,
  PayPayrollDto,
  PayPayrollSchema,
  Role,
  UpdatePayrollDto,
  UpdatePayrollSchema,
} from '@repo/shared';
import { PayrollService } from './payroll.service';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { AuthUser } from '../common/types/request.types';

@ApiTags('Payroll')
@Controller('payroll')
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  @Get()
  @Roles(Role.TENANT_ADMIN, Role.STAFF, Role.INSTRUCTOR)
  @ApiOperation({ summary: 'List payroll records (staff/instructors see own only)' })
  findAll(
    @CurrentTenant('id') tenantId: string,
    @CurrentUser() user: AuthUser,
    @Query('month') month?: string,
    @Query('year') year?: string,
    @Query('staffId') staffId?: string,
    @Query('status') status?: string,
  ): Promise<any> {
    return this.payrollService.findAll(tenantId, user, {
      month: month ? Number(month) : undefined,
      year: year ? Number(year) : undefined,
      staffId,
      status,
    });
  }

  @Post('generate')
  @Roles(Role.TENANT_ADMIN)
  @ApiOperation({ summary: 'Generate monthly DRAFT payrolls for active staff' })
  generate(
    @CurrentTenant('id') tenantId: string,
    @Body(new ZodValidationPipe(GeneratePayrollSchema)) dto: GeneratePayrollDto,
  ): Promise<any> {
    return this.payrollService.generate(tenantId, dto);
  }

  @Post('bulk-approve')
  @Roles(Role.TENANT_ADMIN)
  @ApiOperation({ summary: 'Approve multiple DRAFT payrolls' })
  bulkApprove(
    @CurrentTenant('id') tenantId: string,
    @Body(new ZodValidationPipe(BulkPayrollIdsSchema)) dto: BulkPayrollIdsDto,
  ): Promise<any> {
    return this.payrollService.bulkApprove(tenantId, dto.ids);
  }

  @Post('bulk-pay')
  @Roles(Role.TENANT_ADMIN)
  @ApiOperation({ summary: 'Pay multiple APPROVED payrolls and create salary expenses' })
  bulkPay(
    @CurrentTenant('id') tenantId: string,
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(BulkPayrollIdsSchema)) dto: BulkPayrollIdsDto,
  ): Promise<any> {
    return this.payrollService.bulkPay(tenantId, user, dto);
  }

  @Patch(':id')
  @Roles(Role.TENANT_ADMIN)
  @ApiOperation({ summary: 'Update allowances/deductions/bonus on a DRAFT payroll' })
  update(
    @CurrentTenant('id') tenantId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdatePayrollSchema)) dto: UpdatePayrollDto,
  ): Promise<any> {
    return this.payrollService.update(tenantId, id, dto);
  }

  @Post(':id/approve')
  @Roles(Role.TENANT_ADMIN)
  @ApiOperation({ summary: 'Approve a DRAFT payroll' })
  approve(
    @CurrentTenant('id') tenantId: string,
    @Param('id') id: string,
  ): Promise<any> {
    return this.payrollService.approve(tenantId, id);
  }

  @Post(':id/pay')
  @Roles(Role.TENANT_ADMIN)
  @ApiOperation({ summary: 'Mark an APPROVED payroll as PAID and create a SALARY expense' })
  pay(
    @CurrentTenant('id') tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(PayPayrollSchema)) dto: PayPayrollDto,
  ): Promise<any> {
    return this.payrollService.pay(tenantId, id, user, dto);
  }

  @Get(':id/payslip')
  @Roles(Role.TENANT_ADMIN, Role.STAFF, Role.INSTRUCTOR)
  @ApiOperation({ summary: 'Get payslip data for a payroll record' })
  getPayslip(
    @CurrentTenant('id') tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<any> {
    return this.payrollService.getPayslip(tenantId, id, user);
  }
}
