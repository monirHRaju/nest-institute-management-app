import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  Role,
  SendBulkSmsDto,
  SendBulkSmsSchema,
  SendTestSmsDto,
  SendTestSmsSchema,
  UpdateSmsSettingsDto,
  UpdateSmsSettingsSchema,
  UpsertSmsTemplatesDto,
  UpsertSmsTemplatesSchema,
} from '@repo/shared';
import { SmsService } from './sms.service';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { AuthUser } from '../common/types/request.types';

@ApiTags('SMS Gateway & Notifications')
@Controller('sms')
export class SmsController {
  constructor(private readonly smsService: SmsService) {}

  // ── Per-Tenant Settings (BulkSMSBD) ────────────────────────────────────────

  @Get('settings')
  @Roles(Role.TENANT_ADMIN)
  @ApiOperation({ summary: 'Get tenant SMS gateway settings (API key masked)' })
  getSettings(@CurrentTenant('id') tenantId: string): Promise<any> {
    return this.smsService.getSettings(tenantId);
  }

  @Put('settings')
  @Roles(Role.TENANT_ADMIN)
  @ApiOperation({ summary: 'Update tenant SMS gateway settings (api_key, senderid, adminPhone)' })
  updateSettings(
    @CurrentTenant('id') tenantId: string,
    @Body(new ZodValidationPipe(UpdateSmsSettingsSchema))
    dto: UpdateSmsSettingsDto,
  ): Promise<any> {
    return this.smsService.updateSettings(tenantId, dto);
  }

  @Get('balance')
  @Roles(Role.TENANT_ADMIN)
  @ApiOperation({ summary: 'Check BulkSMSBD credit balance using tenant API key' })
  checkBalance(@CurrentTenant('id') tenantId: string): Promise<any> {
    return this.smsService.checkBalance(tenantId);
  }

  @Post('test')
  @Roles(Role.TENANT_ADMIN)
  @ApiOperation({ summary: 'Send a test SMS via BulkSMSBD to admin/custom phone' })
  sendTestSms(
    @CurrentTenant('id') tenantId: string,
    @Body(new ZodValidationPipe(SendTestSmsSchema)) dto: SendTestSmsDto,
  ): Promise<any> {
    return this.smsService.sendTestSms(tenantId, dto);
  }

  // ── Templates ──────────────────────────────────────────────────────────────

  @Get('templates')
  @Roles(Role.TENANT_ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Get SMS templates for the tenant' })
  getTemplates(@CurrentTenant('id') tenantId: string): Promise<any> {
    return this.smsService.getTemplates(tenantId);
  }

  @Put('templates')
  @Roles(Role.TENANT_ADMIN)
  @ApiOperation({ summary: 'Update SMS templates for the tenant' })
  upsertTemplates(
    @CurrentTenant('id') tenantId: string,
    @Body(new ZodValidationPipe(UpsertSmsTemplatesSchema))
    dto: UpsertSmsTemplatesDto,
  ): Promise<any> {
    return this.smsService.upsertTemplates(tenantId, dto);
  }

  // ── Bulk / Manual Send & Logs ──────────────────────────────────────────────

  @Post('send')
  @Roles(Role.TENANT_ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Send manual/bulk SMS to batch, course, students, staff, or custom numbers' })
  sendBulkSms(
    @CurrentTenant('id') tenantId: string,
    @Body(new ZodValidationPipe(SendBulkSmsSchema)) dto: SendBulkSmsDto,
  ): Promise<any> {
    return this.smsService.sendBulkSms(tenantId, dto);
  }

  @Get('logs')
  @Roles(Role.TENANT_ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'List SMS delivery logs for the tenant' })
  getLogs(
    @CurrentTenant('id') tenantId: string,
    @Query('status') status?: string,
    @Query('eventType') eventType?: string,
    @Query('search') search?: string,
  ): Promise<any> {
    return this.smsService.getLogs(tenantId, { status, eventType, search });
  }

  @Post('logs/:id/retry')
  @Roles(Role.TENANT_ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Retry sending a failed SMS log entry' })
  retryLog(
    @CurrentTenant('id') tenantId: string,
    @Param('id') id: string,
  ): Promise<any> {
    return this.smsService.retryLog(tenantId, id);
  }

  // ── In-App Notifications ───────────────────────────────────────────────────

  @Get('notifications')
  @Roles(Role.TENANT_ADMIN, Role.STAFF, Role.INSTRUCTOR, Role.STUDENT)
  @ApiOperation({ summary: 'Get in-app notifications for current user' })
  getNotifications(
    @CurrentTenant('id') tenantId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<any> {
    return this.smsService.getNotifications(tenantId, user.userId);
  }

  @Patch('notifications/:id/read')
  @Roles(Role.TENANT_ADMIN, Role.STAFF, Role.INSTRUCTOR, Role.STUDENT)
  @ApiOperation({ summary: 'Mark an in-app notification as read' })
  markRead(
    @CurrentTenant('id') tenantId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<any> {
    return this.smsService.markNotificationRead(tenantId, user.userId, id);
  }

  @Post('notifications/read-all')
  @Roles(Role.TENANT_ADMIN, Role.STAFF, Role.INSTRUCTOR, Role.STUDENT)
  @ApiOperation({ summary: 'Mark all in-app notifications as read' })
  markAllRead(
    @CurrentTenant('id') tenantId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<any> {
    return this.smsService.markAllNotificationsRead(tenantId, user.userId);
  }
}
