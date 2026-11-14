import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  MarkBatchAttendanceDto,
  MarkBatchAttendanceSchema,
  Role,
} from '@repo/shared';
import { AttendanceService } from './attendance.service';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { AuthUser } from '../common/types/request.types';

@ApiTags('Attendance')
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get('batch/:batchId')
  @Roles(Role.TENANT_ADMIN, Role.STAFF, Role.INSTRUCTOR)
  @ApiOperation({ summary: 'Get batch attendance sheet for a specific date' })
  getBatchSheet(
    @CurrentTenant('id') tenantId: string,
    @Param('batchId') batchId: string,
    @Query('date') date: string | undefined,
    @CurrentUser() user: AuthUser,
  ) {
    return this.attendanceService.getBatchAttendanceSheet(
      tenantId,
      batchId,
      date,
      user,
    );
  }

  @Post('batch')
  @Roles(Role.TENANT_ADMIN, Role.STAFF, Role.INSTRUCTOR)
  @ApiOperation({ summary: 'Mark or update attendance for a batch session' })
  markBatch(
    @CurrentTenant('id') tenantId: string,
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(MarkBatchAttendanceSchema))
    dto: MarkBatchAttendanceDto,
  ) {
    return this.attendanceService.markBatchAttendance(tenantId, user, dto);
  }

  @Get('me')
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: 'Get own attendance summary and records (Student)' })
  getMyAttendance(
    @CurrentTenant('id') tenantId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.attendanceService.getMyAttendance(tenantId, user.userId);
  }

  @Get('student/:studentId')
  @Roles(Role.TENANT_ADMIN, Role.STAFF, Role.INSTRUCTOR)
  @ApiOperation({ summary: 'Get attendance summary and records for a student' })
  getStudentAttendance(
    @CurrentTenant('id') tenantId: string,
    @Param('studentId') studentId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.attendanceService.getStudentAttendance(
      tenantId,
      studentId,
      user,
    );
  }
}
