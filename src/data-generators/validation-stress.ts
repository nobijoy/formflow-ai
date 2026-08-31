/**
 * Module 2 — FR-2.3 Validation Stress preset. Pro.
 *
 * Malformed TLDs, out-of-range numerics, missing mandatory fields — designed
 * to exercise a form's validation logic, not its sanitization (that's
 * Security Sanity, FR-2.4).
 */

export type ValidationStressCase =
  | 'MALFORMED_EMAIL_TLD'
  | 'NUMERIC_OUT_OF_RANGE'
  | 'EMPTY_REQUIRED_FIELD'
  | 'WRONG_TYPE_IN_NUMERIC';

export function generateValidationStressValue(kind: ValidationStressCase): string {
  switch (kind) {
    case 'MALFORMED_EMAIL_TLD':
      return 'qa.tester@example.notarealtld';
    case 'NUMERIC_OUT_OF_RANGE':
      return String(Number.MAX_SAFE_INTEGER);
    case 'EMPTY_REQUIRED_FIELD':
      return '';
    case 'WRONG_TYPE_IN_NUMERIC':
      return 'not-a-number';
  }
}
