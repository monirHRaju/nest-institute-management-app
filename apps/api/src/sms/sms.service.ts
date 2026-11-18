import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  SendBulkSmsDto,
  SendTestSmsDto,
  SmsEventType,
  SmsStatus,
  UpdateSmsSettingsDto,
  UpsertSmsTemplatesDto,
} from '@repo/shared';
import { PrismaService } from '../prisma/prisma.service';
import {
  countSmsSegments,
  decryptApiKey,
  DEFAULT_SMS_TEMPLATES,
  encryptApiKey,
  maskApiKey,
  normalizeBdPhone,
  parseBulkSmsBdBalanceResponse,
  parseBulkSmsBdSendResponse,
  renderSmsTemplate,
} from './sms.utils';

const BULKSMSBD_SEND_URL = 'https://bulksmsbd.net/api/smsapi';
const BULKSMSBD_BALANCE_URL = 'https://bulksmsbd.net/api/getBalanceApi';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private getEncryptionSecret(): string {
    return (
      this.config.get<string>('SMS_ENCRYPTION_KEY') ||
      this.config.get<string>('JWT_ACCESS_SECRET') ||
      'default-sms-encryption-secret-32c'
    );
  }

  private sanitizeSettings(settings: any) {
    if (!settings) {
      return {
        provider: 'BULKSMSBD',
        hasApiKey: false,
        apiKeyHint: null,
        senderId: '',
        adminPhone: '',
        isEnabled: false,
        enabledEvents: {},
        lastBalance: null,
        lastBalanceAt: null,
      };
    }
    return {
      id: settings.id,
      provider: settings.provider,
      hasApiKey: Boolean(settings.apiKeyEncrypted),
      apiKeyHint: settings.apiKeyHint || null,
      senderId: settings.senderId || '',
      adminPhone: settings.adminPhone || '',
      isEnabled: settings.isEnabled,
      enabledEvents: (settings.enabledEvents as Record<string, boolean>) || {},
      lastBalance: settings.lastBalance,
      lastBalanceAt: settings.lastBalanceAt,
      updatedAt: settings.updatedAt,
    };
  }

  // ── 1. Per-Tenant Settings ─────────────────────────────────────────────────

  async getSettings(tenantId: string) {
    if (!tenantId) throw new BadRequestException('Tenant context is required');
    const settings = await this.prisma.smsSettings.findUnique({
      where: { tenantId },
    });
    return this.sanitizeSettings(settings);
  }

  async updateSettings(tenantId: string, dto: UpdateSmsSettingsDto) {
    if (!tenantId) throw new BadRequestException('Tenant context is required');

    const existing = await this.prisma.smsSettings.findUnique({
      where: { tenantId },
    });

    const data: any = {};
    if (dto.senderId !== undefined) data.senderId = dto.senderId?.trim() || null;
    if (dto.adminPhone !== undefined) {
      data.adminPhone = dto.adminPhone?.trim() || null;
    }
    if (dto.isEnabled !== undefined) data.isEnabled = dto.isEnabled;
    if (dto.enabledEvents !== undefined) data.enabledEvents = dto.enabledEvents;

    const rawKey = dto.apiKey?.trim();
    if (rawKey && !rawKey.startsWith('••••')) {
      data.apiKeyEncrypted = encryptApiKey(rawKey, this.getEncryptionSecret());
      data.apiKeyHint = maskApiKey(rawKey);
    }

    const saved = existing
      ? await this.prisma.smsSettings.update({
          where: { tenantId },
          data,
        })
      : await this.prisma.smsSettings.create({
          data: {
            tenantId,
            ...data,
          },
        });

    return this.sanitizeSettings(saved);
  }

  // ── 2. Balance Check & Test SMS (BulkSMSBD) ────────────────────────────────

  private async getDecryptedCredentials(tenantId: string): Promise<{
    apiKey: string | null;
    senderId: string | null;
    adminPhone: string | null;
    isEnabled: boolean;
    enabledEvents: Record<string, boolean>;
  }> {
    const settings = await this.prisma.smsSettings.findUnique({
      where: { tenantId },
    });
    if (!settings) {
      return {
        apiKey: null,
        senderId: null,
        adminPhone: null,
        isEnabled: false,
        enabledEvents: {},
      };
    }

    let apiKey: string | null = null;
    if (settings.apiKeyEncrypted) {
      try {
        apiKey = decryptApiKey(
          settings.apiKeyEncrypted,
          this.getEncryptionSecret(),
        );
      } catch (e) {
        this.logger.warn(`Failed to decrypt SMS API key for tenant ${tenantId}`);
      }
    }

    return {
      apiKey,
      senderId: settings.senderId,
      adminPhone: settings.adminPhone,
      isEnabled: settings.isEnabled,
      enabledEvents: (settings.enabledEvents as Record<string, boolean>) || {},
    };
  }

  async checkBalance(tenantId: string) {
    if (!tenantId) throw new BadRequestException('Tenant context is required');
    const creds = await this.getDecryptedCredentials(tenantId);
    if (!creds.apiKey) {
      throw new BadRequestException(
        'BulkSMSBD API key is not configured for this institute',
      );
    }

    const url = `${BULKSMSBD_BALANCE_URL}?api_key=${encodeURIComponent(creds.apiKey)}`;
    let rawText = '';
    try {
      const res = await fetch(url, { method: 'GET' });
      rawText = await res.text();
    } catch (e: any) {
      throw new BadRequestException(
        `Could not reach BulkSMSBD balance endpoint: ${e?.message || e}`,
      );
    }

    const parsed = parseBulkSmsBdBalanceResponse(rawText);
    if (!parsed.ok || parsed.balance === null) {
      throw new BadRequestException(
        `BulkSMSBD balance check failed: ${parsed.raw}`,
      );
    }

    const now = new Date();
    await this.prisma.smsSettings.update({
      where: { tenantId },
      data: {
        lastBalance: parsed.balance,
        lastBalanceAt: now,
      },
    });

    return {
      balance: parsed.balance,
      checkedAt: now.toISOString(),
    };
  }

  async sendViaBulkSmsBd(params: {
    tenantId: string;
    phones: string[];
    message: string;
    eventType: SmsEventType;
    relatedType?: string;
    relatedId?: string;
    requireEnabled?: boolean;
  }) {
    const {
      tenantId,
      phones,
      message,
      eventType,
      relatedType,
      relatedId,
      requireEnabled = false,
    } = params;

    const normalizedPhones = Array.from(
      new Set(
        phones
          .map((p) => normalizeBdPhone(p))
          .filter((p): p is string => Boolean(p)),
      ),
    );

    if (normalizedPhones.length === 0) {
      return {
        sent: false,
        status: SmsStatus.SKIPPED,
        reason: 'No valid Bangladeshi mobile numbers',
        logs: [],
      };
    }

    const creds = await this.getDecryptedCredentials(tenantId);
    const { segments } = countSmsSegments(message);

    if (requireEnabled && !creds.isEnabled) {
      const logs = await this.createLogs(tenantId, normalizedPhones, {
        message,
        eventType,
        status: SmsStatus.SKIPPED,
        providerCode: 'DISABLED',
        providerResponse: 'SMS gateway is disabled in tenant settings',
        segments,
        relatedType,
        relatedId,
      });
      return {
        sent: false,
        status: SmsStatus.SKIPPED,
        reason: 'SMS gateway is disabled',
        logs,
      };
    }

    if (!creds.apiKey || !creds.senderId) {
      const logs = await this.createLogs(tenantId, normalizedPhones, {
        message,
        eventType,
        status: SmsStatus.SKIPPED,
        providerCode: 'UNCONFIGURED',
        providerResponse: 'Missing BulkSMSBD API key or Sender ID',
        segments,
        relatedType,
        relatedId,
      });
      return {
        sent: false,
        status: SmsStatus.SKIPPED,
        reason: 'Missing BulkSMSBD API key or Sender ID',
        logs,
      };
    }

    let status: SmsStatus = SmsStatus.FAILED;
    let providerCode = 'NETWORK_ERR';
    let providerResponse = '';

    try {
      const form = new URLSearchParams();
      form.set('api_key', creds.apiKey);
      form.set('senderid', creds.senderId);
      form.set('type', 'text');
      form.set('number', normalizedPhones.join(','));
      form.set('message', message);

      const res = await fetch(BULKSMSBD_SEND_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: form.toString(),
      });
      const rawText = await res.text();
      const parsed = parseBulkSmsBdSendResponse(rawText);
      status = parsed.ok ? SmsStatus.SENT : SmsStatus.FAILED;
      providerCode = parsed.code;
      providerResponse = parsed.description;
    } catch (e: any) {
      this.logger.warn(`BulkSMSBD send failed for tenant ${tenantId}: ${e}`);
      status = SmsStatus.FAILED;
      providerResponse = e?.message || 'Network error calling BulkSMSBD';
    }

    const logs = await this.createLogs(tenantId, normalizedPhones, {
      message,
      eventType,
      status,
      providerCode,
      providerResponse,
      segments,
      relatedType,
      relatedId,
    });

    return {
      sent: status === SmsStatus.SENT,
      status,
      providerCode,
      providerResponse,
      recipientCount: normalizedPhones.length,
      segments,
      logs,
    };
  }

  private async createLogs(
    tenantId: string,
    phones: string[],
    meta: {
      message: string;
      eventType: SmsEventType;
      status: SmsStatus;
      providerCode: string;
      providerResponse: string;
      segments: number;
      relatedType?: string;
      relatedId?: string;
    },
  ) {
    return this.prisma.$transaction(
      phones.map((phone) =>
        this.prisma.smsLog.create({
          data: {
            tenantId,
            phone,
            message: meta.message,
            eventType: meta.eventType,
            status: meta.status,
            provider: 'BULKSMSBD',
            providerCode: meta.providerCode,
            providerResponse: meta.providerResponse,
            segments: meta.segments,
            relatedType: meta.relatedType ?? null,
            relatedId: meta.relatedId ?? null,
          },
        }),
      ),
    );
  }

  async sendTestSms(tenantId: string, dto: SendTestSmsDto) {
    if (!tenantId) throw new BadRequestException('Tenant context is required');
    const creds = await this.getDecryptedCredentials(tenantId);
    const targetPhone = dto.phone?.trim() || creds.adminPhone;
    if (!targetPhone) {
      throw new BadRequestException(
        'Provide a test phone number or configure an Admin Phone in SMS settings',
      );
    }

    const normalized = normalizeBdPhone(targetPhone);
    if (!normalized) {
      throw new BadRequestException(
        'Invalid Bangladeshi mobile number (expected 01XXXXXXXXX or 8801XXXXXXXXX)',
      );
    }

    if (!creds.apiKey || !creds.senderId) {
      throw new BadRequestException(
        'Please save your BulkSMSBD API Key and Sender ID before sending a test SMS',
      );
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true },
    });

    const msg =
      dto.message?.trim() ||
      `Test SMS from ${tenant?.name || 'Institute'} via BulkSMSBD gateway.`;

    return this.sendViaBulkSmsBd({
      tenantId,
      phones: [normalized],
      message: msg,
      eventType: SmsEventType.TEST_SMS,
      requireEnabled: false,
    });
  }

  // ── 3. Templates & Event Dispatch ──────────────────────────────────────────

  async getTemplates(tenantId: string) {
    if (!tenantId) throw new BadRequestException('Tenant context is required');

    const existing = await this.prisma.smsTemplate.findMany({
      where: { tenantId },
    });

    if (existing.length === 0) {
      await this.prisma.smsTemplate.createMany({
        data: DEFAULT_SMS_TEMPLATES.map((t) => ({
          tenantId,
          eventType: t.eventType,
          body: t.body,
          isActive: true,
        })),
      });
      return this.prisma.smsTemplate.findMany({
        where: { tenantId },
        orderBy: { eventType: 'asc' },
      });
    }

    return existing;
  }

  async upsertTemplates(tenantId: string, dto: UpsertSmsTemplatesDto) {
    if (!tenantId) throw new BadRequestException('Tenant context is required');

    await this.prisma.$transaction(
      dto.templates.map((t) =>
        this.prisma.smsTemplate.upsert({
          where: {
            tenantId_eventType: {
              tenantId,
              eventType: t.eventType,
            },
          },
          create: {
            tenantId,
            eventType: t.eventType,
            body: t.body,
            isActive: t.isActive,
          },
          update: {
            body: t.body,
            isActive: t.isActive,
          },
        }),
      ),
    );

    return this.getTemplates(tenantId);
  }

  async dispatchEventSms(params: {
    tenantId: string;
    eventType: SmsEventType;
    phones: Array<string | null | undefined>;
    vars: Record<string, string | number | null | undefined>;
    relatedType?: string;
    relatedId?: string;
    force?: boolean;
    notifyAdminAlso?: boolean;
  }) {
    try {
      const {
        tenantId,
        eventType,
        phones,
        vars,
        relatedType,
        relatedId,
        force = false,
        notifyAdminAlso = false,
      } = params;

      const creds = await this.getDecryptedCredentials(tenantId);
      if (!force) {
        if (!creds.isEnabled) return null;
        if (!creds.enabledEvents[eventType]) return null;
      }

      const templateRow = await this.prisma.smsTemplate.findUnique({
        where: {
          tenantId_eventType: {
            tenantId,
            eventType,
          },
        },
      });

      if (templateRow && !templateRow.isActive && !force) {
        return null;
      }

      const fallbackBody =
        DEFAULT_SMS_TEMPLATES.find((t) => t.eventType === eventType)?.body ||
        'Notification from {{instituteName}}';
      const bodyTemplate = templateRow?.body || fallbackBody;
      const message = renderSmsTemplate(bodyTemplate, vars);

      const allPhones = phones.filter((p): p is string => Boolean(p));
      if (notifyAdminAlso && creds.adminPhone) {
        allPhones.push(creds.adminPhone);
      }

      return await this.sendViaBulkSmsBd({
        tenantId,
        phones: allPhones,
        message,
        eventType,
        relatedType,
        relatedId,
        requireEnabled: !force,
      });
    } catch (err) {
      this.logger.warn(`Event SMS dispatch error (${params.eventType}): ${err}`);
      return null;
    }
  }

  // ── 4. Manual / Bulk Send & Logs ───────────────────────────────────────────

  async sendBulkSms(tenantId: string, dto: SendBulkSmsDto) {
    if (!tenantId) throw new BadRequestException('Tenant context is required');

    let phones: string[] = [];

    if (dto.targetType === 'CUSTOM') {
      phones = dto.customPhones || [];
    } else if (dto.targetType === 'BATCH') {
      if (!dto.batchId) throw new BadRequestException('Batch ID is required');
      const students = await this.prisma.student.findMany({
        where: { tenantId, batchId: dto.batchId },
        include: { user: { select: { phone: true } } },
      });
      phones = students
        .map((s) => s.user.phone || s.guardianPhone)
        .filter((p): p is string => Boolean(p));
    } else if (dto.targetType === 'COURSE') {
      if (!dto.courseId) throw new BadRequestException('Course ID is required');
      const students = await this.prisma.student.findMany({
        where: { tenantId, batch: { courseId: dto.courseId } },
        include: { user: { select: { phone: true } } },
      });
      phones = students
        .map((s) => s.user.phone || s.guardianPhone)
        .filter((p): p is string => Boolean(p));
    } else if (dto.targetType === 'ALL_STUDENTS') {
      const students = await this.prisma.student.findMany({
        where: { tenantId, user: { isActive: true } },
        include: { user: { select: { phone: true } } },
      });
      phones = students
        .map((s) => s.user.phone || s.guardianPhone)
        .filter((p): p is string => Boolean(p));
    } else if (dto.targetType === 'ALL_STAFF') {
      const staff = await this.prisma.staffProfile.findMany({
        where: { tenantId, isActive: true },
        include: { user: { select: { phone: true } } },
      });
      phones = staff
        .map((s) => s.user.phone || s.mobileWallet)
        .filter((p): p is string => Boolean(p));
    }

    return this.sendViaBulkSmsBd({
      tenantId,
      phones,
      message: dto.message.trim(),
      eventType: SmsEventType.CUSTOM_BULK,
      requireEnabled: false,
    });
  }

  async getLogs(
    tenantId: string,
    query: { status?: string; eventType?: string; search?: string } = {},
  ) {
    if (!tenantId) throw new BadRequestException('Tenant context is required');
    const where: any = { tenantId };
    if (query.status) where.status = query.status;
    if (query.eventType) where.eventType = query.eventType;
    if (query.search?.trim()) {
      const term = query.search.trim();
      where.OR = [
        { phone: { contains: term, mode: 'insensitive' } },
        { message: { contains: term, mode: 'insensitive' } },
      ];
    }

    return this.prisma.smsLog.findMany({
      where,
      orderBy: { sentAt: 'desc' },
      take: 200,
    });
  }

  async retryLog(tenantId: string, id: string) {
    if (!tenantId) throw new BadRequestException('Tenant context is required');
    const log = await this.prisma.smsLog.findFirst({
      where: { id, tenantId },
    });
    if (!log) throw new NotFoundException('SMS log not found');

    return this.sendViaBulkSmsBd({
      tenantId,
      phones: [log.phone],
      message: log.message,
      eventType: log.eventType as unknown as SmsEventType,
      relatedType: log.relatedType ?? undefined,
      relatedId: log.relatedId ?? undefined,
      requireEnabled: false,
    });
  }

  // ── 5. In-App Notifications ────────────────────────────────────────────────

  async getNotifications(tenantId: string, userId: string) {
    if (!tenantId) throw new BadRequestException('Tenant context is required');
    const items = await this.prisma.notification.findMany({
      where: { tenantId, userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const unreadCount = items.filter((n) => !n.isRead).length;
    return { unreadCount, items };
  }

  async markNotificationRead(tenantId: string, userId: string, id: string) {
    await this.prisma.notification.updateMany({
      where: { id, tenantId, userId },
      data: { isRead: true },
    });
    return { success: true };
  }

  async markAllNotificationsRead(tenantId: string, userId: string) {
    await this.prisma.notification.updateMany({
      where: { tenantId, userId, isRead: false },
      data: { isRead: true },
    });
    return { success: true };
  }

  async createInAppNotification(params: {
    tenantId: string;
    userId: string;
    title: string;
    body: string;
    type?: string;
    link?: string;
  }) {
    try {
      return await this.prisma.notification.create({
        data: {
          tenantId: params.tenantId,
          userId: params.userId,
          title: params.title,
          body: params.body,
          type: params.type || 'INFO',
          link: params.link ?? null,
        },
      });
    } catch {
      return null;
    }
  }
}
