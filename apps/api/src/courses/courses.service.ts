import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCourseDto, UpdateCourseDto } from '@repo/shared';
import { withTenant } from '@repo/db';

@Injectable()
export class CoursesService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, createCourseDto: CreateCourseDto) {
    return this.prisma.course.create({
      data: withTenant(tenantId, createCourseDto),
    });
  }

  async findAll(tenantId: string) {
    return this.prisma.course.findMany({
      where: { tenantId },
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const course = await this.prisma.course.findFirst({
      where: { id, tenantId },
      include: { category: true, batches: true },
    });
    if (!course) throw new NotFoundException('Course not found');
    return course;
  }

  async update(tenantId: string, id: string, updateCourseDto: UpdateCourseDto) {
    await this.findOne(tenantId, id);
    return this.prisma.course.update({
      where: { id, tenantId },
      data: updateCourseDto,
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.course.delete({
      where: { id, tenantId },
    });
  }
}
