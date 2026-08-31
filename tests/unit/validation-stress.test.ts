import { describe, expect, it } from 'vitest';
import { generateValidationStressValue } from '@/data-generators/validation-stress';

describe('generateValidationStressValue (FR-2.3)', () => {
  it('uses malformed TLD for email stress', () => {
    expect(generateValidationStressValue('MALFORMED_EMAIL_TLD')).toBe(
      'qa.tester@example.notarealtld',
    );
  });

  it('uses empty string for required-field stress', () => {
    expect(generateValidationStressValue('EMPTY_REQUIRED_FIELD')).toBe('');
  });

  it('uses non-numeric text for numeric fields', () => {
    expect(generateValidationStressValue('WRONG_TYPE_IN_NUMERIC')).toBe('not-a-number');
  });

  it('uses max safe integer for out-of-range numerics', () => {
    expect(generateValidationStressValue('NUMERIC_OUT_OF_RANGE')).toBe(
      String(Number.MAX_SAFE_INTEGER),
    );
  });
});
