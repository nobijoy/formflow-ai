/**
 * Module 2 — FR-2.4 Security Sanity preset. Pro.
 *
 * Non-destructive XSS strings and standard SQL escape sequences to check
 * sanitization. GUARDRAIL (see docs/02-data-generation-preset-engine.md):
 * this preset must never run against a domain that isn't on the allow-list
 * without an explicit "I'm authorized to test this domain" confirmation —
 * enforced by the caller in src/background, not here. This module only
 * generates payload strings; it has no domain-authorization logic itself.
 */

export type SecuritySanityCase = 'XSS_SCRIPT_TAG' | 'XSS_IMG_ONERROR' | 'SQL_ESCAPE_QUOTE' | 'SQL_COMMENT';

const PAYLOADS: Record<SecuritySanityCase, string> = {
  // Non-destructive: alert() only, no exfiltration/network calls.
  XSS_SCRIPT_TAG: '<script>alert(1)</script>',
  XSS_IMG_ONERROR: '<img src=x onerror=alert(1)>',
  SQL_ESCAPE_QUOTE: "' OR '1'='1",
  SQL_COMMENT: "admin'--",
};

export function generateSecuritySanityValue(kind: SecuritySanityCase): string {
  return PAYLOADS[kind];
}

export const DEFAULT_ALLOWLIST_PATTERNS: RegExp[] = [/^localhost$/, /^127\.0\.0\.1$/, /\.staging\./];

export function isDomainAllowListed(hostname: string): boolean {
  return DEFAULT_ALLOWLIST_PATTERNS.some((pattern) => pattern.test(hostname));
}
