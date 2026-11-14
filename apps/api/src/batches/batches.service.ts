import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBatchDto, UpdateBatchDto, Role } from '@repo/shared';
import { withTenant } from '@repo/db';

@Injectable()
export class BatchesService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, createBatchDto: CreateBatchDto) {
    return this.prisma.batch.create({
      data: withTenant(tenantId, createBatchDto),
    });
  }

  async findAll(tenantId: string, user: any) {
    let whereClause: any = { tenantId };
    // If instructor, only return their own batches
    const instructorUserId = user?.userId ?? user?.id;
    if (user.role === Role.INSTRUCTOR) {
      whereClause.instructorId = instructorUserId;
    }
    return this.prisma.batch.findMany({
      where: whereClause,
      include: {
        course: true,
        instructor: true,
        _count: { select: { students: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string, user: any) {
    const batch = await this.prisma.batch.findFirst({
      where: { id, tenantId },
      include: {
        course: true,
        instructor: true,
        _count: { select: { students: true } },
      },
    });
    if (!batch) throw new NotFoundException('Batch not found');
    
    // Instructor restriction
    const instructorUserId = user?.userId ?? user?.id;
    if (user.role === Role.INSTRUCTOR && batch.instructorId !== instructorUserId) {
      throw new ForbiddenException('You do not have access to this batch');
    }
    return batch;
  }

  async update(tenantId: string, id: string, updateBatchDto: UpdateBatchDto, user: any) {
    await this.findOne(tenantId, id, user);
    return this.prisma.batch.update({
      where: { id, tenantId },
      data: updateBatchDto,
    });
  }

  async remove(tenantId: string, id: string, user: any) {
    await this.findOne(tenantId, id, user);
    return this.prisma.batch.delete({
      where: { id, tenantId },
    });
  }
}
