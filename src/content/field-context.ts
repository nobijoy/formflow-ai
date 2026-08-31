/**
 * Maps a live DOM element to the plain-data FieldContext shape used by
 * Module 2 preset generators — keeps generators free of Element types.
 */

import type { FieldContext } from '@/data-generators/happy-path';
import { getAccessibleLabel } from '@/content/locator-resolver';
import {
  sanitizePayload,
  type RawFieldSnippet,
} from '@/background/ai-router/payload-sanitizer';

const SKIP_INPUT_TYPES = new Set([
  'hidden',
  'submit',
  'button',
  'reset',
  'file',
  'image',
  'checkbox',
  'radio',
]);

export function isFillableInput(
  el: Element,
): el is HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement {
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) return true;
  if (el instanceof HTMLInputElement) return !SKIP_INPUT_TYPES.has(el.type);
  return false;
}

export function extractFieldContext(el: Element): FieldContext {
  if (!(el instanceof HTMLElement)) return {};

  const input = el as HTMLInputElement;
  return {
    type: input.type || el.tagName.toLowerCase(),
    name: input.name || undefined,
    placeholder: input.placeholder || undefined,
    label: getAccessibleLabel(el),
  };
}

/** Builds the sanitized snippet sent to the AI router (FR-3.2). */
export function extractFieldSnippet(el: Element): string {
  if (!(el instanceof HTMLElement)) return sanitizePayload({ tagName: 'unknown' });
  const input = el as HTMLInputElement;

  const snippet: RawFieldSnippet = {
    tagName: el.tagName.toLowerCase(),
    type: input.type || undefined,
    ariaLabel: el.getAttribute('aria-label') ?? undefined,
    placeholder: input.placeholder || undefined,
    parentLabelText: getAccessibleLabel(el),
  };

  return sanitizePayload(snippet);
}

/** Generic fallback when no heuristic matches and BYOK is not configured. */
export function genericFallback(context: FieldContext): string {
  if (context.type === 'email') return 'qa.tester@example.com';
  if (context.type === 'password') return 'Correct-Horse-Battery-9';
  if (context.type === 'tel') return '+1-555-0100';
  if (context.type === 'number') return '42';
  if (context.type === 'url') return 'https://example.com';
  return 'FormFlow test value';
}
