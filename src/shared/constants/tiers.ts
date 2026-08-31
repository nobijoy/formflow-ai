import type { FeatureFlag, Tier } from '@/shared/types/entitlements';

/**
 * Single source of truth for tier → feature gating (Section 9 pricing table).
 * Both the UI (to show/hide upsells) and the background licensing module (to
 * actually enforce gates) should read from this map, never hardcode a tier
 * check inline — keeps FR-5.2 enforcement auditable in one place.
 */
export const TIER_FEATURES: Record<Tier, FeatureFlag[]> = {
  FREE: [],
  PRO: [
    'PRESET_BOUNDARY_OVERFLOW',
    'PRESET_VALIDATION_STRESS',
    'PRESET_SECURITY_SANITY',
    'COMPILER_CYPRESS',
    'COMPILER_PUPPETEER',
    'COMPILER_SELENIUM',
    'MULTI_STEP_RECORDING',
    'SAVED_FLOWS_UNLIMITED',
    'MANAGED_AI_INFERENCE',
    'BUG_REPORT_GENERATOR',
  ],
  TEAM: [
    'PRESET_BOUNDARY_OVERFLOW',
    'PRESET_VALIDATION_STRESS',
    'PRESET_SECURITY_SANITY',
    'COMPILER_CYPRESS',
    'COMPILER_PUPPETEER',
    'COMPILER_SELENIUM',
    'MULTI_STEP_RECORDING',
    'SAVED_FLOWS_UNLIMITED',
    'MANAGED_AI_INFERENCE',
    'BUG_REPORT_GENERATOR',
    'TEAM_WORKSPACE',
  ],
};

/** NFR-6: grace period before a stale entitlement cache is distrusted. */
export const ENTITLEMENT_GRACE_PERIOD_MS = 72 * 60 * 60 * 1000;
