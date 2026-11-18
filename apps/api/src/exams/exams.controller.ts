import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  BulkUpsertExamResultsDto,
  BulkUpsertExamResultsSchema,
  CreateExamDto,
  CreateExamSchema,
  Role,
  UpdateExamDto,
  UpdateExamSchema,
  UpsertGradeScaleDto,
  UpsertGradeScaleSchema,
} from '@repo/shared';
import { ExamsService } from './exams.service';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { AuthUser } from '../common/types/request.types';

@ApiTags('Exams & Results')
@Controller('exams')
export class ExamsController {
  constructor(private readonly examsService: ExamsService) {}

  // ── Grade Scales ───────────────────────────────────────────────────────────

  @Get('grade-scales')
  @Roles(Role.TENANT_ADMIN, Role.STAFF, Role.INSTRUCTOR)
  @ApiOperation({ summary: 'Get grade scale configuration for the tenant' })
  getGradeScales(@CurrentTenant('id') tenantId: string): Promise<any> {
    return this.examsService.getGradeScales(tenantId);
  }

  @Put('grade-scales')
  @Roles(Role.TENANT_ADMIN)
  @ApiOperation({ summary: 'Replace grade scale rules for the tenant' })
  upsertGradeScales(
    @CurrentTenant('id') tenantId: string,
    @Body(new ZodValidationPipe(UpsertGradeScaleSchema))
    dto: UpsertGradeScaleDto,
  ): Promise<any> {
    return this.examsService.upsertGradeScales(tenantId, dto);
  }

  // ── Student Results & Report Cards ─────────────────────────────────────────

  @Get('me/results')
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: 'Get own published exam results (Student)' })
  getMyResults(
    @CurrentTenant('id') tenantId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<any> {
    return this.examsService.getMyResults(tenantId, user.userId);
  }

  @Get('student/:studentId/results')
  @Roles(Role.TENANT_ADMIN, Role.STAFF, Role.INSTRUCTOR, Role.STUDENT)
  @ApiOperation({ summary: 'Get exam results for a student' })
  getStudentResults(
    @CurrentTenant('id') tenantId: string,
    @Param('studentId') studentId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<any> {
    return this.examsService.getStudentResults(tenantId, studentId, user);
  }

  @Get('student/:studentId/report-card')
  @Roles(Role.TENANT_ADMIN, Role.STAFF, Role.INSTRUCTOR, Role.STUDENT)
  @ApiOperation({ summary: 'Get aggregated report card for a student' })
  getReportCard(
    @CurrentTenant('id') tenantId: string,
    @Param('studentId') studentId: string,
    @CurrentUser() user: AuthUser,
    @Query('term') term?: string,
  ): Promise<any> {
    return this.examsService.getReportCard(tenantId, studentId, user, term);
  }

  // ── Exams CRUD ─────────────────────────────────────────────────────────────

  @Get()
  @Roles(Role.TENANT_ADMIN, Role.STAFF, Role.INSTRUCTOR)
  @ApiOperation({ summary: 'List exams for the tenant' })
  findAll(
    @CurrentTenant('id') tenantId: string,
    @CurrentUser() user: AuthUser,
    @Query('batchId') batchId?: string,
    @Query('courseId') courseId?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('term') term?: string,
  ): Promise<any> {
    return this.examsService.findAll(tenantId, user, {
      batchId,
      courseId,
      type,
      status,
      term,
    });
  }

  @Get(':id')
  @Roles(Role.TENANT_ADMIN, Role.STAFF, Role.INSTRUCTOR)
  @ApiOperation({ summary: 'Get exam details by ID' })
  findOne(
    @CurrentTenant('id') tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<any> {
    return this.examsService.findOne(tenantId, id, user);
  }

  @Post()
  @Roles(Role.TENANT_ADMIN, Role.STAFF, Role.INSTRUCTOR)
  @ApiOperation({ summary: 'Create a new exam' })
  create(
    @CurrentTenant('id') tenantId: string,
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(CreateExamSchema)) dto: CreateExamDto,
  ): Promise<any> {
    return this.examsService.create(tenantId, user, dto);
  }

  @Patch(':id')
  @Roles(Role.TENANT_ADMIN, Role.STAFF, Role.INSTRUCTOR)
  @ApiOperation({ summary: 'Update an exam' })
  update(
    @CurrentTenant('id') tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(UpdateExamSchema)) dto: UpdateExamDto,
  ): Promise<any> {
    return this.examsService.update(tenantId, id, user, dto);
  }

  @Post(':id/publish')
  @Roles(Role.TENANT_ADMIN, Role.STAFF, Role.INSTRUCTOR)
  @ApiOperation({ summary: 'Publish exam results to students' })
  publish(
    @CurrentTenant('id') tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<any> {
    return this.examsService.publish(tenantId, id, user);
  }

  @Delete(':id')
  @Roles(Role.TENANT_ADMIN)
  @ApiOperation({ summary: 'Delete an exam' })
  remove(
    @CurrentTenant('id') tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<any> {
    return this.examsService.remove(tenantId, id, user);
  }

  // ── Marks Entry & Merit List ───────────────────────────────────────────────

  @Get(':id/results')
  @Roles(Role.TENANT_ADMIN, Role.STAFF, Role.INSTRUCTOR)
  @ApiOperation({ summary: 'Get exam results, merit list, and class summary' })
  getExamResults(
    @CurrentTenant('id') tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<any> {
    return this.examsService.getExamResults(tenantId, id, user);
  }

  @Put(':id/results')
  @Roles(Role.TENANT_ADMIN, Role.STAFF, Role.INSTRUCTOR)
  @ApiOperation({ summary: 'Bulk upsert marks for an exam' })
  bulkUpsertResults(
    @CurrentTenant('id') tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(BulkUpsertExamResultsSchema))
    dto: BulkUpsertExamResultsDto,
  ): Promise<any> {
    return this.examsService.bulkUpsertResults(tenantId, id, user, dto);
  }
}
