import * as crypto from 'node:crypto';
import { SmsEventType } from '@repo/shared';

function deriveKey(secret: string): Buffer {
  return crypto.createHash('sha256').update(secret || 'default-sms-secret-key-32-chars').digest();
}

export function encryptApiKey(plainText: string, secret: string): string {
  const key = deriveKey(secret);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptApiKey(payload: string, secret: string): string {
  const parts = payload.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted API key format');
  }
  const [ivHex, tagHex, dataHex] = parts;
  const key = deriveKey(secret);
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(ivHex, 'hex'),
  );
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataHex, 'hex')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

export function maskApiKey(plainText: string): string {
  const trimmed = plainText.trim();
  if (trimmed.length <= 4) return '••••';
  return `••••••••${trimmed.slice(-4)}`;
}

/**
 * Normalizes Bangladeshi mobile numbers to BulkSMSBD format: 8801XXXXXXXXX (13 digits).
 * Accepts 017XXXXXXXX, +88017XXXXXXXX, 88017XXXXXXXX.
 */
export function normalizeBdPhone(raw?: string | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/[^\d]/g, '');
  let normalized = digits;
  if (digits.length === 11 && digits.startsWith('01')) {
    normalized = `88${digits}`;
  } else if (digits.length === 10 && digits.startsWith('1')) {
    normalized = `880${digits}`;
  }
  if (/^8801[3-9]\d{8}$/.test(normalized)) {
    return normalized;
  }
  return null;
}

export function renderSmsTemplate(
  template: string,
  vars: Record<string, string | number | undefined | null>,
): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key) => {
    const val = vars[key];
    return val !== undefined && val !== null ? String(val) : '';
  });
}

export function countSmsSegments(message: string): {
  length: number;
  isUnicode: boolean;
  segments: number;
} {
  const length = message.length;
  if (length === 0) {
    return { length: 0, isUnicode: false, segments: 0 };
  }
  // eslint-disable-next-line no-control-regex
  const isUnicode = /[^\x00-\x7F]/.test(message);
  if (isUnicode) {
    const segments = length <= 70 ? 1 : Math.ceil(length / 67);
    return { length, isUnicode: true, segments };
  }
  const segments = length <= 160 ? 1 : Math.ceil(length / 153);
  return { length, isUnicode: false, segments };
}

export const BULKSMSBD_CODE_MESSAGES: Record<string, string> = {
  '202': 'SMS Submitted Successfully',
  '1002': 'Sender ID is incorrect or disabled',
  '1003': 'Required fields missing',
  '1005': 'Gateway internal error',
  '1006': 'Balance validity not available',
  '1007': 'Insufficient SMS balance',
  '1011': 'User ID not found on gateway',
  '1012': 'Masking SMS must be sent in Bengali',
  '1013': 'Sender ID not found on gateway for this API key',
  '1032': 'Server IP is not whitelisted in BulkSMSBD panel',
};

export function parseBulkSmsBdSendResponse(rawText: string): {
  ok: boolean;
  code: string;
  description: string;
} {
  const trimmed = (rawText || '').trim();
  try {
    const parsed = JSON.parse(trimmed);
    const code = String(parsed.response_code ?? parsed.code ?? '');
    if (code === '202') {
      return {
        ok: true,
        code: '202',
        description:
          parsed.success_message ||
          parsed.message ||
          BULKSMSBD_CODE_MESSAGES['202'],
      };
    }
    return {
      ok: false,
      code: code || 'UNKNOWN',
      description:
        parsed.error_message ||
        parsed.message ||
        BULKSMSBD_CODE_MESSAGES[code] ||
        trimmed,
    };
  } catch {
    if (trimmed.startsWith('202') || trimmed.includes('202')) {
      return {
        ok: true,
        code: '202',
        description: BULKSMSBD_CODE_MESSAGES['202'],
      };
    }
    const matchedCode = Object.keys(BULKSMSBD_CODE_MESSAGES).find((c) =>
      trimmed.includes(c),
    );
    return {
      ok: false,
      code: matchedCode || 'ERROR',
      description: matchedCode
        ? BULKSMSBD_CODE_MESSAGES[matchedCode]
        : trimmed || 'Empty gateway response',
    };
  }
}

export function parseBulkSmsBdBalanceResponse(rawText: string): {
  ok: boolean;
  balance: string | null;
  raw: string;
} {
  const trimmed = (rawText || '').trim();
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed.balance !== undefined && parsed.balance !== null) {
      return { ok: true, balance: String(parsed.balance), raw: trimmed };
    }
    if (parsed.response_code && Number(parsed.response_code) !== 200 && Number(parsed.response_code) !== 202) {
      return { ok: false, balance: null, raw: parsed.error_message || trimmed };
    }
  } catch {
    // Plain numeric or string balance
    if (/^\d+(\.\d+)?$/.test(trimmed)) {
      return { ok: true, balance: trimmed, raw: trimmed };
    }
  }
  return { ok: false, balance: null, raw: trimmed };
}

export const DEFAULT_SMS_TEMPLATES: Array<{
  eventType: SmsEventType;
  body: string;
}> = [
  {
    eventType: SmsEventType.ADMISSION_RECEIVED,
    body: 'Dear {{studentName}}, your admission application for {{courseName}} at {{instituteName}} has been received.',
  },
  {
    eventType: SmsEventType.ADMISSION_APPROVED,
    body: 'Congratulations {{studentName}}! Your admission to {{courseName}} ({{batchName}}) at {{instituteName}} is approved.',
  },
  {
    eventType: SmsEventType.FEE_INVOICE_CREATED,
    body: 'Dear {{studentName}}, invoice {{invoiceNo}} of BDT {{amount}} (due {{dueDate}}) has been issued by {{instituteName}}.',
  },
  {
    eventType: SmsEventType.FEE_PAYMENT_RECEIVED,
    body: 'Payment of BDT {{amount}} received for {{invoiceNo}} (Receipt {{receiptNo}}). Thank you - {{instituteName}}.',
  },
  {
    eventType: SmsEventType.FEE_OVERDUE_REMINDER,
    body: 'Dear {{studentName}}, your fee due of BDT {{amount}} for {{invoiceNo}} ({{instituteName}}) was due on {{dueDate}}. Please pay promptly.',
  },
  {
    eventType: SmsEventType.ATTENDANCE_ABSENT,
    body: 'Notice from {{instituteName}}: {{studentName}} was marked ABSENT in {{batchName}} on {{date}}.',
  },
  {
    eventType: SmsEventType.EXAM_RESULT_PUBLISHED,
    body: '{{instituteName}}: {{examName}} result for {{studentName}} is published. Marks: {{marks}}/{{totalMarks}} (Grade: {{grade}}).',
  },
  {
    eventType: SmsEventType.PAYROLL_PAID,
    body: 'Dear {{staffName}}, your salary of BDT {{amount}} for {{period}} has been disbursed via {{method}} - {{instituteName}}.',
  },
];
