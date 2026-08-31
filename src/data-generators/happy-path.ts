/**
 * Module 2 — FR-2.1 Happy-Path preset. Free + Pro.
 *
 * Contextually accurate synthetic data via regex-based label heuristics —
 * runs before any AI call (see FR-3.1 static heuristic priority). Field-type
 * inference here is intentionally simple/fast (<5ms budget, NFR-1); anything
 * ambiguous falls through to Module 3's AI resolver instead of guessing.
 */

export interface FieldContext {
  type?: string;
  label?: string;
  placeholder?: string;
  name?: string;
}

const HEURISTICS: Array<{ pattern: RegExp; generate: () => string }> = [
  { pattern: /e-?mail/i, generate: () => 'qa.tester@example.com' },
  { pattern: /first\s?name/i, generate: () => 'Ada' },
  { pattern: /last\s?name/i, generate: () => 'Lovelace' },
  { pattern: /full\s?name|^name$/i, generate: () => 'Ada Lovelace' },
  { pattern: /phone|mobile|tel/i, generate: () => '+1-555-0100' },
  { pattern: /zip|postal/i, generate: () => '94105' },
  { pattern: /city/i, generate: () => 'San Francisco' },
  { pattern: /address/i, generate: () => '1 Market Street' },
  { pattern: /company|organi[sz]ation/i, generate: () => 'Acme Corp' },
  { pattern: /password/i, generate: () => 'Correct-Horse-Battery-9' },
  { pattern: /url|website/i, generate: () => 'https://example.com' },
];

/**
 * Returns a happy-path value for the field, or null if no heuristic matches
 * (caller should then try the AI resolver in Module 3 before giving up).
 */
export function generateHappyPathValue(context: FieldContext): string | null {
  const signal = [context.label, context.placeholder, context.name, context.type]
    .filter(Boolean)
    .join(' ');

  for (const { pattern, generate } of HEURISTICS) {
    if (pattern.test(signal)) return generate();
  }
  return null;
}
