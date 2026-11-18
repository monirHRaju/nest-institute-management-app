import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import {
  countSmsSegments,
  decryptApiKey,
  encryptApiKey,
  maskApiKey,
  normalizeBdPhone,
  parseBulkSmsBdBalanceResponse,
  parseBulkSmsBdSendResponse,
  renderSmsTemplate,
} from './sms.utils';

describe('sms.utils', () => {
  it('encrypts, decrypts, and masks API keys accurately', () => {
    const raw = 'bsmsbd_live_987654321abcd';
    const secret = 'test-encryption-secret-32-chars!!';
    const encrypted = encryptApiKey(raw, secret);
    assert.notEqual(encrypted, raw);
    assert.equal(decryptApiKey(encrypted, secret), raw);
    assert.equal(maskApiKey(raw), '••••••••abcd');
  });

  it('normalizes Bangladeshi phone numbers to 8801XXXXXXXXX', () => {
    assert.equal(normalizeBdPhone('01712345678'), '8801712345678');
    assert.equal(normalizeBdPhone('+8801812-345678'), '8801812345678');
    assert.equal(normalizeBdPhone('8801912345678'), '8801912345678');
    assert.equal(normalizeBdPhone('12345'), null);
  });

  it('renders template placeholders cleanly', () => {
    const out = renderSmsTemplate(
      'Dear {{studentName}}, due BDT {{amount}} at {{instituteName}}.',
      { studentName: 'Rahim', amount: 2500, instituteName: 'Mtech IT' },
    );
    assert.equal(out, 'Dear Rahim, due BDT 2500 at Mtech IT.');
  });

  it('counts GSM-7 and Unicode/Bangla SMS segments properly', () => {
    const gsm = countSmsSegments('Hello world');
    assert.equal(gsm.isUnicode, false);
    assert.equal(gsm.segments, 1);

    const bangla = countSmsSegments('প্রিয় শিক্ষার্থী, আপনার ভর্তি নিশ্চিত হয়েছে।');
    assert.equal(bangla.isUnicode, true);
    assert.equal(bangla.segments, 1);
  });

  it('parses BulkSMSBD send & balance responses', () => {
    const okRes = parseBulkSmsBdSendResponse(
      JSON.stringify({ response_code: 202, success_message: 'SMS Submitted Successfully' }),
    );
    assert.equal(okRes.ok, true);
    assert.equal(okRes.code, '202');

    const errRes = parseBulkSmsBdSendResponse(
      JSON.stringify({ response_code: 1007, error_message: 'Balance Insufficient' }),
    );
    assert.equal(errRes.ok, false);
    assert.equal(errRes.code, '1007');

    const balRes = parseBulkSmsBdBalanceResponse(
      JSON.stringify({ response_code: 200, balance: '450.50' }),
    );
    assert.equal(balRes.ok, true);
    assert.equal(balRes.balance, '450.50');
  });
});
