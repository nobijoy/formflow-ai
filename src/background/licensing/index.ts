/**
 * Module 5 — FR-5.2 License & Paywall Gating, NFR-6 resilience.
 *
 * Single choke point for "is this feature allowed right now". Must never
 * hard-lock a paying user out over a network blip: on a failed remote
 * check, fall back to the cached entitlement if it's within
 * ENTITLEMENT_GRACE_PERIOD_MS of its last successful verification.
 */

import { ENTITLEMENT_GRACE_PERIOD_MS, TIER_FEATURES } from '@/shared/constants/tiers';
import type { EntitlementState, FeatureFlag } from '@/shared/types/entitlements';

const STORAGE_KEY = 'formflow.entitlement';

export async function getCachedEntitlement(): Promise<EntitlementState> {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  return (
    stored[STORAGE_KEY] ?? {
      tier: 'FREE',
      features: TIER_FEATURES.FREE,
      lastVerifiedAt: 0,
      gracePeriodMs: ENTITLEMENT_GRACE_PERIOD_MS,
    }
  );
}

export async function setCachedEntitlement(state: EntitlementState): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: state });
}

export function isWithinGracePeriod(state: EntitlementState, now: number): boolean {
  return now - state.lastVerifiedAt <= state.gracePeriodMs;
}

/**
 * Phase 5 will call the billing provider here and update the cache on
 * success. On failure, the caller should keep using getCachedEntitlement()
 * as-is if isWithinGracePeriod() is still true — never throw and block the
 * fill/record workflow (NFR-6).
 */
export async function verifyEntitlementRemote(): Promise<EntitlementState> {
  throw new Error('Not implemented: see docs/05-monetization-and-team-features.md Phase 5 checklist');
}

export async function hasFeature(feature: FeatureFlag): Promise<boolean> {
  const state = await getCachedEntitlement();
  return state.features.includes(feature);
}
