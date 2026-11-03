import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UsePipes,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  UpdateApplicationStatusSchema,
  ApproveAndAdmitSchema,
  Role,
  ApplicationStatus,
} from '@repo/shared';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/types/request.types';
import { ApplicationsService } from './applications.service';

@ApiTags('Applications (Admin)')
@ApiBearerAuth()
@Controller('applications')
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Get()
  @Roles(Role.TENANT_ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'List all online admission applications for the tenant' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: ApplicationStatus })
  @ApiQuery({ name: 'courseId', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  findAll(
    @CurrentUser() user: AuthUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: ApplicationStatus,
    @Query('courseId') courseId?: string,
    @Query('search') search?: string,
  ) {
    if (!user.tenantId) {
      throw new BadRequestException('User is not associated with an institute tenant');
    }
    return this.applicationsService.findAll(user.tenantId, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      status,
      courseId,
      search,
    });
  }

  @Get(':id')
  @Roles(Role.TENANT_ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Get a single application by ID' })
  @ApiResponse({ status: 200, description: 'Application found' })
  @ApiResponse({ status: 404, description: 'Application not found' })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    if (!user.tenantId) {
      throw new BadRequestException('User is not associated with an institute tenant');
    }
    return this.applicationsService.findOne(user.tenantId, id);
  }

  @Patch(':id')
  @Roles(Role.TENANT_ADMIN, Role.STAFF)
  @UsePipes(new ZodValidationPipe(UpdateApplicationStatusSchema))
  @ApiOperation({ summary: 'Update application review status or counselor notes' })
  updateStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    if (!user.tenantId) {
      throw new BadRequestException('User is not associated with an institute tenant');
    }
    const dto = UpdateApplicationStatusSchema.parse(body);
    return this.applicationsService.updateStatus(user.tenantId, id, dto);
  }

  @Post(':id/approve')
  @Roles(Role.TENANT_ADMIN, Role.STAFF)
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(ApproveAndAdmitSchema))
  @ApiOperation({ summary: '1-Click Approve and Admit online applicant into official enrolled student' })
  approveAndAdmit(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    if (!user.tenantId) {
      throw new BadRequestException('User is not associated with an institute tenant');
    }
    const dto = ApproveAndAdmitSchema.parse(body);
    return this.applicationsService.approveAndAdmit(user.tenantId, id, dto, user.userId);
  }
}
