import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { computeNetSalary } from './payroll.service';

describe('computeNetSalary', () => {
  it('computes base + allowances + bonus - deductions', () => {
    assert.equal(computeNetSalary(30000, 2000, 1500, 5000), 35500);
  });

  it('defaults optional fields to 0', () => {
    assert.equal(computeNetSalary(25000), 25000);
  });

  it('clamps net salary to 0 when deductions exceed earnings', () => {
    assert.equal(computeNetSalary(10000, 0, 15000, 0), 0);
  });

  it('rounds to 2 decimal places', () => {
    assert.equal(computeNetSalary(10000.125, 500.333, 100.111, 0), 10400.35);
  });
});
