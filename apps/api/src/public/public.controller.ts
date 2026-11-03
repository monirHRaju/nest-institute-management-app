import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Query,
  UsePipes,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import type { TenantContext } from '../common/types/request.types';
import { PublicService, PublicTenantConfigResponse } from './public.service';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { CreatePublicApplicationSchema } from '@repo/shared';

@ApiTags('Public Portal API')
@Controller('public')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Get('tenant-config')
  @Public()
  @ApiOperation({ summary: 'Get public configuration and branding for current tenant' })
  @ApiResponse({ status: 200, description: 'Tenant config retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  getTenantConfig(
    @CurrentTenant() tenant: TenantContext | undefined,
  ): Promise<PublicTenantConfigResponse> {
    if (!tenant) {
      throw new NotFoundException('Tenant context missing or invalid');
    }
    return this.publicService.getTenantConfig(tenant);
  }

  @Get('courses')
  @Public()
  @ApiOperation({ summary: 'List public courses and active batch slots for the tenant' })
  @ApiResponse({ status: 200, description: 'Public courses list' })
  getCourses(@CurrentTenant() tenant: TenantContext | undefined) {
    if (!tenant) {
      throw new NotFoundException('Tenant context missing or invalid');
    }
    return this.publicService.getCourses(tenant.id);
  }

  @Get('courses/:id')
  @Public()
  @ApiOperation({ summary: 'Get single public course details and schedule' })
  @ApiResponse({ status: 200, description: 'Course details' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  getCourseById(
    @CurrentTenant() tenant: TenantContext | undefined,
    @Param('id') id: string,
  ) {
    if (!tenant) {
      throw new NotFoundException('Tenant context missing or invalid');
    }
    return this.publicService.getCourseById(tenant.id, id);
  }

  @Post('apply')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(CreatePublicApplicationSchema))
  @ApiOperation({ summary: 'Submit an online admission application' })
  @ApiResponse({ status: 201, description: 'Application submitted successfully' })
  submitApplication(
    @CurrentTenant() tenant: TenantContext | undefined,
    @Body() body: unknown,
  ) {
    if (!tenant) {
      throw new NotFoundException('Tenant context missing or invalid');
    }
    const dto = CreatePublicApplicationSchema.parse(body);
    return this.publicService.submitApplication(tenant.id, dto);
  }

  @Get('track')
  @Public()
  @ApiOperation({ summary: 'Track admission application status by tracking code & phone' })
  @ApiQuery({ name: 'applicationNumber', required: true, type: String })
  @ApiQuery({ name: 'phone', required: true, type: String })
  trackApplication(
    @CurrentTenant() tenant: TenantContext | undefined,
    @Query('applicationNumber') applicationNumber: string,
    @Query('phone') phone: string,
  ) {
    if (!tenant) {
      throw new NotFoundException('Tenant context missing or invalid');
    }
    return this.publicService.trackApplication(tenant.id, applicationNumber, phone);
  }

  @Get('verify')
  @Public()
  @ApiOperation({ summary: 'Verify student credentials and enrollment publicly' })
  @ApiQuery({ name: 'studentId', required: true, type: String })
  verifyStudent(
    @CurrentTenant() tenant: TenantContext | undefined,
    @Query('studentId') studentId: string,
  ) {
    if (!tenant) {
      throw new NotFoundException('Tenant context missing or invalid');
    }
    return this.publicService.verifyStudent(tenant.id, studentId);
  }
}
