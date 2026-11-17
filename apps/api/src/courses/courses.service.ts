import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCourseDto, UpdateCourseDto } from '@repo/shared';
import { Prisma, withTenant } from '@repo/db';

@Injectable()
export class CoursesService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, createCourseDto: CreateCourseDto) {
    return this.prisma.$transaction(async (tx) => {
      const course = await tx.course.create({
        data: withTenant(tenantId, createCourseDto),
      });

      // Automatically seed a Standard Fee Structure for the course
      if (course.fees >= 0) {
        await tx.feeStructure.create({
          data: {
            tenantId,
            courseId: course.id,
            name: 'Standard Fee',
            totalAmount: new Prisma.Decimal(course.fees),
            installmentCount: 1,
            installmentPlan: [
              {
                sequence: 1,
                percent: 100,
                amount: Number(course.fees),
                dueOffsetDays: 0,
              },
            ],
            isActive: true,
          },
        });
      }

      return course;
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
