import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto, UpdateCategoryDto } from '@repo/shared';
import { withTenant } from '@repo/db';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, createCategoryDto: CreateCategoryDto) {
    return this.prisma.category.create({
      data: withTenant(tenantId, createCategoryDto),
    });
  }

  async findAll(tenantId: string) {
    return this.prisma.category.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const category = await this.prisma.category.findFirst({
      where: { id, tenantId },
    });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async update(tenantId: string, id: string, updateCategoryDto: UpdateCategoryDto) {
    await this.findOne(tenantId, id);
    return this.prisma.category.update({
      where: { id, tenantId },
      data: updateCategoryDto,
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.category.delete({
      where: { id, tenantId },
    });
  }
}
