import { describe, expect, it } from 'vitest';
import { generateBoundaryValue } from '@/data-generators/boundary-overflow';

describe('generateBoundaryValue (FR-2.2)', () => {
  it('fills exactly to maxlength for AT_MAX', () => {
    expect(generateBoundaryValue(10, 'AT_MAX')).toHaveLength(10);
  });

  it('fills one over maxlength for OVER_MAX_BY_ONE', () => {
    expect(generateBoundaryValue(10, 'OVER_MAX_BY_ONE')).toHaveLength(11);
  });

  it('fills one hundred over maxlength for OVER_MAX_BY_HUNDRED', () => {
    expect(generateBoundaryValue(10, 'OVER_MAX_BY_HUNDRED')).toHaveLength(110);
  });

  it('produces a non-empty unicode stress string with a 4-byte emoji', () => {
    const value = generateBoundaryValue(10, 'UNICODE_STRESS');
    expect(value.length).toBeGreaterThan(0);
    expect(value).toMatch(/\u{1F600}/u);
  });

  it('falls back to a default length when maxlength is not set', () => {
    expect(generateBoundaryValue(null, 'AT_MAX')).toHaveLength(100);
  });
});
