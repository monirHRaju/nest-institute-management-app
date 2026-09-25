import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { CoursesService } from './courses.service';
import { CreateCourseDto, UpdateCourseDto, Role } from '@repo/shared';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { CreateCourseSchema, UpdateCourseSchema } from '@repo/shared';

@Controller('courses')
@Roles(Role.TENANT_ADMIN, Role.STAFF)
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Post()
  create(
    @CurrentTenant('id') tenantId: string,
    @Body(new ZodValidationPipe(CreateCourseSchema)) createCourseDto: CreateCourseDto,
  ) {
    return this.coursesService.create(tenantId, createCourseDto);
  }

  @Get()
  findAll(@CurrentTenant('id') tenantId: string) {
    return this.coursesService.findAll(tenantId);
  }

  @Get(':id')
  findOne(@CurrentTenant('id') tenantId: string, @Param('id') id: string) {
    return this.coursesService.findOne(tenantId, id);
  }

  @Patch(':id')
  update(
    @CurrentTenant('id') tenantId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateCourseSchema)) updateCourseDto: UpdateCourseDto,
  ) {
    return this.coursesService.update(tenantId, id, updateCourseDto);
  }

  @Delete(':id')
  remove(@CurrentTenant('id') tenantId: string, @Param('id') id: string) {
    return this.coursesService.remove(tenantId, id);
  }
}
