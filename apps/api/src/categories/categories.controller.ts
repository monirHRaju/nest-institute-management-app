import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto, UpdateCategoryDto, Role } from '@repo/shared';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { CreateCategorySchema, UpdateCategorySchema } from '@repo/shared';

@Controller('categories')
@Roles(Role.TENANT_ADMIN, Role.STAFF)
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  create(
    @CurrentTenant('id') tenantId: string,
    @Body(new ZodValidationPipe(CreateCategorySchema)) createCategoryDto: CreateCategoryDto,
  ) {
    return this.categoriesService.create(tenantId, createCategoryDto);
  }

  @Get()
  findAll(@CurrentTenant('id') tenantId: string) {
    return this.categoriesService.findAll(tenantId);
  }

  @Get(':id')
  findOne(@CurrentTenant('id') tenantId: string, @Param('id') id: string) {
    return this.categoriesService.findOne(tenantId, id);
  }

  @Patch(':id')
  update(
    @CurrentTenant('id') tenantId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateCategorySchema)) updateCategoryDto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(tenantId, id, updateCategoryDto);
  }

  @Delete(':id')
  remove(@CurrentTenant('id') tenantId: string, @Param('id') id: string) {
    return this.categoriesService.remove(tenantId, id);
  }
}
