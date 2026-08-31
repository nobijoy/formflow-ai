/**
 * FR-2.4 — Security Sanity domain authorization (enforced outside the generator).
 *
 * Blocks injection on non-allow-listed domains until the tester explicitly
 * confirms they are authorized to test that domain. Confirmations persist per
 * hostname in chrome.storage.local.
 */

import { isDomainAllowListed } from '@/data-generators/security-sanity';

export const CONFIRMED_SECURITY_DOMAINS_KEY = 'formflow.security.confirmedDomains';

export async function getConfirmedSecurityDomains(): Promise<string[]> {
  const stored = await chrome.storage.local.get(CONFIRMED_SECURITY_DOMAINS_KEY);
  return (stored[CONFIRMED_SECURITY_DOMAINS_KEY] as string[] | undefined) ?? [];
}

export async function isSecurityFillAuthorized(hostname: string): Promise<boolean> {
  if (isDomainAllowListed(hostname)) return true;
  const confirmed = await getConfirmedSecurityDomains();
  return confirmed.includes(hostname);
}

export async function authorizeSecurityDomain(hostname: string): Promise<void> {
  const confirmed = await getConfirmedSecurityDomains();
  if (confirmed.includes(hostname)) return;
  await chrome.storage.local.set({
    [CONFIRMED_SECURITY_DOMAINS_KEY]: [...confirmed, hostname],
  });
}

export function hostnameFromUrl(url: string): string {
  return new URL(url).hostname;
}
