/**
 * Module 2 — preset value dispatch (FR-2.1–FR-2.4).
 *
 * Pure functions only — no DOM types. Callers pass FieldContext + metadata.
 */

import type { FieldContext } from '@/data-generators/happy-path';
import {
  generateBoundaryValue,
  type BoundaryVariant,
} from '@/data-generators/boundary-overflow';
import {
  generateValidationStressValue,
  type ValidationStressCase,
} from '@/data-generators/validation-stress';
import {
  generateSecuritySanityValue,
  type SecuritySanityCase,
} from '@/data-generators/security-sanity';
import type { PresetMode } from '@/shared/schema/action-ledger';

export interface PresetFieldInput {
  context: FieldContext;
  maxLength: number | null;
  fieldIndex: number;
}

const BOUNDARY_ROTATION: BoundaryVariant[] = [
  'AT_MAX',
  'OVER_MAX_BY_ONE',
  'OVER_MAX_BY_HUNDRED',
  'UNICODE_STRESS',
];

const SECURITY_ROTATION: SecuritySanityCase[] = [
  'XSS_SCRIPT_TAG',
  'XSS_IMG_ONERROR',
  'SQL_ESCAPE_QUOTE',
  'SQL_COMMENT',
];

function pickValidationCase(context: FieldContext, fieldIndex: number): ValidationStressCase {
  const signal = [context.label, context.placeholder, context.name, context.type]
    .filter(Boolean)
    .join(' ');

  if (/e[\s-]?mail/i.test(signal) || context.type === 'email') {
    return 'MALFORMED_EMAIL_TLD';
  }
  if (context.type === 'number') {
    return fieldIndex % 2 === 0 ? 'NUMERIC_OUT_OF_RANGE' : 'WRONG_TYPE_IN_NUMERIC';
  }
  if (context.required && fieldIndex % 3 === 0) {
    return 'EMPTY_REQUIRED_FIELD';
  }

  const rotation: ValidationStressCase[] = [
    'MALFORMED_EMAIL_TLD',
    'NUMERIC_OUT_OF_RANGE',
    'EMPTY_REQUIRED_FIELD',
    'WRONG_TYPE_IN_NUMERIC',
  ];
  return rotation[fieldIndex % rotation.length];
}

/** Returns a preset value, or null if the caller should use Happy-Path + AI logic. */
export function resolvePresetValue(
  presetMode: PresetMode,
  input: PresetFieldInput,
): string | null {
  switch (presetMode) {
    case 'HAPPY_PATH':
      return null;
    case 'BOUNDARY_OVERFLOW':
      return generateBoundaryValue(
        input.maxLength,
        BOUNDARY_ROTATION[input.fieldIndex % BOUNDARY_ROTATION.length],
      );
    case 'VALIDATION_STRESS':
      return generateValidationStressValue(pickValidationCase(input.context, input.fieldIndex));
    case 'SECURITY_SANITY':
      return generateSecuritySanityValue(
        SECURITY_ROTATION[input.fieldIndex % SECURITY_ROTATION.length],
      );
  }
}
