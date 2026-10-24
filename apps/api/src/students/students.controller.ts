import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
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
import { StudentsService } from './students.service';
import {
  CreateStudentDto,
  UpdateStudentDto,
  CreateEnrollmentDto,
  UpdateEnrollmentDto,
  CreateStudentSchema,
  UpdateStudentSchema,
  CreateEnrollmentSchema,
  UpdateEnrollmentSchema,
  StudentQuerySchema,
  Role,
  StudentStatus,
} from '@repo/shared';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';

@ApiTags('Students & Admissions')
@ApiBearerAuth()
@Controller('students')
@Roles(Role.TENANT_ADMIN, Role.STAFF)
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new student with optional initial course/batch enrollment' })
  @ApiResponse({ status: 201, description: 'Student registered successfully' })
  @ApiResponse({ status: 409, description: 'Student ID already in use' })
  create(
    @CurrentTenant('id') tenantId: string,
    @Body(new ZodValidationPipe(CreateStudentSchema)) createStudentDto: CreateStudentDto,
  ) {
    return this.studentsService.create(tenantId, createStudentDto);
  }

  @Get()
  @ApiOperation({ summary: 'List students with pagination, search, and filters' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: StudentStatus })
  @ApiQuery({ name: 'courseId', required: false, type: String })
  @ApiQuery({ name: 'batchId', required: false, type: String })
  findAll(
    @CurrentTenant('id') tenantId: string,
    @Query() queryParams: Record<string, string>,
  ) {
    const query = StudentQuerySchema.parse(queryParams);
    return this.studentsService.findAll(tenantId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get student details by ID with enrollments' })
  @ApiResponse({ status: 200, description: 'Student profile retrieved' })
  @ApiResponse({ status: 404, description: 'Student not found' })
  findOne(
    @CurrentTenant('id') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.studentsService.findOne(tenantId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update student profile information' })
  @ApiResponse({ status: 200, description: 'Student updated successfully' })
  update(
    @CurrentTenant('id') tenantId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateStudentSchema)) updateStudentDto: UpdateStudentDto,
  ) {
    return this.studentsService.update(tenantId, id, updateStudentDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a student record' })
  remove(
    @CurrentTenant('id') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.studentsService.remove(tenantId, id);
  }

  @Post(':id/enrollments')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Enroll a student into a course / batch' })
  addEnrollment(
    @CurrentTenant('id') tenantId: string,
    @Param('id') studentId: string,
    @Body(new ZodValidationPipe(CreateEnrollmentSchema)) dto: CreateEnrollmentDto,
  ) {
    return this.studentsService.addEnrollment(tenantId, studentId, dto);
  }

  @Patch(':id/enrollments/:enrollmentId')
  @ApiOperation({ summary: 'Update enrollment status or assign to a different batch' })
  updateEnrollment(
    @CurrentTenant('id') tenantId: string,
    @Param('id') studentId: string,
    @Param('enrollmentId') enrollmentId: string,
    @Body(new ZodValidationPipe(UpdateEnrollmentSchema)) dto: UpdateEnrollmentDto,
  ) {
    return this.studentsService.updateEnrollment(tenantId, studentId, enrollmentId, dto);
  }

  @Delete(':id/enrollments/:enrollmentId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a student enrollment' })
  removeEnrollment(
    @CurrentTenant('id') tenantId: string,
    @Param('id') studentId: string,
    @Param('enrollmentId') enrollmentId: string,
  ) {
    return this.studentsService.removeEnrollment(tenantId, studentId, enrollmentId);
  }
}
