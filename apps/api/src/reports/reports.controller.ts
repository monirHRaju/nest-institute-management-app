import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@repo/shared';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ReportsService } from './reports.service';

@ApiTags('Reports Hub')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('academic')
  @Roles(Role.TENANT_ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Academic & exam performance report (includes CSV)' })
  getAcademic(
    @CurrentTenant('id') tenantId: string,
    @Query('batchId') batchId?: string,
  ) {
    return this.reportsService.getAcademicReport(tenantId, batchId);
  }

  @Get('attendance')
  @Roles(Role.TENANT_ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Student attendance & chronic absentee report (includes CSV)' })
  getAttendance(
    @CurrentTenant('id') tenantId: string,
    @Query('batchId') batchId?: string,
    @Query('threshold') threshold?: string,
  ) {
    return this.reportsService.getAttendanceReport(
      tenantId,
      batchId,
      threshold ? Number(threshold) : 75,
    );
  }

  @Get('enrollment')
  @Roles(Role.TENANT_ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Admissions funnel & course enrollment report (includes CSV)' })
  getEnrollment(@CurrentTenant('id') tenantId: string) {
    return this.reportsService.getEnrollmentReport(tenantId);
  }

  @Get('payroll')
  @Roles(Role.TENANT_ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Annual payroll disbursement report (includes CSV)' })
  getPayroll(
    @CurrentTenant('id') tenantId: string,
    @Query('year') year?: string,
  ) {
    return this.reportsService.getPayrollReport(
      tenantId,
      year ? Number(year) : undefined,
    );
  }

  @Get('sms')
  @Roles(Role.TENANT_ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'SMS delivery & segment consumption report (includes CSV)' })
  getSms(@CurrentTenant('id') tenantId: string) {
    return this.reportsService.getSmsReport(tenantId);
  }
}
