/**
 * Module 3 — FR-3.2 Sanitized Payload Extraction.
 *
 * Unlabelled inputs become a lightweight DOM snippet (aria-label,
 * placeholder, type, parent <label>) with PII stripped before anything
 * leaves the browser — this runs for BOTH BYOK and managed inference, since
 * managed inference proxies through FormFlow's own infrastructure and must
 * not become a PII pass-through.
 */

export interface RawFieldSnippet {
  tagName: string;
  type?: string;
  ariaLabel?: string;
  placeholder?: string;
  parentLabelText?: string;
}

const PII_PATTERNS: RegExp[] = [
  /\b[\w.+-]+@[\w-]+\.[a-z]{2,}\b/i, // email
  /\b\d{3}-\d{2}-\d{4}\b/, // SSN-shaped
  /\b(?:\d[ -]*?){13,16}\b/, // credit-card-shaped
];

function stripPii(text: string | undefined): string | undefined {
  if (!text) return text;
  return PII_PATTERNS.reduce((acc, pattern) => acc.replace(pattern, '[REDACTED]'), text);
}

/**
 * Produces the exact string sent as the LLM prompt context. Kept as a pure
 * function so it's trivially unit-testable against a fixture set of "should
 * strip" / "should pass through" snippets.
 */
export function sanitizePayload(snippet: RawFieldSnippet): string {
  const parts = [
    `tag=${snippet.tagName}`,
    snippet.type && `type=${snippet.type}`,
    stripPii(snippet.ariaLabel) && `aria-label="${stripPii(snippet.ariaLabel)}"`,
    stripPii(snippet.placeholder) && `placeholder="${stripPii(snippet.placeholder)}"`,
    stripPii(snippet.parentLabelText) && `label="${stripPii(snippet.parentLabelText)}"`,
  ].filter(Boolean);

  return parts.join(' ');
}
