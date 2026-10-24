import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AttendanceService } from './attendance.service';
import {
  SaveBatchAttendanceDto,
  UpdateAttendanceRecordDto,
  SaveBatchAttendanceSchema,
  UpdateAttendanceRecordSchema,
  AttendanceQuerySchema,
  Role,
} from '@repo/shared';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';

@ApiTags('Attendance')
@ApiBearerAuth()
@Controller('attendance')
@Roles(Role.TENANT_ADMIN, Role.STAFF, Role.INSTRUCTOR)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('batch')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Save/upsert batch roll call attendance for a specific date' })
  @ApiResponse({ status: 200, description: 'Attendance saved successfully' })
  saveBatch(
    @CurrentTenant('id') tenantId: string,
    @CurrentUser('id') userId: string,
    @Body(new ZodValidationPipe(SaveBatchAttendanceSchema)) dto: SaveBatchAttendanceDto,
  ) {
    return this.attendanceService.saveBatchAttendance(tenantId, userId, dto);
  }

  @Get('batch/:batchId')
  @ApiOperation({ summary: 'Get roll call attendance sheet for a batch on a specific date' })
  @ApiQuery({ name: 'date', required: false, type: String, description: 'Date in YYYY-MM-DD format (defaults to today)' })
  getSheet(
    @CurrentTenant('id') tenantId: string,
    @Param('batchId') batchId: string,
    @Query('date') date?: string,
  ) {
    return this.attendanceService.getBatchAttendanceSheet(tenantId, batchId, date);
  }

  @Get('batch/:batchId/stats')
  @ApiOperation({ summary: 'Get aggregate attendance statistics for a batch' })
  getBatchStats(
    @CurrentTenant('id') tenantId: string,
    @Param('batchId') batchId: string,
  ) {
    return this.attendanceService.getBatchAttendanceStats(tenantId, batchId);
  }

  @Get('students/:studentId')
  @ApiOperation({ summary: 'Get student attendance summary and session history' })
  getStudentAttendance(
    @CurrentTenant('id') tenantId: string,
    @Param('studentId') studentId: string,
  ) {
    return this.attendanceService.getStudentAttendance(tenantId, studentId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an individual attendance record' })
  update(
    @CurrentTenant('id') tenantId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateAttendanceRecordSchema)) dto: UpdateAttendanceRecordDto,
  ) {
    return this.attendanceService.updateRecord(tenantId, id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List attendance records with filters' })
  @ApiQuery({ name: 'batchId', required: false, type: String })
  @ApiQuery({ name: 'studentId', required: false, type: String })
  @ApiQuery({ name: 'date', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @CurrentTenant('id') tenantId: string,
    @Query() queryParams: Record<string, string>,
  ) {
    const query = AttendanceQuerySchema.parse(queryParams);
    return this.attendanceService.findAll(tenantId, query);
  }
}
