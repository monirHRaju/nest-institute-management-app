import {
  Body,
  Controller,
  Delete,
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
  CreateTenantSchema,
  UpdateTenantSchema,
  PaginationSchema,
  Role,
} from '@repo/shared';
import { Roles } from '../common/decorators/roles.decorator';
import { TenantsService } from './tenants.service';
import { TenantStatus } from '@repo/db';

/**
 * Tenant CRUD — Super Admin only.
 * RolesGuard will be activated in Segment 1.3.
 * For now: @Roles(Role.SUPER_ADMIN) is declared but not yet enforced.
 */
@ApiTags('Tenants (Super Admin)')
@ApiBearerAuth()
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  // POST /api/v1/tenants
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.SUPER_ADMIN)
  @UsePipes(new ZodValidationPipe(CreateTenantSchema))
  @ApiOperation({ summary: 'Create a new tenant + first TENANT_ADMIN user' })
  @ApiResponse({ status: 201, description: 'Tenant created' })
  @ApiResponse({ status: 409, description: 'Slug already taken' })
  create(@Body() body: unknown) {
    const dto = CreateTenantSchema.parse(body);
    return this.tenantsService.create(dto);
  }

  // GET /api/v1/tenants
  @Get()
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'List all tenants (paginated)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: TenantStatus })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: TenantStatus,
  ) {
    const pagination = PaginationSchema.parse({ page, limit });
    return this.tenantsService.findAll(pagination, { status });
  }

  // GET /api/v1/tenants/:id
  @Get(':id')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get a single tenant by ID' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  findOne(@Param('id') id: string) {
    return this.tenantsService.findOne(id);
  }

  // PATCH /api/v1/tenants/:id
  @Patch(':id')
  @Roles(Role.SUPER_ADMIN)
  @UsePipes(new ZodValidationPipe(UpdateTenantSchema))
  @ApiOperation({ summary: 'Update tenant name / status / plan' })
  update(@Param('id') id: string, @Body() body: unknown) {
    const dto = UpdateTenantSchema.parse(body);
    return this.tenantsService.update(id, dto);
  }

  // DELETE /api/v1/tenants/:id  (soft delete = suspend)
  @Delete(':id')
  @Roles(Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Suspend a tenant (soft delete)' })
  remove(@Param('id') id: string) {
    return this.tenantsService.remove(id);
  }
}
