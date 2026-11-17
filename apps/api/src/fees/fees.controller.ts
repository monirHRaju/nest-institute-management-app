import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  AssignFeeDto,
  AssignFeeSchema,
  CreateDiscountDto,
  CreateDiscountSchema,
  CreateExpenseDto,
  CreateExpenseSchema,
  CreateFeeStructureDto,
  CreateFeeStructureSchema,
  CreateInvoiceDto,
  CreateInvoiceSchema,
  RecordPaymentDto,
  RecordPaymentSchema,
  Role,
  UpdateDiscountDto,
  UpdateDiscountSchema,
  UpdateExpenseDto,
  UpdateExpenseSchema,
  UpdateFeeStructureDto,
  UpdateFeeStructureSchema,
  UpdateInvoiceDto,
  UpdateInvoiceSchema,
} from '@repo/shared';
import { FeesService } from './fees.service';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { AuthUser } from '../common/types/request.types';

@ApiTags('Fees & Accounting')
@Controller('fees')
export class FeesController {
  constructor(private readonly feesService: FeesService) {}

  // ── 3.1 Fee Structures ─────────────────────────────────────────────────────

  @Get('structures')
  @Roles(Role.TENANT_ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'List fee structures for the tenant' })
  findAllStructures(
    @CurrentTenant('id') tenantId: string,
    @Query('courseId') courseId?: string,
  ): Promise<any> {
    return this.feesService.findAllStructures(tenantId, courseId);
  }

  @Post('structures')
  @Roles(Role.TENANT_ADMIN)
  @ApiOperation({ summary: 'Create a fee structure with installment plan' })
  createStructure(
    @CurrentTenant('id') tenantId: string,
    @Body(new ZodValidationPipe(CreateFeeStructureSchema))
    dto: CreateFeeStructureDto,
  ): Promise<any> {
    return this.feesService.createStructure(tenantId, dto);
  }

  @Patch('structures/:id')
  @Roles(Role.TENANT_ADMIN)
  @ApiOperation({ summary: 'Update a fee structure' })
  updateStructure(
    @CurrentTenant('id') tenantId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateFeeStructureSchema))
    dto: UpdateFeeStructureDto,
  ): Promise<any> {
    return this.feesService.updateStructure(tenantId, id, dto);
  }

  @Delete('structures/:id')
  @Roles(Role.TENANT_ADMIN)
  @ApiOperation({ summary: 'Delete an unassigned fee structure' })
  deleteStructure(
    @CurrentTenant('id') tenantId: string,
    @Param('id') id: string,
  ): Promise<any> {
    return this.feesService.deleteStructure(tenantId, id);
  }

  // ── 3.1 Discounts & Scholarships ───────────────────────────────────────────

  @Get('discounts')
  @Roles(Role.TENANT_ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'List discounts & scholarships' })
  findAllDiscounts(@CurrentTenant('id') tenantId: string): Promise<any> {
    return this.feesService.findAllDiscounts(tenantId);
  }

  @Post('discounts')
  @Roles(Role.TENANT_ADMIN)
  @ApiOperation({ summary: 'Create a discount or scholarship' })
  createDiscount(
    @CurrentTenant('id') tenantId: string,
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(CreateDiscountSchema)) dto: CreateDiscountDto,
  ): Promise<any> {
    return this.feesService.createDiscount(tenantId, user, dto);
  }

  @Patch('discounts/:id')
  @Roles(Role.TENANT_ADMIN)
  @ApiOperation({ summary: 'Update a discount' })
  updateDiscount(
    @CurrentTenant('id') tenantId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateDiscountSchema)) dto: UpdateDiscountDto,
  ): Promise<any> {
    return this.feesService.updateDiscount(tenantId, id, dto);
  }

  @Delete('discounts/:id')
  @Roles(Role.TENANT_ADMIN)
  @ApiOperation({ summary: 'Delete a discount' })
  deleteDiscount(
    @CurrentTenant('id') tenantId: string,
    @Param('id') id: string,
  ): Promise<any> {
    return this.feesService.deleteDiscount(tenantId, id);
  }

  // ── 3.1 Assign Fee Structure to Student ────────────────────────────────────

  @Post('students/:studentId/assign')
  @Roles(Role.TENANT_ADMIN, Role.STAFF)
  @ApiOperation({
    summary: 'Assign fee structure to student and auto-generate invoices',
  })
  assignFeeToStudent(
    @CurrentTenant('id') tenantId: string,
    @Param('studentId') studentId: string,
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(AssignFeeSchema)) dto: AssignFeeDto,
  ): Promise<any> {
    return this.feesService.assignFeeToStudent(tenantId, studentId, user, dto);
  }

  @Get('students/:studentId/ledger')
  @Roles(Role.TENANT_ADMIN, Role.STAFF, Role.STUDENT)
  @ApiOperation({ summary: 'Get student fee assignments, invoices & ledger' })
  getStudentLedger(
    @CurrentTenant('id') tenantId: string,
    @Param('studentId') studentId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<any> {
    return this.feesService.getStudentLedger(tenantId, studentId, user);
  }

  // ── 3.2 Invoices & Payments ────────────────────────────────────────────────

  @Get('invoices')
  @Roles(Role.TENANT_ADMIN, Role.STAFF, Role.STUDENT)
  @ApiOperation({ summary: 'List invoices (students see only their own)' })
  findAllInvoices(
    @CurrentTenant('id') tenantId: string,
    @CurrentUser() user: AuthUser,
    @Query('studentId') studentId?: string,
    @Query('batchId') batchId?: string,
    @Query('courseId') courseId?: string,
    @Query('status') status?: string,
    @Query('overdueOnly') overdueOnly?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<any> {
    return this.feesService.findAllInvoices(tenantId, user, {
      studentId,
      batchId,
      courseId,
      status,
      overdueOnly,
      from,
      to,
    });
  }

  @Get('invoices/:id')
  @Roles(Role.TENANT_ADMIN, Role.STAFF, Role.STUDENT)
  @ApiOperation({ summary: 'Get single invoice details (for viewing/PDF)' })
  findOneInvoice(
    @CurrentTenant('id') tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<any> {
    return this.feesService.findOneInvoice(tenantId, id, user);
  }

  @Post('invoices')
  @Roles(Role.TENANT_ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Create a custom fee invoice' })
  createInvoice(
    @CurrentTenant('id') tenantId: string,
    @Body(new ZodValidationPipe(CreateInvoiceSchema)) dto: CreateInvoiceDto,
  ): Promise<any> {
    return this.feesService.createInvoice(tenantId, dto);
  }

  @Patch('invoices/:id')
  @Roles(Role.TENANT_ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Update an invoice' })
  updateInvoice(
    @CurrentTenant('id') tenantId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateInvoiceSchema)) dto: UpdateInvoiceDto,
  ): Promise<any> {
    return this.feesService.updateInvoice(tenantId, id, dto);
  }

  @Post('payments')
  @Roles(Role.TENANT_ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Record a manual payment (Cash, bKash, Bank, etc.)' })
  recordPayment(
    @CurrentTenant('id') tenantId: string,
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(RecordPaymentSchema)) dto: RecordPaymentDto,
  ): Promise<any> {
    return this.feesService.recordPayment(tenantId, user, dto);
  }

  @Post('payments/:id/void')
  @Roles(Role.TENANT_ADMIN)
  @ApiOperation({ summary: 'Void a payment and revert invoice balance' })
  voidPayment(
    @CurrentTenant('id') tenantId: string,
    @Param('id') id: string,
  ): Promise<any> {
    return this.feesService.voidPayment(tenantId, id);
  }

  @Get('payments')
  @Roles(Role.TENANT_ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'List all payments for the tenant' })
  findAllPayments(
    @CurrentTenant('id') tenantId: string,
    @Query('studentId') studentId?: string,
  ): Promise<any> {
    return this.feesService.findAllPayments(tenantId, studentId);
  }

  // ── 3.2 SSLCommerz Online Payment & IPN Webhook ────────────────────────────

  @Post('invoices/:id/pay-link')
  @Roles(Role.TENANT_ADMIN, Role.STAFF, Role.STUDENT)
  @ApiOperation({ summary: 'Generate SSLCommerz online payment session link' })
  createPayLink(
    @CurrentTenant('id') tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<any> {
    return this.feesService.createSslCommerzPaymentSession(tenantId, id, user);
  }

  @Public()
  @Post('sslcommerz/ipn')
  @ApiOperation({ summary: 'SSLCommerz IPN webhook (idempotent)' })
  handleSslCommerzIpn(@Body() body: Record<string, any>): Promise<any> {
    return this.feesService.handleSslCommerzIpn({
      tran_id: body.tran_id,
      val_id: body.val_id,
      amount: body.amount,
      currency: body.currency,
      status: body.status,
      value_a: body.value_a,
      value_b: body.value_b,
    });
  }

  // ── 3.3 Dues Reminders, Expenses & Revenue Dashboard ───────────────────────

  @Post('invoices/:id/remind')
  @Roles(Role.TENANT_ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Send overdue SMS reminder via Green Web BD' })
  sendOverdueReminder(
    @CurrentTenant('id') tenantId: string,
    @Param('id') invoiceId: string,
  ): Promise<any> {
    return this.feesService.sendOverdueSmsReminder(tenantId, invoiceId);
  }

  @Get('expenses')
  @Roles(Role.TENANT_ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'List institute expenses' })
  findAllExpenses(
    @CurrentTenant('id') tenantId: string,
    @Query('category') category?: string,
    @Query('month') month?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<any> {
    return this.feesService.findAllExpenses(tenantId, {
      category,
      month,
      from,
      to,
    });
  }

  @Post('expenses')
  @Roles(Role.TENANT_ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Create an expense ledger entry' })
  createExpense(
    @CurrentTenant('id') tenantId: string,
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(CreateExpenseSchema)) dto: CreateExpenseDto,
  ): Promise<any> {
    return this.feesService.createExpense(tenantId, user, dto);
  }

  @Patch('expenses/:id')
  @Roles(Role.TENANT_ADMIN)
  @ApiOperation({ summary: 'Update an expense ledger entry' })
  updateExpense(
    @CurrentTenant('id') tenantId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateExpenseSchema)) dto: UpdateExpenseDto,
  ): Promise<any> {
    return this.feesService.updateExpense(tenantId, id, dto);
  }

  @Delete('expenses/:id')
  @Roles(Role.TENANT_ADMIN)
  @ApiOperation({ summary: 'Delete an expense ledger entry' })
  deleteExpense(
    @CurrentTenant('id') tenantId: string,
    @Param('id') id: string,
  ): Promise<any> {
    return this.feesService.deleteExpense(tenantId, id);
  }

  @Get('revenue')
  @Roles(Role.TENANT_ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Get revenue, dues, expenses, and P&L dashboard' })
  getRevenueDashboard(
    @CurrentTenant('id') tenantId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<any> {
    return this.feesService.getRevenueDashboard(tenantId, { from, to });
  }
}
