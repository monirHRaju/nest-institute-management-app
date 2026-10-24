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
} from '@nestjs/swagger';
import { InstructorsService } from './instructors.service';
import {
  CreateInstructorDto,
  UpdateInstructorDto,
  InstructorQueryDto,
  CreateInstructorSchema,
  UpdateInstructorSchema,
  InstructorQuerySchema,
  Role,
} from '@repo/shared';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';

@ApiTags('Instructors & Faculty')
@ApiBearerAuth()
@Controller('instructors')
@Roles(Role.TENANT_ADMIN, Role.STAFF, Role.INSTRUCTOR)
export class InstructorsController {
  constructor(private readonly instructorsService: InstructorsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.TENANT_ADMIN)
  @ApiOperation({ summary: 'Register a new instructor / faculty user' })
  @ApiResponse({ status: 201, description: 'Instructor created successfully' })
  create(
    @CurrentTenant('id') tenantId: string,
    @Body(new ZodValidationPipe(CreateInstructorSchema)) dto: CreateInstructorDto,
  ) {
    return this.instructorsService.create(tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all instructors for the tenant' })
  findAll(
    @CurrentTenant('id') tenantId: string,
    @Query(new ZodValidationPipe(InstructorQuerySchema)) query: InstructorQueryDto,
  ) {
    return this.instructorsService.findAll(tenantId, query);
  }

  @Get('timetable')
  @ApiOperation({ summary: 'Get weekly timetable schedule matrix for all batches' })
  getTimetable(@CurrentTenant('id') tenantId: string) {
    return this.instructorsService.getWeeklyTimetable(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get instructor details by ID with assigned batches' })
  findOne(
    @CurrentTenant('id') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.instructorsService.findOne(tenantId, id);
  }

  @Patch(':id')
  @Roles(Role.TENANT_ADMIN)
  @ApiOperation({ summary: 'Update instructor profile or status' })
  update(
    @CurrentTenant('id') tenantId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateInstructorSchema)) dto: UpdateInstructorDto,
  ) {
    return this.instructorsService.update(tenantId, id, dto);
  }
}
