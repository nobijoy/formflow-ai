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
  required?: boolean;
}

const HEURISTICS: Array<{ pattern: RegExp; generate: () => string }> = [
  { pattern: /e[\s-]?mail/i, generate: () => 'qa.tester@example.com' },
  { pattern: /first[\s_-]?name|given[\s_-]?name/i, generate: () => 'Ada' },
  { pattern: /last[\s_-]?name|surname|family[\s_-]?name/i, generate: () => 'Lovelace' },
  { pattern: /full[\s_-]?name|^name$/i, generate: () => 'Ada Lovelace' },
  { pattern: /phone|mobile|tel/i, generate: () => '+1-555-0100' },
  { pattern: /zip|postal/i, generate: () => '94105' },
  { pattern: /city|town/i, generate: () => 'San Francisco' },
  { pattern: /street|address|addr/i, generate: () => '1 Market Street' },
  { pattern: /company|organi[sz]ation|employer/i, generate: () => 'Acme Corp' },
  { pattern: /password|passwd/i, generate: () => 'Correct-Horse-Battery-9' },
  { pattern: /url|website|homepage/i, generate: () => 'https://example.com' },
  { pattern: /username|user[\s_-]?id|login/i, generate: () => 'qa_tester_01' },
  { pattern: /country/i, generate: () => 'United States' },
  { pattern: /state|province|region/i, generate: () => 'California' },
  { pattern: /birth|dob|date[\s_-]?of[\s_-]?birth/i, generate: () => '1990-01-15' },
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
