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
  CreateStudentDto,
  CreateStudentSchema,
  Role,
  UpdateStudentDto,
  UpdateStudentSchema,
} from '@repo/shared';
import { StudentsService } from './students.service';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { AuthUser } from '../common/types/request.types';

@ApiTags('Students')
@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get()
  @Roles(Role.TENANT_ADMIN, Role.STAFF, Role.INSTRUCTOR)
  @ApiOperation({ summary: 'List students with search and filters' })
  findAll(
    @CurrentTenant('id') tenantId: string,
    @CurrentUser() user: AuthUser,
    @Query('search') search?: string,
    @Query('batchId') batchId?: string,
    @Query('courseId') courseId?: string,
    @Query('status') status?: 'active' | 'inactive' | 'all',
  ) {
    return this.studentsService.findAll(tenantId, user, {
      search,
      batchId,
      courseId,
      status,
    });
  }

  @Get('me')
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: 'Get own student profile' })
  findMyProfile(
    @CurrentTenant('id') tenantId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.studentsService.findMyProfile(tenantId, user.userId);
  }

  @Get(':id')
  @Roles(Role.TENANT_ADMIN, Role.STAFF, Role.INSTRUCTOR)
  @ApiOperation({ summary: 'Get student profile by ID' })
  findOne(
    @CurrentTenant('id') tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.studentsService.findOne(tenantId, id, user);
  }

  @Post()
  @Roles(Role.TENANT_ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Directly enroll a new student' })
  create(
    @CurrentTenant('id') tenantId: string,
    @Body(new ZodValidationPipe(CreateStudentSchema)) dto: CreateStudentDto,
  ) {
    return this.studentsService.create(tenantId, dto);
  }

  @Patch(':id')
  @Roles(Role.TENANT_ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Update student profile and batch assignment' })
  update(
    @CurrentTenant('id') tenantId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateStudentSchema)) dto: UpdateStudentDto,
  ) {
    return this.studentsService.update(tenantId, id, dto);
  }
}
