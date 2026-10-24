import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { FeesService } from './fees.service';
import {
  CreateFeeInvoiceDto,
  UpdateFeeInvoiceDto,
  RecordPaymentDto,
  FeeInvoiceQueryDto,
  PaymentQueryDto,
  CreateFeeInvoiceSchema,
  UpdateFeeInvoiceSchema,
  RecordPaymentSchema,
  FeeInvoiceQuerySchema,
  PaymentQuerySchema,
  Role,
} from '@repo/shared';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';

@ApiTags('Fees')
@ApiBearerAuth()
@Controller('fees')
@Roles(Role.TENANT_ADMIN, Role.STAFF)
export class FeesController {
  constructor(private readonly feesService: FeesService) {}

  @Post('invoices')
  @ApiOperation({ summary: 'Create a new fee invoice for a student' })
  @ApiResponse({ status: 201, description: 'Invoice created successfully' })
  createInvoice(
    @CurrentTenant('id') tenantId: string,
    @Body(new ZodValidationPipe(CreateFeeInvoiceSchema)) dto: CreateFeeInvoiceDto,
  ) {
    return this.feesService.createInvoice(tenantId, dto);
  }

  @Get('invoices')
  @ApiOperation({ summary: 'List and filter invoices for the tenant' })
  findAllInvoices(
    @CurrentTenant('id') tenantId: string,
    @Query(new ZodValidationPipe(FeeInvoiceQuerySchema)) query: FeeInvoiceQueryDto,
  ) {
    return this.feesService.findAllInvoices(tenantId, query);
  }

  @Get('invoices/:id')
  @ApiOperation({ summary: 'Get single invoice by ID with payments' })
  findOneInvoice(
    @CurrentTenant('id') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.feesService.findOneInvoice(tenantId, id);
  }

  @Patch('invoices/:id')
  @ApiOperation({ summary: 'Update an existing fee invoice' })
  updateInvoice(
    @CurrentTenant('id') tenantId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateFeeInvoiceSchema)) dto: UpdateFeeInvoiceDto,
  ) {
    return this.feesService.updateInvoice(tenantId, id, dto);
  }

  @Delete('invoices/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an unpaid fee invoice' })
  deleteInvoice(
    @CurrentTenant('id') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.feesService.deleteInvoice(tenantId, id);
  }

  @Post('payments')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Record a payment against an invoice' })
  @ApiResponse({ status: 201, description: 'Payment recorded and invoice updated' })
  recordPayment(
    @CurrentTenant('id') tenantId: string,
    @CurrentUser('id') userId: string,
    @Body(new ZodValidationPipe(RecordPaymentSchema)) dto: RecordPaymentDto,
  ) {
    return this.feesService.recordPayment(tenantId, userId, dto);
  }

  @Get('payments')
  @ApiOperation({ summary: 'List and filter payments for the tenant' })
  findAllPayments(
    @CurrentTenant('id') tenantId: string,
    @Query(new ZodValidationPipe(PaymentQuerySchema)) query: PaymentQueryDto,
  ) {
    return this.feesService.findAllPayments(tenantId, query);
  }

  @Get('students/:studentId/ledger')
  @ApiOperation({ summary: 'Get complete financial billing & payment ledger for a student' })
  getStudentLedger(
    @CurrentTenant('id') tenantId: string,
    @Param('studentId') studentId: string,
  ) {
    return this.feesService.getStudentLedger(tenantId, studentId);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get financial summary and collection statistics for tenant dashboard' })
  getFinancialStats(
    @CurrentTenant('id') tenantId: string,
  ) {
    return this.feesService.getFinancialStats(tenantId);
  }
}
