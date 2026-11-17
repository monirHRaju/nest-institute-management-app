import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@repo/db';
import {
  AssignFeeDto,
  CreateDiscountDto,
  CreateExpenseDto,
  CreateFeeStructureDto,
  CreateInvoiceDto,
  DiscountType,
  InstallmentPlanItemDto,
  InvoiceStatus,
  PaymentMethod,
  RecordPaymentDto,
  Role,
  UpdateDiscountDto,
  UpdateExpenseDto,
  UpdateFeeStructureDto,
  UpdateInvoiceDto,
} from '@repo/shared';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../common/types/request.types';

export interface InvoiceFilterQuery {
  studentId?: string;
  batchId?: string;
  courseId?: string;
  status?: string;
  overdueOnly?: string;
  from?: string;
  to?: string;
}

export interface ExpenseFilterQuery {
  category?: string;
  month?: string; // YYYY-MM
  from?: string;
  to?: string;
}

@Injectable()
export class FeesService {
  private readonly logger = new Logger(FeesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  // ───────────────────────────────────────────────────────────────────────────
  // Helpers & Math
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Compute discount amount from base total and discount definition.
   * Clamped so discount never exceeds baseTotal and net is never negative.
   */
  computeDiscountAmount(
    baseTotal: number,
    discount?: { type: string; value: number | Prisma.Decimal } | null,
  ): { discountAmount: number; netPayable: number } {
    if (!discount) {
      return {
        discountAmount: 0,
        netPayable: Number(Math.max(0, baseTotal).toFixed(2)),
      };
    }

    const val = Number(discount.value);
    let rawDiscount = 0;

    if (discount.type === DiscountType.PERCENTAGE) {
      const clampedPct = Math.min(100, Math.max(0, val));
      rawDiscount = (baseTotal * clampedPct) / 100;
    } else {
      // FLAT or SCHOLARSHIP
      rawDiscount = Math.max(0, val);
    }

    const discountAmount = Number(
      Math.min(baseTotal, Math.max(0, rawDiscount)).toFixed(2),
    );
    const netPayable = Number(Math.max(0, baseTotal - discountAmount).toFixed(2));

    return { discountAmount, netPayable };
  }

  /**
   * Validate and normalize installment plan items against total amount & count.
   * Returns normalized plan items where amounts sum to netPayable and percents sum to 100.
   */
  buildInstallmentSchedule(
    netPayable: number,
    installmentCount: number,
    rawPlan?: InstallmentPlanItemDto[],
  ): Array<{
    sequence: number;
    percent: number;
    amount: number;
    dueOffsetDays: number;
  }> {
    const count = Math.max(1, installmentCount);

    if (!rawPlan || rawPlan.length === 0) {
      const baseShare = Math.floor((netPayable / count) * 100) / 100;
      const items: Array<{
        sequence: number;
        percent: number;
        amount: number;
        dueOffsetDays: number;
      }> = [];
      let allocated = 0;

      for (let i = 1; i <= count; i++) {
        const isLast = i === count;
        const amount = isLast
          ? Number((netPayable - allocated).toFixed(2))
          : baseShare;
        allocated = Number((allocated + amount).toFixed(2));
        const percent =
          netPayable > 0
            ? Number(((amount / netPayable) * 100).toFixed(2))
            : Number((100 / count).toFixed(2));
        items.push({
          sequence: i,
          percent,
          amount,
          dueOffsetDays: (i - 1) * 30,
        });
      }
      return items;
    }

    // Validate custom installment plan
    const sorted = [...rawPlan].sort((a, b) => a.sequence - b.sequence);
    const hasPercent = sorted.every((i) => i.percent !== undefined && i.percent > 0);
    const hasAmount = sorted.every((i) => i.amount !== undefined && i.amount >= 0);

    if (hasPercent) {
      const totalPct = sorted.reduce((acc, i) => acc + Number(i.percent || 0), 0);
      if (Math.abs(totalPct - 100) > 0.5) {
        throw new BadRequestException(
          `Installment percentages must sum to 100% (currently ${totalPct.toFixed(2)}%)`,
        );
      }

      let allocated = 0;
      return sorted.map((item, idx) => {
        const isLast = idx === sorted.length - 1;
        const pct = Number(item.percent || 0);
        const amount = isLast
          ? Number((netPayable - allocated).toFixed(2))
          : Number(((netPayable * pct) / 100).toFixed(2));
        allocated = Number((allocated + amount).toFixed(2));
        return {
          sequence: idx + 1,
          percent: pct,
          amount,
          dueOffsetDays: item.dueOffsetDays ?? idx * 30,
        };
      });
    }

    if (hasAmount) {
      const sumAmt = sorted.reduce((acc, i) => acc + Number(i.amount || 0), 0);
      if (netPayable > 0 && Math.abs(sumAmt - netPayable) > 1) {
        // Scale proportionally if netPayable differs (e.g. after discount or override)
        let allocated = 0;
        return sorted.map((item, idx) => {
          const isLast = idx === sorted.length - 1;
          const ratio = sumAmt > 0 ? Number(item.amount || 0) / sumAmt : 1 / sorted.length;
          const amount = isLast
            ? Number((netPayable - allocated).toFixed(2))
            : Number((netPayable * ratio).toFixed(2));
          allocated = Number((allocated + amount).toFixed(2));
          return {
            sequence: idx + 1,
            percent: Number((ratio * 100).toFixed(2)),
            amount,
            dueOffsetDays: item.dueOffsetDays ?? idx * 30,
          };
        });
      }

      return sorted.map((item, idx) => {
        const amt = Number(item.amount || 0);
        return {
          sequence: idx + 1,
          percent:
            netPayable > 0
              ? Number(((amt / netPayable) * 100).toFixed(2))
              : Number((100 / sorted.length).toFixed(2)),
          amount: amt,
          dueOffsetDays: item.dueOffsetDays ?? idx * 30,
        };
      });
    }

    throw new BadRequestException(
      'Each installment item must specify either a valid percent or amount',
    );
  }

  private async nextInvoiceNumber(
    tx: Prisma.TransactionClient,
    tenantId: string,
    offset = 0,
  ): Promise<string> {
    const year = new Date().getFullYear();
    const count = await tx.feeInvoice.count({ where: { tenantId } });
    const seq = String(count + 1 + offset).padStart(4, '0');
    return `INV-${year}-${seq}`;
  }

  private async nextReceiptNumber(
    tx: Prisma.TransactionClient,
    tenantId: string,
  ): Promise<string> {
    const year = new Date().getFullYear();
    const count = await tx.payment.count({ where: { tenantId } });
    const seq = String(count + 1).padStart(4, '0');
    return `RCP-${year}-${seq}`;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Segment 3.1: Fee Structures & Discounts & Assignments
  // ───────────────────────────────────────────────────────────────────────────

  async findAllStructures(
    tenantId: string,
    courseId?: string,
  ): Promise<any[]> {
    if (!tenantId) throw new BadRequestException('Tenant context is required');

    return this.prisma.feeStructure.findMany({
      where: {
        tenantId,
        ...(courseId ? { courseId } : {}),
      },
      include: {
        course: {
          select: { id: true, name: true, fees: true },
        },
        _count: {
          select: { assignments: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createStructure(
    tenantId: string,
    dto: CreateFeeStructureDto,
  ): Promise<any> {
    if (!tenantId) throw new BadRequestException('Tenant context is required');

    const course = await this.prisma.course.findFirst({
      where: { id: dto.courseId, tenantId },
    });
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const schedule = this.buildInstallmentSchedule(
      dto.totalAmount,
      dto.installmentCount,
      dto.installmentPlan,
    );

    try {
      return await this.prisma.feeStructure.create({
        data: {
          tenantId,
          courseId: dto.courseId,
          name: dto.name.trim(),
          totalAmount: new Prisma.Decimal(dto.totalAmount),
          installmentCount: schedule.length,
          installmentPlan: schedule as unknown as Prisma.InputJsonValue,
          isActive: dto.isActive ?? true,
        },
        include: {
          course: { select: { id: true, name: true, fees: true } },
        },
      });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        throw new BadRequestException(
          'A fee structure with this name already exists for this course',
        );
      }
      throw e;
    }
  }

  async updateStructure(
    tenantId: string,
    id: string,
    dto: UpdateFeeStructureDto,
  ): Promise<any> {
    const existing = await this.prisma.feeStructure.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      throw new NotFoundException('Fee structure not found');
    }

    const totalAmount =
      dto.totalAmount !== undefined
        ? dto.totalAmount
        : Number(existing.totalAmount);
    const installmentCount =
      dto.installmentCount !== undefined
        ? dto.installmentCount
        : existing.installmentCount;

    const schedule =
      dto.installmentPlan !== undefined ||
      dto.totalAmount !== undefined ||
      dto.installmentCount !== undefined
        ? this.buildInstallmentSchedule(
            totalAmount,
            installmentCount,
            dto.installmentPlan ??
              (existing.installmentPlan as unknown as InstallmentPlanItemDto[]),
          )
        : undefined;

    return this.prisma.feeStructure.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.courseId !== undefined ? { courseId: dto.courseId } : {}),
        ...(dto.totalAmount !== undefined
          ? { totalAmount: new Prisma.Decimal(dto.totalAmount) }
          : {}),
        ...(schedule
          ? {
              installmentCount: schedule.length,
              installmentPlan: schedule as unknown as Prisma.InputJsonValue,
            }
          : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
      include: {
        course: { select: { id: true, name: true, fees: true } },
      },
    });
  }

  async deleteStructure(tenantId: string, id: string) {
    const existing = await this.prisma.feeStructure.findFirst({
      where: { id, tenantId },
      include: { _count: { select: { assignments: true } } },
    });
    if (!existing) {
      throw new NotFoundException('Fee structure not found');
    }
    if (existing._count.assignments > 0) {
      throw new BadRequestException(
        'Cannot delete fee structure assigned to students. Deactivate it instead.',
      );
    }
    await this.prisma.feeStructure.delete({ where: { id } });
    return { success: true };
  }

  // ── Discounts ──────────────────────────────────────────────────────────────

  async findAllDiscounts(tenantId: string): Promise<any[]> {
    if (!tenantId) throw new BadRequestException('Tenant context is required');
    return this.prisma.discount.findMany({
      where: { tenantId },
      include: {
        student: {
          include: {
            user: { select: { firstName: true, lastName: true, phone: true } },
          },
        },
        approvedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createDiscount(
    tenantId: string,
    user: AuthUser,
    dto: CreateDiscountDto,
  ): Promise<any> {
    if (!tenantId) throw new BadRequestException('Tenant context is required');

    if (dto.type === DiscountType.PERCENTAGE && dto.value > 100) {
      throw new BadRequestException('Percentage discount cannot exceed 100%');
    }

    return this.prisma.discount.create({
      data: {
        tenantId,
        title: dto.title.trim(),
        type: dto.type,
        value: new Prisma.Decimal(dto.value),
        reason: dto.reason?.trim() || null,
        studentId: dto.studentId || null,
        approvedById: user.userId,
        isActive: dto.isActive ?? true,
      },
      include: {
        approvedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async updateDiscount(
    tenantId: string,
    id: string,
    dto: UpdateDiscountDto,
  ): Promise<any> {
    const existing = await this.prisma.discount.findFirst({
      where: { id, tenantId },
    });
    if (!existing) throw new NotFoundException('Discount not found');

    return this.prisma.discount.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(dto.value !== undefined
          ? { value: new Prisma.Decimal(dto.value) }
          : {}),
        ...(dto.reason !== undefined ? { reason: dto.reason } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
  }

  async deleteDiscount(tenantId: string, id: string) {
    const existing = await this.prisma.discount.findFirst({
      where: { id, tenantId },
    });
    if (!existing) throw new NotFoundException('Discount not found');
    await this.prisma.discount.delete({ where: { id } });
    return { success: true };
  }

  // ── Assign Fee Structure to Student & Auto-Generate Invoices ───────────────

  async assignFeeToStudent(
    tenantId: string,
    studentId: string,
    user: AuthUser,
    dto: AssignFeeDto,
  ): Promise<any> {
    if (!tenantId) throw new BadRequestException('Tenant context is required');

    const student = await this.prisma.student.findFirst({
      where: { id: studentId, tenantId },
    });
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const structure = await this.prisma.feeStructure.findFirst({
      where: { id: dto.structureId, tenantId },
      include: { course: true },
    });
    if (!structure) {
      throw new NotFoundException('Fee structure not found');
    }

    return this.prisma.$transaction(async (tx) => {
      return this.assignFeeInTransaction(tx, tenantId, studentId, user.userId, dto);
    });
  }

  async assignFeeInTransaction(
    tx: Prisma.TransactionClient,
    tenantId: string,
    studentId: string,
    actorUserId: string | undefined,
    dto: AssignFeeDto,
  ): Promise<any> {
    const structure = await tx.feeStructure.findFirst({
      where: { id: dto.structureId, tenantId },
      include: { course: true },
    });
    if (!structure) {
      throw new NotFoundException('Fee structure not found');
    }

    let discountId = dto.discountId || null;
    let discountRecord: { type: string; value: Prisma.Decimal | number } | null =
      null;

    if (discountId) {
      const found = await tx.discount.findFirst({
        where: { id: discountId, tenantId },
      });
      if (!found) {
        throw new NotFoundException('Discount not found');
      }
      discountRecord = found;
    } else if (
      dto.customDiscountType &&
      dto.customDiscountValue &&
      dto.customDiscountValue > 0
    ) {
      const createdDiscount = await tx.discount.create({
        data: {
          tenantId,
          title: dto.customDiscountReason?.trim() || `${dto.customDiscountType} Discount`,
          type: dto.customDiscountType,
          value: new Prisma.Decimal(dto.customDiscountValue),
          reason: dto.customDiscountReason?.trim() || null,
          studentId,
          approvedById: actorUserId || null,
        },
      });
      discountId = createdDiscount.id;
      discountRecord = createdDiscount;
    }

    const baseTotal =
      dto.overrideTotal !== undefined
        ? dto.overrideTotal
        : Number(structure.totalAmount);

    const { discountAmount, netPayable } = this.computeDiscountAmount(
      baseTotal,
      discountRecord,
    );

    const assignment = await tx.studentFeeAssignment.create({
      data: {
        tenantId,
        studentId,
        structureId: structure.id,
        discountId,
        overrideTotal:
          dto.overrideTotal !== undefined
            ? new Prisma.Decimal(dto.overrideTotal)
            : null,
        discountAmount: new Prisma.Decimal(discountAmount),
        netPayable: new Prisma.Decimal(netPayable),
        note: dto.note?.trim() || null,
      },
      include: {
        structure: { include: { course: true } },
        discount: true,
      },
    });

    const invoices = [];
    if (dto.generateInvoices !== false && netPayable > 0) {
      const rawPlan = Array.isArray(structure.installmentPlan)
        ? (structure.installmentPlan as unknown as InstallmentPlanItemDto[])
        : [];
      const schedule = this.buildInstallmentSchedule(
        netPayable,
        structure.installmentCount,
        rawPlan,
      );

      // Distribute discount proportionally for invoice metadata
      let discountAllocated = 0;
      for (let i = 0; i < schedule.length; i++) {
        const item = schedule[i]!;
        const isLast = i === schedule.length - 1;
        const itemDiscount = isLast
          ? Number((discountAmount - discountAllocated).toFixed(2))
          : Number(((discountAmount * item.percent) / 100).toFixed(2));
        discountAllocated = Number((discountAllocated + itemDiscount).toFixed(2));

        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + (item.dueOffsetDays ?? i * 30));

        const invoiceNo = await this.nextInvoiceNumber(tx, tenantId, i);
        const inv = await tx.feeInvoice.create({
          data: {
            tenantId,
            invoiceNo,
            title:
              schedule.length > 1
                ? `${structure.course.name} — Installment ${item.sequence}/${schedule.length}`
                : `${structure.course.name} — Course Fee`,
            installmentNo: item.sequence,
            amount: new Prisma.Decimal(item.amount),
            discount: new Prisma.Decimal(itemDiscount),
            paidAmount: new Prisma.Decimal(0),
            dueDate,
            status: InvoiceStatus.UNPAID,
            studentId,
            assignmentId: assignment.id,
          },
        });
        invoices.push(inv);
      }
    }

    return { assignment, invoices };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Segment 3.2: Invoicing, Manual Payments, SSLCommerz & PDF Data
  // ───────────────────────────────────────────────────────────────────────────

  async refreshOverdueStatuses(tenantId?: string) {
    const now = new Date();
    const where: Prisma.FeeInvoiceWhereInput = {
      ...(tenantId ? { tenantId } : {}),
      dueDate: { lt: now },
      status: { in: [InvoiceStatus.UNPAID, InvoiceStatus.PARTIALLY_PAID] },
    };

    const res = await this.prisma.feeInvoice.updateMany({
      where,
      data: { status: InvoiceStatus.OVERDUE },
    });
    return res.count;
  }

  async findAllInvoices(
    tenantId: string,
    user: AuthUser,
    query: InvoiceFilterQuery,
  ): Promise<any[]> {
    if (!tenantId) throw new BadRequestException('Tenant context is required');

    // Keep overdue flags fresh on query
    await this.refreshOverdueStatuses(tenantId);

    const where: Prisma.FeeInvoiceWhereInput = { tenantId };

    if (user.role === Role.STUDENT) {
      const student = await this.prisma.student.findFirst({
        where: { userId: user.userId, tenantId },
      });
      if (!student) return [];
      where.studentId = student.id;
    } else if (query.studentId) {
      where.studentId = query.studentId;
    }

    if (query.batchId || query.courseId) {
      where.student = {
        ...(query.batchId ? { batchId: query.batchId } : {}),
        ...(query.courseId ? { batch: { courseId: query.courseId } } : {}),
      };
    }

    if (query.overdueOnly === 'true') {
      where.status = InvoiceStatus.OVERDUE;
    } else if (query.status && query.status !== 'ALL') {
      where.status = query.status as InvoiceStatus;
    }

    if (query.from || query.to) {
      where.dueDate = {
        ...(query.from ? { gte: new Date(query.from) } : {}),
        ...(query.to ? { lte: new Date(query.to) } : {}),
      };
    }

    return this.prisma.feeInvoice.findMany({
      where,
      include: {
        student: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
              },
            },
            batch: {
              include: {
                course: { select: { id: true, name: true } },
              },
            },
          },
        },
        assignment: {
          include: {
            structure: { select: { id: true, name: true } },
          },
        },
        payments: {
          orderBy: { paidAt: 'desc' },
        },
        smsReminders: {
          orderBy: { sentAt: 'desc' },
          take: 3,
        },
      },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async findOneInvoice(
    tenantId: string,
    id: string,
    user: AuthUser,
  ): Promise<any> {
    if (!tenantId) throw new BadRequestException('Tenant context is required');

    const invoice = await this.prisma.feeInvoice.findFirst({
      where: { id, tenantId },
      include: {
        tenant: {
          select: { id: true, name: true, slug: true, themeConfig: true },
        },
        student: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
              },
            },
            batch: {
              include: { course: true },
            },
          },
        },
        assignment: {
          include: {
            structure: true,
            discount: true,
          },
        },
        payments: {
          include: {
            receivedBy: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
          orderBy: { paidAt: 'desc' },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (
      user.role === Role.STUDENT &&
      invoice.student.userId !== user.userId
    ) {
      throw new ForbiddenException('You do not have access to this invoice');
    }

    return invoice;
  }

  async createInvoice(
    tenantId: string,
    dto: CreateInvoiceDto,
  ): Promise<any> {
    if (!tenantId) throw new BadRequestException('Tenant context is required');

    const student = await this.prisma.student.findFirst({
      where: { id: dto.studentId, tenantId },
      include: { batch: { include: { course: true } } },
    });
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return this.prisma.$transaction(async (tx) => {
      const invoiceNo = await this.nextInvoiceNumber(tx, tenantId);
      const dueDate = new Date(dto.dueDate);
      const isOverdue = dueDate < new Date();

      return tx.feeInvoice.create({
        data: {
          tenantId,
          invoiceNo,
          studentId: dto.studentId,
          assignmentId: dto.assignmentId || null,
          title:
            dto.title?.trim() ||
            (student.batch?.course?.name
              ? `${student.batch.course.name} — Fee Invoice`
              : 'Fee Invoice'),
          installmentNo: dto.installmentNo ?? 1,
          amount: new Prisma.Decimal(dto.amount),
          discount: new Prisma.Decimal(dto.discount ?? 0),
          paidAmount: new Prisma.Decimal(0),
          dueDate,
          status: isOverdue ? InvoiceStatus.OVERDUE : InvoiceStatus.UNPAID,
        },
        include: {
          student: {
            include: {
              user: {
                select: { firstName: true, lastName: true, phone: true },
              },
            },
          },
        },
      });
    });
  }

  async updateInvoice(
    tenantId: string,
    id: string,
    dto: UpdateInvoiceDto,
  ): Promise<any> {
    const existing = await this.prisma.feeInvoice.findFirst({
      where: { id, tenantId },
    });
    if (!existing) throw new NotFoundException('Invoice not found');

    const newAmount =
      dto.amount !== undefined ? dto.amount : Number(existing.amount);
    const paid = Number(existing.paidAmount);

    if (newAmount < paid) {
      throw new BadRequestException(
        `Invoice amount (৳${newAmount}) cannot be less than already paid amount (৳${paid})`,
      );
    }

    let status = dto.status ?? existing.status;
    if (!dto.status) {
      if (paid >= newAmount) {
        status = InvoiceStatus.PAID;
      } else if (paid > 0) {
        status = InvoiceStatus.PARTIALLY_PAID;
      } else if (
        (dto.dueDate ? new Date(dto.dueDate) : existing.dueDate) < new Date()
      ) {
        status = InvoiceStatus.OVERDUE;
      } else {
        status = InvoiceStatus.UNPAID;
      }
    }

    return this.prisma.feeInvoice.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.amount !== undefined
          ? { amount: new Prisma.Decimal(dto.amount) }
          : {}),
        ...(dto.discount !== undefined
          ? { discount: new Prisma.Decimal(dto.discount) }
          : {}),
        ...(dto.dueDate !== undefined
          ? { dueDate: new Date(dto.dueDate) }
          : {}),
        status,
      },
    });
  }

  // ── Manual & Online Payments ───────────────────────────────────────────────

  async recordPayment(
    tenantId: string,
    user: AuthUser,
    dto: RecordPaymentDto,
  ): Promise<any> {
    if (!tenantId) throw new BadRequestException('Tenant context is required');

    return this.prisma.$transaction(async (tx) => {
      const invoice = await tx.feeInvoice.findFirst({
        where: { id: dto.invoiceId, tenantId },
      });
      if (!invoice) {
        throw new NotFoundException('Invoice not found');
      }
      if (invoice.status === InvoiceStatus.CANCELLED) {
        throw new BadRequestException('Cannot record payment on a cancelled invoice');
      }

      const totalAmount = Number(invoice.amount);
      const currentPaid = Number(invoice.paidAmount);
      const dueBalance = Number((totalAmount - currentPaid).toFixed(2));

      if (dto.amount > dueBalance + 0.01) {
        throw new BadRequestException(
          `Payment amount (৳${dto.amount}) exceeds remaining balance (৳${dueBalance})`,
        );
      }

      const newPaid = Number((currentPaid + dto.amount).toFixed(2));
      const newStatus =
        newPaid >= totalAmount - 0.01
          ? InvoiceStatus.PAID
          : InvoiceStatus.PARTIALLY_PAID;

      const receiptNo = await this.nextReceiptNumber(tx, tenantId);

      const payment = await tx.payment.create({
        data: {
          tenantId,
          receiptNo,
          invoiceId: invoice.id,
          amount: new Prisma.Decimal(dto.amount),
          method: dto.method,
          reference: dto.reference?.trim() || null,
          note: dto.note?.trim() || null,
          status: 'COMPLETED',
          receivedById: user.userId,
          paidAt: dto.paidAt ? new Date(dto.paidAt) : new Date(),
        },
        include: {
          receivedBy: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      });

      const updatedInvoice = await tx.feeInvoice.update({
        where: { id: invoice.id },
        data: {
          paidAmount: new Prisma.Decimal(newPaid),
          status: newStatus,
        },
      });

      return { payment, invoice: updatedInvoice };
    });
  }

  async voidPayment(tenantId: string, paymentId: string): Promise<any> {
    if (!tenantId) throw new BadRequestException('Tenant context is required');

    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findFirst({
        where: { id: paymentId, tenantId },
        include: { invoice: true },
      });
      if (!payment) {
        throw new NotFoundException('Payment not found');
      }
      if (payment.status === 'VOIDED') {
        throw new BadRequestException('Payment is already voided');
      }

      const currentPaid = Number(payment.invoice.paidAmount);
      const voidAmt = Number(payment.amount);
      const newPaid = Math.max(0, Number((currentPaid - voidAmt).toFixed(2)));
      const totalAmount = Number(payment.invoice.amount);

      let newStatus: InvoiceStatus = InvoiceStatus.UNPAID;
      if (newPaid >= totalAmount - 0.01) {
        newStatus = InvoiceStatus.PAID;
      } else if (newPaid > 0) {
        newStatus = InvoiceStatus.PARTIALLY_PAID;
      } else if (payment.invoice.dueDate < new Date()) {
        newStatus = InvoiceStatus.OVERDUE;
      }

      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: { status: 'VOIDED' },
      });

      const updatedInvoice = await tx.feeInvoice.update({
        where: { id: payment.invoiceId },
        data: {
          paidAmount: new Prisma.Decimal(newPaid),
          status: newStatus,
        },
      });

      return { payment: updatedPayment, invoice: updatedInvoice };
    });
  }

  async findAllPayments(
    tenantId: string,
    studentId?: string,
  ): Promise<any[]> {
    if (!tenantId) throw new BadRequestException('Tenant context is required');

    return this.prisma.payment.findMany({
      where: {
        tenantId,
        ...(studentId ? { invoice: { studentId } } : {}),
      },
      include: {
        invoice: {
          include: {
            student: {
              include: {
                user: { select: { firstName: true, lastName: true, phone: true } },
              },
            },
          },
        },
        receivedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { paidAt: 'desc' },
    });
  }

  async getStudentLedger(
    tenantId: string,
    studentId: string,
    user: AuthUser,
  ): Promise<any> {
    if (!tenantId) throw new BadRequestException('Tenant context is required');

    const student = await this.prisma.student.findFirst({
      where: { id: studentId, tenantId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        batch: {
          include: { course: true },
        },
        feeAssignments: {
          include: {
            structure: true,
            discount: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        feeInvoices: {
          include: {
            payments: {
              orderBy: { paidAt: 'desc' },
            },
          },
          orderBy: { dueDate: 'asc' },
        },
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    if (user.role === Role.STUDENT && student.userId !== user.userId) {
      throw new ForbiddenException('You can only view your own fee ledger');
    }

    const activeInvoices = student.feeInvoices.filter(
      (i) => i.status !== InvoiceStatus.CANCELLED,
    );
    const totalBilled = activeInvoices.reduce(
      (acc, i) => acc + Number(i.amount),
      0,
    );
    const totalDiscount = activeInvoices.reduce(
      (acc, i) => acc + Number(i.discount),
      0,
    );
    const totalPaid = activeInvoices.reduce(
      (acc, i) => acc + Number(i.paidAmount),
      0,
    );
    const totalDue = Math.max(0, Number((totalBilled - totalPaid).toFixed(2)));

    return {
      student,
      summary: {
        totalBilled: Number(totalBilled.toFixed(2)),
        totalDiscount: Number(totalDiscount.toFixed(2)),
        totalPaid: Number(totalPaid.toFixed(2)),
        totalDue,
      },
    };
  }

  // ── SSLCommerz Online Payment Link & IPN Webhook ───────────────────────────

  async createSslCommerzPaymentSession(
    tenantId: string,
    invoiceId: string,
    user: AuthUser,
  ) {
    const invoice = await this.findOneInvoice(tenantId, invoiceId, user);
    const dueBalance = Number(
      (Number(invoice.amount) - Number(invoice.paidAmount)).toFixed(2),
    );

    if (dueBalance <= 0) {
      throw new BadRequestException('This invoice is already paid in full');
    }

    const tranId = `SSLCZ-${invoice.invoiceNo}-${Date.now()}`;
    const storeId = this.config.get<string>('SSLCOMMERZ_STORE_ID');
    const storePass = this.config.get<string>('SSLCOMMERZ_STORE_PASSWORD');
    const isLive = this.config.get<string>('SSLCOMMERZ_IS_LIVE') === 'true';
    const adminUrl =
      this.config.get<string>('ADMIN_APP_URL') || 'http://localhost:3000';

    // If real SSLCommerz credentials are configured, attempt live/sandbox init
    if (storeId && storePass && storeId !== 'sandbox_store_id') {
      const initUrl = isLive
        ? 'https://securepay.sslcommerz.com/gwprocess/v4/api.php'
        : 'https://sandbox.sslcommerz.com/gwprocess/v4/api.php';

      const params = new URLSearchParams({
        store_id: storeId,
        store_passwd: storePass,
        total_amount: String(dueBalance),
        currency: 'BDT',
        tran_id: tranId,
        success_url: `${adminUrl}/dashboard/fees?payment=success&invoiceId=${invoice.id}`,
        fail_url: `${adminUrl}/dashboard/fees?payment=failed&invoiceId=${invoice.id}`,
        cancel_url: `${adminUrl}/dashboard/fees?payment=cancelled&invoiceId=${invoice.id}`,
        ipn_url: `${this.config.get<string>('API_PUBLIC_URL') || 'http://localhost:3001'}/api/v1/fees/sslcommerz/ipn`,
        cus_name: `${invoice.student.user.firstName} ${invoice.student.user.lastName}`,
        cus_email: invoice.student.user.email,
        cus_phone: invoice.student.user.phone || '01700000000',
        cus_add1: invoice.student.address || 'Dhaka, Bangladesh',
        cus_city: 'Dhaka',
        cus_country: 'Bangladesh',
        shipping_method: 'NO',
        product_name: invoice.title || invoice.invoiceNo,
        product_category: 'Education',
        product_profile: 'non-physical-goods',
        value_a: tenantId,
        value_b: invoice.id,
      });

      try {
        const res = await fetch(initUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString(),
        });
        const data = (await res.json()) as {
          status?: string;
          GatewayPageURL?: string;
          failedreason?: string;
        };
        if (data.status === 'SUCCESS' && data.GatewayPageURL) {
          return {
            mode: isLive ? 'LIVE' : 'SANDBOX',
            tranId,
            amount: dueBalance,
            currency: 'BDT',
            gatewayUrl: data.GatewayPageURL,
          };
        }
      } catch (err) {
        this.logger.warn(`SSLCommerz gateway call failed, falling back to sandbox simulator: ${err}`);
      }
    }

    // Built-in Sandbox Simulator URL for local/dev testing without external keys
    return {
      mode: 'SANDBOX_SIMULATOR',
      tranId,
      invoiceId: invoice.id,
      invoiceNo: invoice.invoiceNo,
      amount: dueBalance,
      currency: 'BDT',
      gatewayUrl: `${adminUrl}/dashboard/fees?simulateSslCommerz=${invoice.id}&tranId=${tranId}&amount=${dueBalance}`,
    };
  }

  /**
   * Idempotent SSLCommerz IPN / Sandbox confirmation handler.
   */
  async handleSslCommerzIpn(payload: {
    tran_id: string;
    val_id?: string;
    amount: string | number;
    currency?: string;
    status: string;
    value_a?: string; // tenantId
    value_b?: string; // invoiceId
  }): Promise<any> {
    if (!payload.tran_id) {
      throw new BadRequestException('Missing tran_id');
    }

    if (!['VALID', 'VALIDATED'].includes(payload.status)) {
      return {
        processed: false,
        reason: `Ignored non-valid status: ${payload.status}`,
      };
    }

    if (payload.currency && payload.currency !== 'BDT') {
      throw new BadRequestException('Invalid currency, expected BDT');
    }

    return this.prisma.$transaction(async (tx) => {
      // Idempotency check: has this tran_id already been recorded?
      const existingPayment = await tx.payment.findFirst({
        where: { tranId: payload.tran_id, status: 'COMPLETED' },
        include: { invoice: true },
      });

      if (existingPayment) {
        return {
          processed: true,
          idempotent: true,
          payment: existingPayment,
          invoice: existingPayment.invoice,
        };
      }

      const invoice = payload.value_b
        ? await tx.feeInvoice.findFirst({
            where: {
              id: payload.value_b,
              ...(payload.value_a ? { tenantId: payload.value_a } : {}),
            },
          })
        : null;

      if (!invoice) {
        throw new NotFoundException('Target invoice not found for IPN');
      }

      const paidAmt = Number(payload.amount);
      if (isNaN(paidAmt) || paidAmt <= 0) {
        throw new BadRequestException('Invalid payment amount');
      }

      const currentPaid = Number(invoice.paidAmount);
      const totalAmount = Number(invoice.amount);
      const newPaid = Math.min(
        totalAmount,
        Number((currentPaid + paidAmt).toFixed(2)),
      );
      const newStatus =
        newPaid >= totalAmount - 0.01
          ? InvoiceStatus.PAID
          : InvoiceStatus.PARTIALLY_PAID;

      const receiptNo = await this.nextReceiptNumber(tx, invoice.tenantId);

      const payment = await tx.payment.create({
        data: {
          tenantId: invoice.tenantId,
          receiptNo,
          invoiceId: invoice.id,
          amount: new Prisma.Decimal(paidAmt),
          method: PaymentMethod.SSLCOMMERZ,
          tranId: payload.tran_id,
          reference: payload.val_id || payload.tran_id,
          status: 'COMPLETED',
          note: 'Online Payment via SSLCommerz',
          paidAt: new Date(),
        },
      });

      const updatedInvoice = await tx.feeInvoice.update({
        where: { id: invoice.id },
        data: {
          paidAmount: new Prisma.Decimal(newPaid),
          status: newStatus,
        },
      });

      return {
        processed: true,
        idempotent: false,
        payment,
        invoice: updatedInvoice,
      };
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Segment 3.3: Dues Tracking, SMS Reminders, Expenses & Revenue Dashboard
  // ───────────────────────────────────────────────────────────────────────────

  async sendOverdueSmsReminder(tenantId: string, invoiceId: string) {
    if (!tenantId) throw new BadRequestException('Tenant context is required');

    const invoice = await this.prisma.feeInvoice.findFirst({
      where: { id: invoiceId, tenantId },
      include: {
        tenant: true,
        student: {
          include: { user: true },
        },
        smsReminders: {
          orderBy: { sentAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    const phone = invoice.student.user.phone || invoice.student.guardianPhone;
    if (!phone) {
      throw new BadRequestException('Student has no phone number on file');
    }

    // Rate limit: 1 reminder per hour per invoice
    const lastReminder = invoice.smsReminders[0];
    if (
      lastReminder &&
      Date.now() - new Date(lastReminder.sentAt).getTime() < 60 * 60 * 1000
    ) {
      throw new BadRequestException(
        'An SMS reminder was already sent for this invoice within the last hour',
      );
    }

    const dueAmt = (
      Number(invoice.amount) - Number(invoice.paidAmount)
    ).toLocaleString('en-BD');
    const dueDateStr = new Date(invoice.dueDate).toLocaleDateString('en-GB');
    const message = `Dear ${invoice.student.user.firstName}, your fee due of BDT ${dueAmt} for ${invoice.invoiceNo} (${invoice.tenant.name}) was due on ${dueDateStr}. Please pay promptly.`;

    const token = this.config.get<string>('GREENWEB_SMS_TOKEN');
    let status = 'STUBBED';

    if (token && token !== 'your_greenweb_token') {
      try {
        const url = `http://api.greenweb.com.bd/api.php?token=${encodeURIComponent(token)}&to=${encodeURIComponent(phone)}&message=${encodeURIComponent(message)}`;
        const res = await fetch(url);
        status = res.ok ? 'SENT' : 'FAILED';
      } catch (e) {
        this.logger.warn(`Green Web BD SMS dispatch failed: ${e}`);
        status = 'FAILED';
      }
    } else {
      this.logger.log(`[SMS-STUB -> ${phone}]: ${message}`);
    }

    return this.prisma.smsReminderLog.create({
      data: {
        tenantId,
        invoiceId: invoice.id,
        phone,
        message,
        status,
        provider: 'GREENWEB_BD',
      },
    });
  }

  // ── Expense Ledger ─────────────────────────────────────────────────────────

  async findAllExpenses(
    tenantId: string,
    query: ExpenseFilterQuery,
  ): Promise<any[]> {
    if (!tenantId) throw new BadRequestException('Tenant context is required');

    const where: Prisma.ExpenseWhereInput = { tenantId };

    if (query.category && query.category !== 'ALL') {
      where.category = query.category as any;
    }

    if (query.month && /^\d{4}-\d{2}$/.test(query.month)) {
      const [yearStr, monthStr] = query.month.split('-');
      const year = Number(yearStr);
      const month = Number(monthStr);
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0, 23, 59, 59, 999);
      where.date = { gte: start, lte: end };
    } else if (query.from || query.to) {
      where.date = {
        ...(query.from ? { gte: new Date(query.from) } : {}),
        ...(query.to ? { lte: new Date(query.to) } : {}),
      };
    }

    return this.prisma.expense.findMany({
      where,
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { date: 'desc' },
    });
  }

  async createExpense(
    tenantId: string,
    user: AuthUser,
    dto: CreateExpenseDto,
  ): Promise<any> {
    if (!tenantId) throw new BadRequestException('Tenant context is required');

    return this.prisma.expense.create({
      data: {
        tenantId,
        title: dto.title.trim(),
        category: dto.category,
        amount: new Prisma.Decimal(dto.amount),
        date: dto.date ? new Date(dto.date) : new Date(),
        note: dto.note?.trim() || null,
        createdById: user.userId,
      },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async updateExpense(
    tenantId: string,
    id: string,
    dto: UpdateExpenseDto,
  ): Promise<any> {
    const existing = await this.prisma.expense.findFirst({
      where: { id, tenantId },
    });
    if (!existing) throw new NotFoundException('Expense not found');

    return this.prisma.expense.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.category !== undefined ? { category: dto.category } : {}),
        ...(dto.amount !== undefined
          ? { amount: new Prisma.Decimal(dto.amount) }
          : {}),
        ...(dto.date !== undefined ? { date: new Date(dto.date) } : {}),
        ...(dto.note !== undefined ? { note: dto.note } : {}),
      },
    });
  }

  async deleteExpense(tenantId: string, id: string) {
    const existing = await this.prisma.expense.findFirst({
      where: { id, tenantId },
    });
    if (!existing) throw new NotFoundException('Expense not found');
    await this.prisma.expense.delete({ where: { id } });
    return { success: true };
  }

  // ── Revenue & P&L Dashboard Summary ────────────────────────────────────────

  async getRevenueDashboard(
    tenantId: string,
    query?: { from?: string; to?: string },
  ) {
    if (!tenantId) throw new BadRequestException('Tenant context is required');

    await this.refreshOverdueStatuses(tenantId);

    const dateFilter =
      query?.from || query?.to
        ? {
            ...(query.from ? { gte: new Date(query.from) } : {}),
            ...(query.to ? { lte: new Date(query.to) } : {}),
          }
        : undefined;

    const [
      invoices,
      payments,
      expenses,
      totalStudents,
      activeCourses,
      activeBatches,
    ] = await Promise.all([
      this.prisma.feeInvoice.findMany({
        where: {
          tenantId,
          status: { not: InvoiceStatus.CANCELLED },
          ...(dateFilter ? { createdAt: dateFilter } : {}),
        },
        select: {
          id: true,
          amount: true,
          paidAmount: true,
          discount: true,
          status: true,
          dueDate: true,
        },
      }),
      this.prisma.payment.findMany({
        where: {
          tenantId,
          status: 'COMPLETED',
          ...(dateFilter ? { paidAt: dateFilter } : {}),
        },
        select: {
          amount: true,
          paidAt: true,
          method: true,
        },
      }),
      this.prisma.expense.findMany({
        where: {
          tenantId,
          ...(dateFilter ? { date: dateFilter } : {}),
        },
        select: {
          amount: true,
          category: true,
          date: true,
        },
      }),
      this.prisma.student.count({ where: { tenantId } }),
      this.prisma.course.count({ where: { tenantId } }),
      this.prisma.batch.count({ where: { tenantId } }),
    ]);

    const totalBilled = invoices.reduce((s, i) => s + Number(i.amount), 0);
    const totalCollected = payments.reduce((s, p) => s + Number(p.amount), 0);
    const pendingDues = invoices.reduce(
      (s, i) => s + Math.max(0, Number(i.amount) - Number(i.paidAmount)),
      0,
    );
    const overdueInvoices = invoices.filter(
      (i) => i.status === InvoiceStatus.OVERDUE,
    );
    const overdueDues = overdueInvoices.reduce(
      (s, i) => s + Math.max(0, Number(i.amount) - Number(i.paidAmount)),
      0,
    );
    const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
    const netProfit = totalCollected - totalExpenses;

    // Current month metrics
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyCollected = payments
      .filter((p) => new Date(p.paidAt) >= monthStart)
      .reduce((s, p) => s + Number(p.amount), 0);
    const monthlyExpenses = expenses
      .filter((e) => new Date(e.date) >= monthStart)
      .reduce((s, e) => s + Number(e.amount), 0);

    // 12-month trend (income vs expenses)
    const monthlyTrend: Array<{
      month: string;
      collected: number;
      expenses: number;
      profit: number;
    }> = [];

    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mYear = d.getFullYear();
      const mMonth = d.getMonth();
      const label = d.toLocaleString('en-US', {
        month: 'short',
        year: '2-digit',
      });

      const col = payments
        .filter((p) => {
          const pd = new Date(p.paidAt);
          return pd.getFullYear() === mYear && pd.getMonth() === mMonth;
        })
        .reduce((s, p) => s + Number(p.amount), 0);

      const exp = expenses
        .filter((e) => {
          const ed = new Date(e.date);
          return ed.getFullYear() === mYear && ed.getMonth() === mMonth;
        })
        .reduce((s, e) => s + Number(e.amount), 0);

      monthlyTrend.push({
        month: label,
        collected: Number(col.toFixed(2)),
        expenses: Number(exp.toFixed(2)),
        profit: Number((col - exp).toFixed(2)),
      });
    }

    // Expense breakdown by category
    const expensesByCategory: Record<string, number> = {};
    for (const e of expenses) {
      expensesByCategory[e.category] =
        (expensesByCategory[e.category] || 0) + Number(e.amount);
    }

    return {
      kpis: {
        totalStudents,
        activeCourses,
        activeBatches,
        totalBilled: Number(totalBilled.toFixed(2)),
        totalCollected: Number(totalCollected.toFixed(2)),
        monthlyCollected: Number(monthlyCollected.toFixed(2)),
        pendingDues: Number(pendingDues.toFixed(2)),
        overdueDues: Number(overdueDues.toFixed(2)),
        overdueCount: overdueInvoices.length,
        totalExpenses: Number(totalExpenses.toFixed(2)),
        monthlyExpenses: Number(monthlyExpenses.toFixed(2)),
        netProfit: Number(netProfit.toFixed(2)),
      },
      monthlyTrend,
      expensesByCategory,
    };
  }
}
