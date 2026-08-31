import type { EntitlementSource, EntitlementState, Tier } from '@/shared/types/entitlements';
import { ENTITLEMENT_GRACE_PERIOD_MS } from '@/shared/constants/tiers';

const SIGN_SEPARATOR = '.';

function getIntegrityMaterial(): Uint8Array {
  return new TextEncoder().encode(`${chrome.runtime.id}:formflow-entitlement-v1`);
}

async function importHmacKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    getIntegrityMaterial() as BufferSource,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

function payloadString(state: Pick<EntitlementState, 'tier' | 'source' | 'lastVerifiedAt'>): string {
  return JSON.stringify({
    tier: state.tier,
    source: state.source,
    lastVerifiedAt: state.lastVerifiedAt,
  });
}

export async function signEntitlement(
  state: Pick<EntitlementState, 'tier' | 'source' | 'lastVerifiedAt'>,
): Promise<string> {
  const key = await importHmacKey();
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payloadString(state)));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature)));
  return `${payloadString(state)}${SIGN_SEPARATOR}${sigB64}`;
}

export async function parseSignedEntitlement(raw: string): Promise<EntitlementState | null> {
  const sepIndex = raw.lastIndexOf(SIGN_SEPARATOR);
  if (sepIndex <= 0) return null;

  const payload = raw.slice(0, sepIndex);
  const sigB64 = raw.slice(sepIndex + 1);

  let parsed: Pick<EntitlementState, 'tier' | 'source' | 'lastVerifiedAt'>;
  try {
    parsed = JSON.parse(payload) as Pick<EntitlementState, 'tier' | 'source' | 'lastVerifiedAt'>;
  } catch {
    return null;
  }

  if (!parsed.tier || !parsed.source || typeof parsed.lastVerifiedAt !== 'number') return null;

  const key = await importHmacKey();
  const signature = Uint8Array.from(atob(sigB64), (c) => c.charCodeAt(0));
  const valid = await crypto.subtle.verify(
    'HMAC',
    key,
    signature,
    new TextEncoder().encode(payload),
  );

  if (!valid) return null;

  return {
    tier: parsed.tier,
    source: parsed.source,
    lastVerifiedAt: parsed.lastVerifiedAt,
    gracePeriodMs: ENTITLEMENT_GRACE_PERIOD_MS,
    integrity: raw,
  };
}

export async function buildSignedEntitlement(
  tier: Tier,
  source: EntitlementSource,
  lastVerifiedAt: number = Date.now(),
): Promise<EntitlementState> {
  const core = { tier, source, lastVerifiedAt };
  const integrity = await signEntitlement(core);
  return {
    ...core,
    gracePeriodMs: ENTITLEMENT_GRACE_PERIOD_MS,
    integrity,
  };
}

export function freeEntitlement(): EntitlementState {
  return {
    tier: 'FREE',
    source: 'free',
    lastVerifiedAt: 0,
    gracePeriodMs: ENTITLEMENT_GRACE_PERIOD_MS,
    integrity: '',
  };
}
