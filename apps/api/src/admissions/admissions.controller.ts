import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ApproveAdmissionDto,
  ApproveAdmissionSchema,
  CreateAdmissionDto,
  CreateAdmissionSchema,
  Role,
} from '@repo/shared';
import { AdmissionsService } from './admissions.service';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { TenantContext } from '../common/types/request.types';

@ApiTags('Admissions')
@Controller()
export class AdmissionsController {
  constructor(private readonly admissionsService: AdmissionsService) {}

  /**
   * Public endpoint for prospective students to submit an admission application.
   * POST /api/v1/public/admission
   */
  @Post('public/admission')
  @Public()
  @ApiOperation({ summary: 'Submit a public admission application' })
  createPublicApplication(
    @CurrentTenant() tenant: TenantContext | undefined,
    @Body(new ZodValidationPipe(CreateAdmissionSchema)) dto: CreateAdmissionDto,
  ) {
    if (!tenant) {
      throw new NotFoundException('Tenant context missing or invalid');
    }
    return this.admissionsService.createPublicApplication(tenant.id, dto);
  }

  /**
   * Admin endpoint to list all admission applications for the tenant.
   * GET /api/v1/admissions
   */
  @Get('admissions')
  @Roles(Role.TENANT_ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'List admission applications for current tenant' })
  findAll(
    @CurrentTenant('id') tenantId: string,
    @Query('status') status?: string,
  ) {
    return this.admissionsService.findAll(tenantId, status);
  }

  /**
   * Admin endpoint to approve an application and enroll the student.
   * POST /api/v1/admissions/:id/approve
   */
  @Post('admissions/:id/approve')
  @Roles(Role.TENANT_ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Approve admission application and create student' })
  approve(
    @CurrentTenant('id') tenantId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(ApproveAdmissionSchema))
    dto: ApproveAdmissionDto,
  ) {
    return this.admissionsService.approve(tenantId, id, dto);
  }

  /**
   * Admin endpoint to reject an application.
   * POST /api/v1/admissions/:id/reject
   */
  @Post('admissions/:id/reject')
  @Roles(Role.TENANT_ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Reject admission application' })
  reject(@CurrentTenant('id') tenantId: string, @Param('id') id: string) {
    return this.admissionsService.reject(tenantId, id);
  }
}
