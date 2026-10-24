import {
  Controller,
  Get,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import {
  ReportFilterDto,
  ReportFilterSchema,
  Role,
} from '@repo/shared';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';

@ApiTags('Reports & Analytics')
@ApiBearerAuth()
@Controller('reports')
@Roles(Role.TENANT_ADMIN, Role.STAFF)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('attendance')
  @ApiOperation({ summary: 'Get aggregated attendance performance report' })
  getAttendanceReport(
    @CurrentTenant('id') tenantId: string,
    @Query(new ZodValidationPipe(ReportFilterSchema)) query: ReportFilterDto,
  ) {
    return this.reportsService.getAttendanceReport(tenantId, query);
  }

  @Get('financial')
  @ApiOperation({ summary: 'Get aggregated financial and collection revenue report' })
  getFinancialReport(
    @CurrentTenant('id') tenantId: string,
    @Query(new ZodValidationPipe(ReportFilterSchema)) query: ReportFilterDto,
  ) {
    return this.reportsService.getFinancialReport(tenantId, query);
  }

  @Get('admissions')
  @ApiOperation({ summary: 'Get student admissions and program distribution report' })
  getAdmissionsReport(
    @CurrentTenant('id') tenantId: string,
    @Query(new ZodValidationPipe(ReportFilterSchema)) query: ReportFilterDto,
  ) {
    return this.reportsService.getAdmissionsReport(tenantId, query);
  }
}
