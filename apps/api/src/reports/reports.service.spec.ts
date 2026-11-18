import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { escapeCsvCell, toCsvWithBom } from './reports.service';
import { formatStudentCode } from '../students/students.service';
import { matchesPhoneTail } from '../public/public.controller';

describe('Phase 6 Utilities (CSV, Student Code, Public Phone Lookup)', () => {
  it('escapes CSV cells containing commas, quotes, and newlines and prepends UTF-8 BOM', () => {
    assert.equal(escapeCsvCell('Hello, "World"'), '"Hello, ""World"""');
    const csv = toCsvWithBom(['Name', 'Note'], [['Rahim', 'Fee, Paid']]);
    assert.equal(csv.startsWith('\uFEFF'), true);
    assert.equal(csv, '\uFEFFName,Note\r\nRahim,"Fee, Paid"');
  });

  it('formats sequential student codes with zero-padding', () => {
    assert.equal(formatStudentCode(1, 2026), 'STU-2026-0001');
    assert.equal(formatStudentCode(42, 2026), 'STU-2026-0042');
  });

  it('verifies phone matches by full number or last 4 digits', () => {
    assert.equal(matchesPhoneTail('5678', ['01712345678']), true);
    assert.equal(matchesPhoneTail('01712345678', ['+8801712-345678']), true);
    assert.equal(matchesPhoneTail('9999', ['01712345678']), false);
    assert.equal(matchesPhoneTail('12', ['01712345678']), false);
  });
});
