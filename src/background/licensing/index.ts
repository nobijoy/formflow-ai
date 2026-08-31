/**
 * Module 5 — FR-5.2 License & Paywall Gating, NFR-6 resilience.
 *
 * Single choke point for "is this feature allowed right now". Must never
 * hard-lock a paying user out over a network blip: on a failed remote
 * check, fall back to the cached entitlement if it's within
 * ENTITLEMENT_GRACE_PERIOD_MS of its last successful verification.
 */

import {
  ENTITLEMENT_STORAGE_KEY,
} from '@/shared/constants/licensing';
import { featuresForTier } from '@/shared/constants/tier-features';
import { ENTITLEMENT_GRACE_PERIOD_MS } from '@/shared/constants/tiers';
import type { EntitlementSource, EntitlementState, FeatureFlag, Tier } from '@/shared/types/entitlements';
import {
  buildSignedEntitlement,
  freeEntitlement,
  parseSignedEntitlement,
} from '@/background/licensing/entitlement-integrity';
import { verifyLicenseKey } from '@/background/licensing/license-provider';
import {
  clearLicenseKey,
  getLicenseKey,
  storeLicenseKey,
} from '@/background/licensing/license-key-storage';

const LEGACY_STORAGE_KEY = 'formflow.entitlement';

interface LegacyEntitlement {
  tier?: Tier;
  features?: FeatureFlag[];
  lastVerifiedAt?: number;
  gracePeriodMs?: number;
}

async function migrateLegacyEntitlement(): Promise<EntitlementState | null> {
  const stored = await chrome.storage.local.get(LEGACY_STORAGE_KEY);
  const legacy = stored[LEGACY_STORAGE_KEY] as LegacyEntitlement | undefined;
  if (!legacy?.tier) return null;

  const source: EntitlementSource =
    legacy.tier === 'FREE' ? 'free' : 'dev';
  const state = await buildSignedEntitlement(
    legacy.tier,
    source,
    legacy.lastVerifiedAt ?? Date.now(),
  );
  await persistEntitlement(state);
  await chrome.storage.local.remove(LEGACY_STORAGE_KEY);
  return state;
}

export async function persistEntitlement(state: EntitlementState): Promise<void> {
  await chrome.storage.local.set({ [ENTITLEMENT_STORAGE_KEY]: state.integrity });
}

export async function getCachedEntitlement(): Promise<EntitlementState> {
  const stored = await chrome.storage.local.get(ENTITLEMENT_STORAGE_KEY);
  const raw = stored[ENTITLEMENT_STORAGE_KEY] as string | undefined;

  if (raw) {
    const parsed = await parseSignedEntitlement(raw);
    if (parsed) return parsed;
    // Tampered cache — distrust and reset (FR-5.2).
    const free = await buildSignedEntitlement('FREE', 'free', 0);
    await persistEntitlement(free);
    return free;
  }

  const migrated = await migrateLegacyEntitlement();
  if (migrated) return migrated;

  const initial = await buildSignedEntitlement('FREE', 'free', 0);
  await persistEntitlement(initial);
  return initial;
}

export function isWithinGracePeriod(state: EntitlementState, now: number = Date.now()): boolean {
  if (state.tier === 'FREE') return true;
  return now - state.lastVerifiedAt <= state.gracePeriodMs;
}

export async function hasFeature(feature: FeatureFlag): Promise<boolean> {
  const state = await getCachedEntitlement();
  return featuresForTier(state.tier).includes(feature);
}

export function derivedFeatures(state: EntitlementState): FeatureFlag[] {
  return featuresForTier(state.tier);
}

/**
 * Re-validates the stored license key with the billing provider.
 * On network failure, returns the cached entitlement if still within grace (NFR-6).
 */
export async function verifyEntitlementRemote(): Promise<EntitlementState> {
  const cached = await getCachedEntitlement();
  const licenseKey = await getLicenseKey();

  if (!licenseKey) {
    if (cached.source === 'dev' || cached.source === 'founding_lifetime') {
      return cached;
    }
    return cached;
  }

  const result = await verifyLicenseKey(licenseKey);
  if (result.valid) {
    const state = await buildSignedEntitlement(result.tier, result.source);
    await persistEntitlement(state);
    return state;
  }

  if (isWithinGracePeriod(cached)) {
    return cached;
  }

  await clearLicenseKey();
  const free = await buildSignedEntitlement('FREE', 'free', 0);
  await persistEntitlement(free);
  return free;
}

export async function activateLicenseKey(licenseKey: string): Promise<EntitlementState> {
  const result = await verifyLicenseKey(licenseKey);
  if (!result.valid) {
    throw new Error('Invalid license key. Check the key and try again.');
  }

  await storeLicenseKey(licenseKey);
  const state = await buildSignedEntitlement(result.tier, result.source);
  await persistEntitlement(state);
  return state;
}

export async function deactivateLicense(): Promise<EntitlementState> {
  await clearLicenseKey();
  const state = await buildSignedEntitlement('FREE', 'free', 0);
  await persistEntitlement(state);
  return state;
}

/** Dev-only helper — toggles Pro tier with a signed entitlement record. */
export async function setDevProTier(enabled: boolean): Promise<EntitlementState> {
  const state = enabled
    ? await buildSignedEntitlement('PRO', 'dev')
    : await buildSignedEntitlement('FREE', 'free', 0);
  await persistEntitlement(state);
  return state;
}

export { freeEntitlement, ENTITLEMENT_GRACE_PERIOD_MS };
