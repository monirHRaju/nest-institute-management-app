import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateFeeInvoiceDto,
  UpdateFeeInvoiceDto,
  RecordPaymentDto,
  FeeInvoiceQueryDto,
  PaymentQueryDto,
  InvoiceStatus,
  PaymentMethod,
} from '@repo/shared';
import { withTenant } from '@repo/db';

@Injectable()
export class FeesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new fee invoice for a student.
   */
  async createInvoice(tenantId: string, dto: CreateFeeInvoiceDto) {
    const student = await this.prisma.student.findFirst({
      where: { id: dto.studentId, tenantId },
    });
    if (!student) {
      throw new NotFoundException(`Student with ID "${dto.studentId}" not found.`);
    }

    if (dto.courseId) {
      const course = await this.prisma.course.findFirst({
        where: { id: dto.courseId, tenantId },
      });
      if (!course) {
        throw new NotFoundException(`Course with ID "${dto.courseId}" not found.`);
      }
    }

    const discount = Math.max(0, dto.discount || 0);
    const amount = Math.max(0, dto.amount || 0);
    const totalAmount = Math.max(0, amount - discount);

    // Auto-generate invoice number: INV-YYYY-XXXX
    const year = new Date().getFullYear();
    const count = await this.prisma.feeInvoice.count({ where: { tenantId } });
    const invoiceNumber = `INV-${year}-${String(count + 1).padStart(4, '0')}`;

    const initialStatus = totalAmount === 0 ? InvoiceStatus.PAID : InvoiceStatus.UNPAID;

    return this.prisma.feeInvoice.create({
      data: withTenant(tenantId, {
        invoiceNumber,
        title: dto.title.trim(),
        feeType: dto.feeType,
        amount,
        discount,
        totalAmount,
        paidAmount: 0,
        dueAmount: totalAmount,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        status: initialStatus,
        notes: dto.notes?.trim() || null,
        studentId: dto.studentId,
        courseId: dto.courseId || null,
      }),
      include: {
        student: {
          select: {
            id: true,
            studentId: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
          },
        },
        course: {
          select: {
            id: true,
            name: true,
            fees: true,
          },
        },
        payments: true,
      },
    });
  }

  /**
   * Find paginated fee invoices with query filters.
   */
  async findAllInvoices(tenantId: string, query: FeeInvoiceQueryDto) {
    const { page = 1, limit = 20, search, studentId, courseId, status, feeType, startDate, endDate } = query;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };

    if (studentId) where.studentId = studentId;
    if (courseId) where.courseId = courseId;
    if (status) where.status = status;
    if (feeType) where.feeType = feeType;

    if (search && search.trim()) {
      const term = search.trim();
      where.OR = [
        { invoiceNumber: { contains: term, mode: 'insensitive' } },
        { title: { contains: term, mode: 'insensitive' } },
        { student: { firstName: { contains: term, mode: 'insensitive' } } },
        { student: { lastName: { contains: term, mode: 'insensitive' } } },
        { student: { studentId: { contains: term, mode: 'insensitive' } } },
        { student: { phone: { contains: term } } },
      ];
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [total, data] = await Promise.all([
      this.prisma.feeInvoice.count({ where }),
      this.prisma.feeInvoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          student: {
            select: {
              id: true,
              studentId: true,
              firstName: true,
              lastName: true,
              phone: true,
              email: true,
            },
          },
          course: {
            select: {
              id: true,
              name: true,
              fees: true,
            },
          },
          payments: {
            orderBy: { paymentDate: 'desc' },
          },
        },
      }),
    ]);

    return {
      success: true,
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Find a single fee invoice by ID.
   */
  async findOneInvoice(tenantId: string, id: string) {
    const invoice = await this.prisma.feeInvoice.findFirst({
      where: { id, tenantId },
      include: {
        student: {
          select: {
            id: true,
            studentId: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
            address: true,
          },
        },
        course: {
          select: {
            id: true,
            name: true,
            fees: true,
          },
        },
        payments: {
          orderBy: { paymentDate: 'desc' },
          include: {
            receivedBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice with ID "${id}" not found.`);
    }

    return invoice;
  }

  /**
   * Update invoice details.
   */
  async updateInvoice(tenantId: string, id: string, dto: UpdateFeeInvoiceDto) {
    const invoice = await this.findOneInvoice(tenantId, id);

    let amount = invoice.amount;
    let discount = invoice.discount;

    if (dto.amount !== undefined) amount = Math.max(0, dto.amount);
    if (dto.discount !== undefined) discount = Math.max(0, dto.discount);

    const totalAmount = Math.max(0, amount - discount);
    const dueAmount = Math.max(0, totalAmount - invoice.paidAmount);

    let newStatus = dto.status || invoice.status;
    if (dto.status === undefined) {
      if (dueAmount <= 0) {
        newStatus = InvoiceStatus.PAID;
      } else if (invoice.paidAmount > 0 && dueAmount > 0) {
        newStatus = InvoiceStatus.PARTIALLY_PAID;
      } else {
        newStatus = InvoiceStatus.UNPAID;
      }
    }

    return this.prisma.feeInvoice.update({
      where: { id },
      data: {
        title: dto.title?.trim() ?? invoice.title,
        feeType: dto.feeType ?? invoice.feeType,
        amount,
        discount,
        totalAmount,
        dueAmount,
        dueDate: dto.dueDate !== undefined ? (dto.dueDate ? new Date(dto.dueDate) : null) : invoice.dueDate,
        status: newStatus,
        notes: dto.notes !== undefined ? dto.notes?.trim() || null : invoice.notes,
      },
      include: {
        student: {
          select: {
            id: true,
            studentId: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        course: true,
        payments: true,
      },
    });
  }

  /**
   * Delete invoice if no payments have been collected.
   */
  async deleteInvoice(tenantId: string, id: string) {
    const invoice = await this.findOneInvoice(tenantId, id);
    if (invoice.payments && invoice.payments.length > 0) {
      throw new BadRequestException('Cannot delete an invoice that has payments recorded. Delete payments or cancel the invoice instead.');
    }

    return this.prisma.feeInvoice.delete({
      where: { id },
    });
  }

  /**
   * Record a payment transaction against an invoice.
   */
  async recordPayment(tenantId: string, receivedById: string | null, dto: RecordPaymentDto) {
    const invoice = await this.prisma.feeInvoice.findFirst({
      where: { id: dto.invoiceId, tenantId },
      include: { student: true },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice with ID "${dto.invoiceId}" not found.`);
    }

    if (invoice.status === InvoiceStatus.PAID && invoice.dueAmount <= 0) {
      throw new BadRequestException('This invoice is already fully paid.');
    }

    return this.prisma.$transaction(async (tx) => {
      // Auto-generate receipt number: REC-YYYY-XXXX
      const year = new Date().getFullYear();
      const count = await tx.payment.count({ where: { tenantId } });
      const receiptNumber = `REC-${year}-${String(count + 1).padStart(4, '0')}`;

      // Create Payment
      const payment = await tx.payment.create({
        data: withTenant(tenantId, {
          receiptNumber,
          amount: dto.amount,
          method: dto.method,
          transactionId: dto.transactionId?.trim() || null,
          paymentDate: dto.paymentDate ? new Date(dto.paymentDate) : new Date(),
          notes: dto.notes?.trim() || null,
          invoiceId: invoice.id,
          studentId: invoice.studentId,
          receivedById: receivedById || null,
        }),
        include: {
          student: {
            select: {
              id: true,
              studentId: true,
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              title: true,
              totalAmount: true,
              dueAmount: true,
            },
          },
          receivedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      // Recalculate invoice dues
      const newPaidAmount = invoice.paidAmount + dto.amount;
      const newDueAmount = Math.max(0, invoice.totalAmount - newPaidAmount);
      let newStatus: InvoiceStatus;

      if (newDueAmount <= 0) {
        newStatus = InvoiceStatus.PAID;
      } else if (newPaidAmount > 0) {
        newStatus = InvoiceStatus.PARTIALLY_PAID;
      } else {
        newStatus = InvoiceStatus.UNPAID;
      }

      await tx.feeInvoice.update({
        where: { id: invoice.id },
        data: {
          paidAmount: newPaidAmount,
          dueAmount: newDueAmount,
          status: newStatus,
        },
      });

      return payment;
    });
  }

  /**
   * Find paginated payments list with filters.
   */
  async findAllPayments(tenantId: string, query: PaymentQueryDto) {
    const { page = 1, limit = 20, invoiceId, studentId, method, startDate, endDate } = query;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };

    if (invoiceId) where.invoiceId = invoiceId;
    if (studentId) where.studentId = studentId;
    if (method) where.method = method;

    if (startDate || endDate) {
      where.paymentDate = {};
      if (startDate) where.paymentDate.gte = new Date(startDate);
      if (endDate) where.paymentDate.lte = new Date(endDate);
    }

    const [total, data] = await Promise.all([
      this.prisma.payment.count({ where }),
      this.prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { paymentDate: 'desc' },
        include: {
          student: {
            select: {
              id: true,
              studentId: true,
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              title: true,
              totalAmount: true,
              dueAmount: true,
            },
          },
          receivedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
    ]);

    return {
      success: true,
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Get complete financial ledger for a specific student.
   */
  async getStudentLedger(tenantId: string, studentId: string) {
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, tenantId },
    });

    if (!student) {
      throw new NotFoundException(`Student with ID "${studentId}" not found.`);
    }

    const [invoices, payments] = await Promise.all([
      this.prisma.feeInvoice.findMany({
        where: { studentId, tenantId },
        orderBy: { createdAt: 'desc' },
        include: {
          course: {
            select: {
              id: true,
              name: true,
              fees: true,
            },
          },
          payments: {
            orderBy: { paymentDate: 'desc' },
          },
        },
      }),
      this.prisma.payment.findMany({
        where: { studentId, tenantId },
        orderBy: { paymentDate: 'desc' },
        include: {
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              title: true,
              totalAmount: true,
              dueAmount: true,
            },
          },
          receivedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
    ]);

    const totalBilled = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const totalPaid = invoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
    const dueBalance = invoices.reduce((sum, inv) => sum + inv.dueAmount, 0);

    return {
      totalBilled,
      totalPaid,
      dueBalance,
      invoices,
      payments,
    };
  }

  /**
   * Get financial analytics overview for the tenant.
   */
  async getFinancialStats(tenantId: string) {
    const [invoiceAggregate, overdueCount, totalInvoicesCount, totalPaymentsCount, recentPayments, paymentGrouped] =
      await Promise.all([
        this.prisma.feeInvoice.aggregate({
          where: { tenantId },
          _sum: {
            totalAmount: true,
            paidAmount: true,
            dueAmount: true,
          },
        }),
        this.prisma.feeInvoice.count({
          where: {
            tenantId,
            OR: [
              { status: InvoiceStatus.OVERDUE },
              {
                dueDate: { lt: new Date() },
                dueAmount: { gt: 0 },
                status: { notIn: [InvoiceStatus.PAID, InvoiceStatus.CANCELLED] },
              },
            ],
          },
        }),
        this.prisma.feeInvoice.count({ where: { tenantId } }),
        this.prisma.payment.count({ where: { tenantId } }),
        this.prisma.payment.findMany({
          where: { tenantId },
          take: 5,
          orderBy: { paymentDate: 'desc' },
          include: {
            student: {
              select: {
                id: true,
                studentId: true,
                firstName: true,
                lastName: true,
                phone: true,
              },
            },
            invoice: {
              select: {
                id: true,
                invoiceNumber: true,
                title: true,
                totalAmount: true,
                dueAmount: true,
              },
            },
            receivedBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        }),
        this.prisma.payment.groupBy({
          by: ['method'],
          where: { tenantId },
          _sum: { amount: true },
        }),
      ]);

    const methodBreakdown: Record<string, number> = {};
    Object.values(PaymentMethod).forEach((m) => {
      methodBreakdown[m] = 0;
    });
    paymentGrouped.forEach((item) => {
      methodBreakdown[item.method] = item._sum.amount || 0;
    });

    return {
      totalInvoiced: invoiceAggregate._sum.totalAmount || 0,
      totalCollected: invoiceAggregate._sum.paidAmount || 0,
      totalOutstanding: invoiceAggregate._sum.dueAmount || 0,
      overdueCount,
      totalInvoicesCount,
      totalPaymentsCount,
      methodBreakdown,
      recentPayments,
    };
  }
}
