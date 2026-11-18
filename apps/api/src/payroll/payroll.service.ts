import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BulkPayrollIdsDto,
  ExpenseCategory,
  GeneratePayrollDto,
  PaymentMethod,
  PayPayrollDto,
  PayrollStatus,
  Role,
  SmsEventType,
  UpdatePayrollDto,
} from '@repo/shared';
import { PrismaService } from '../prisma/prisma.service';
import { SmsService } from '../sms/sms.service';
import type { AuthUser } from '../common/types/request.types';

export function computeNetSalary(
  baseAmount: number,
  allowances = 0,
  deductions = 0,
  bonus = 0,
): number {
  const net = Number(baseAmount) + Number(allowances) + Number(bonus) - Number(deductions);
  return Number(Math.max(0, net).toFixed(2));
}

export interface FindPayrollQuery {
  month?: number;
  year?: number;
  staffId?: string;
  status?: string;
}

@Injectable()
export class PayrollService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly smsService?: SmsService,
  ) {}

  async findAll(
    tenantId: string,
    user: AuthUser,
    query: FindPayrollQuery = {},
  ): Promise<any[]> {
    if (!tenantId) {
      throw new BadRequestException('Tenant context is required');
    }

    const where: any = { tenantId };
    if (query.month) where.month = Number(query.month);
    if (query.year) where.year = Number(query.year);
    if (query.status) where.status = query.status;

    if (user.role === Role.STAFF || user.role === Role.INSTRUCTOR) {
      const ownProfile = await this.prisma.staffProfile.findFirst({
        where: { tenantId, userId: user.userId },
        select: { id: true },
      });
      if (!ownProfile) return [];
      where.staffId = ownProfile.id;
    } else if (query.staffId) {
      where.staffId = query.staffId;
    }

    return this.prisma.payroll.findMany({
      where,
      include: {
        staff: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                role: true,
              },
            },
          },
        },
        expense: {
          select: {
            id: true,
            title: true,
            amount: true,
            date: true,
          },
        },
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async generate(tenantId: string, dto: GeneratePayrollDto): Promise<any> {
    if (!tenantId) {
      throw new BadRequestException('Tenant context is required');
    }

    const activeStaff = await this.prisma.staffProfile.findMany({
      where: { tenantId, isActive: true },
    });

    if (activeStaff.length === 0) {
      return { createdCount: 0, skippedCount: 0, records: [] };
    }

    const existing = await this.prisma.payroll.findMany({
      where: {
        tenantId,
        month: dto.month,
        year: dto.year,
      },
      select: { staffId: true },
    });

    const existingStaffIds = new Set(existing.map((p) => p.staffId));
    const toCreate = activeStaff.filter((s) => !existingStaffIds.has(s.id));

    const created = await this.prisma.$transaction(
      toCreate.map((staff) => {
        const base = Number(staff.baseSalary);
        return this.prisma.payroll.create({
          data: {
            tenantId,
            staffId: staff.id,
            month: dto.month,
            year: dto.year,
            baseAmount: base,
            allowances: 0,
            deductions: 0,
            bonus: 0,
            netAmount: computeNetSalary(base, 0, 0, 0),
            status: PayrollStatus.DRAFT,
          },
          include: {
            staff: {
              include: {
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    role: true,
                  },
                },
              },
            },
          },
        });
      }),
    );

    return {
      createdCount: created.length,
      skippedCount: activeStaff.length - created.length,
      records: created,
    };
  }

  async update(tenantId: string, id: string, dto: UpdatePayrollDto): Promise<any> {
    if (!tenantId) {
      throw new BadRequestException('Tenant context is required');
    }

    const existing = await this.prisma.payroll.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      throw new NotFoundException('Payroll record not found');
    }
    if (existing.status !== PayrollStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT payroll records can be edited');
    }

    const allowances =
      dto.allowances !== undefined ? dto.allowances : Number(existing.allowances);
    const deductions =
      dto.deductions !== undefined ? dto.deductions : Number(existing.deductions);
    const bonus = dto.bonus !== undefined ? dto.bonus : Number(existing.bonus);
    const netAmount = computeNetSalary(
      Number(existing.baseAmount),
      allowances,
      deductions,
      bonus,
    );

    return this.prisma.payroll.update({
      where: { id },
      data: {
        allowances,
        deductions,
        bonus,
        netAmount,
        ...(dto.note !== undefined ? { note: dto.note } : {}),
      },
      include: {
        staff: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
              },
            },
          },
        },
      },
    });
  }

  async approve(tenantId: string, id: string): Promise<any> {
    if (!tenantId) {
      throw new BadRequestException('Tenant context is required');
    }

    const existing = await this.prisma.payroll.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      throw new NotFoundException('Payroll record not found');
    }
    if (existing.status !== PayrollStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT payroll records can be approved');
    }

    return this.prisma.payroll.update({
      where: { id },
      data: { status: PayrollStatus.APPROVED },
    });
  }

  async bulkApprove(tenantId: string, ids: string[]): Promise<any> {
    if (!tenantId) {
      throw new BadRequestException('Tenant context is required');
    }

    const result = await this.prisma.payroll.updateMany({
      where: {
        tenantId,
        id: { in: ids },
        status: PayrollStatus.DRAFT,
      },
      data: { status: PayrollStatus.APPROVED },
    });

    return { approvedCount: result.count };
  }

  async pay(
    tenantId: string,
    id: string,
    user: AuthUser,
    dto: PayPayrollDto,
  ): Promise<any> {
    if (!tenantId) {
      throw new BadRequestException('Tenant context is required');
    }

    const existing = await this.prisma.payroll.findFirst({
      where: { id, tenantId },
      include: {
        staff: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('Payroll record not found');
    }
    if (existing.status === PayrollStatus.PAID) {
      throw new BadRequestException('Payroll is already marked as PAID');
    }
    if (existing.status !== PayrollStatus.APPROVED) {
      throw new BadRequestException('Payroll must be APPROVED before payment');
    }

    const paidAt = dto.paidAt ?? new Date();
    const monthPadded = String(existing.month).padStart(2, '0');
    const staffName = `${existing.staff.user.firstName} ${existing.staff.user.lastName}`;

    return this.prisma.$transaction(async (tx) => {
      const expense = await tx.expense.create({
        data: {
          tenantId,
          title: `Salary: ${staffName} (${monthPadded}/${existing.year})`,
          category: ExpenseCategory.SALARY,
          amount: existing.netAmount,
          date: paidAt,
          note: dto.note ?? `Payroll ${existing.id}`,
          createdById: user.userId,
        },
      });

      return tx.payroll.update({
        where: { id },
        data: {
          status: PayrollStatus.PAID,
          paidAt,
          method: dto.method ?? PaymentMethod.BANK_TRANSFER,
          note: dto.note ?? existing.note,
          expenseId: expense.id,
        },
        include: {
          staff: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  phone: true,
                  role: true,
                },
              },
            },
          },
          expense: true,
        },
      });
    }).then((paidRecord) => {
      if (this.smsService) {
        void this.smsService.dispatchEventSms({
          tenantId,
          eventType: SmsEventType.PAYROLL_PAID,
          phones: [paidRecord.staff.user.phone, paidRecord.staff.mobileWallet],
          vars: {
            staffName: staffName,
            amount: Number(paidRecord.netAmount).toLocaleString('en-BD'),
            period: `${monthPadded}/${existing.year}`,
            method: paidRecord.method || 'BANK_TRANSFER',
            instituteName: 'Institute',
          },
          relatedType: 'Payroll',
          relatedId: paidRecord.id,
        });
      }
      return paidRecord;
    });
  }

  async bulkPay(
    tenantId: string,
    user: AuthUser,
    dto: BulkPayrollIdsDto,
  ): Promise<any> {
    if (!tenantId) {
      throw new BadRequestException('Tenant context is required');
    }

    const payrolls = await this.prisma.payroll.findMany({
      where: {
        tenantId,
        id: { in: dto.ids },
        status: PayrollStatus.APPROVED,
      },
      include: {
        staff: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (payrolls.length === 0) {
      return { paidCount: 0 };
    }

    const paidAt = dto.paidAt ?? new Date();
    const method = dto.method ?? PaymentMethod.BANK_TRANSFER;

    await this.prisma.$transaction(async (tx) => {
      for (const p of payrolls) {
        const monthPadded = String(p.month).padStart(2, '0');
        const staffName = `${p.staff.user.firstName} ${p.staff.user.lastName}`;

        const expense = await tx.expense.create({
          data: {
            tenantId,
            title: `Salary: ${staffName} (${monthPadded}/${p.year})`,
            category: ExpenseCategory.SALARY,
            amount: p.netAmount,
            date: paidAt,
            note: dto.note ?? `Bulk payroll ${p.id}`,
            createdById: user.userId,
          },
        });

        await tx.payroll.update({
          where: { id: p.id },
          data: {
            status: PayrollStatus.PAID,
            paidAt,
            method,
            expenseId: expense.id,
          },
        });
      }
    });

    return { paidCount: payrolls.length };
  }

  async getPayslip(tenantId: string, id: string, user: AuthUser): Promise<any> {
    if (!tenantId) {
      throw new BadRequestException('Tenant context is required');
    }

    const payroll = await this.prisma.payroll.findFirst({
      where: { id, tenantId },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            themeConfig: true,
          },
        },
        staff: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                role: true,
              },
            },
          },
        },
      },
    });

    if (!payroll) {
      throw new NotFoundException('Payroll record not found');
    }

    if (
      (user.role === Role.STAFF || user.role === Role.INSTRUCTOR) &&
      payroll.staff.userId !== user.userId
    ) {
      throw new ForbiddenException('You can only view your own payslip');
    }

    return payroll;
  }
}
