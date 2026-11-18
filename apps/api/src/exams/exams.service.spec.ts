import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { computeGrade, DEFAULT_GRADE_SCALES } from './exams.service';

describe('computeGrade', () => {
  it('returns A+ for 85/100', () => {
    const res = computeGrade(85, 100, 40, false, DEFAULT_GRADE_SCALES);
    assert.equal(res.grade, 'A+');
    assert.equal(res.gpaPoint, 5.0);
    assert.equal(res.passed, true);
    assert.equal(res.percent, 85);
  });

  it('returns F and passed=false when below passMarks even if scale matches', () => {
    const res = computeGrade(35, 100, 40, false, DEFAULT_GRADE_SCALES);
    assert.equal(res.grade, 'F');
    assert.equal(res.gpaPoint, 0);
    assert.equal(res.passed, false);
  });

  it('returns F and percent=0 when student is absent', () => {
    const res = computeGrade(90, 100, 40, true, DEFAULT_GRADE_SCALES);
    assert.equal(res.grade, 'F');
    assert.equal(res.gpaPoint, 0);
    assert.equal(res.passed, false);
    assert.equal(res.percent, 0);
  });

  it('scales non-100 totalMarks properly (e.g. 40/50 = 80% -> A+)', () => {
    const res = computeGrade(40, 50, 20, false, DEFAULT_GRADE_SCALES);
    assert.equal(res.percent, 80);
    assert.equal(res.grade, 'A+');
    assert.equal(res.passed, true);
  });
});
