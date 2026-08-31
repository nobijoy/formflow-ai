/**
 * Module 3 — FR-3.1 Static Heuristic Priority.
 *
 * Standard inputs (email, zip, password, phone) resolve via local regex
 * (<5ms, NFR-1) BEFORE any external LLM call. This is deliberately the same
 * heuristic table Module 2's Happy-Path preset uses — one regex table, two
 * call sites — so accuracy improvements benefit both without drifting apart.
 */

import { generateHappyPathValue, type FieldContext } from '@/data-generators/happy-path';

/**
 * Returns a value with zero network calls, or null if this field needs the
 * AI resolver (unlabelled/ambiguous field — see payload-sanitizer.ts).
 */
export function resolveViaStaticHeuristic(context: FieldContext): string | null {
  return generateHappyPathValue(context);
}
