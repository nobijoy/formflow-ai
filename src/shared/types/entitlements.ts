/**
 * Tiering & entitlement types — Module 5 (FR-5.2). Kept separate from billing
 * implementation so both the popup UI and the background licensing module can
 * share one source of truth for "what does this tier unlock".
 */

export type Tier = 'FREE' | 'PRO' | 'TEAM';

export type CompilerTarget = 'playwright' | 'cypress' | 'puppeteer' | 'selenium';

export type FeatureFlag =
  | 'PRESET_BOUNDARY_OVERFLOW'
  | 'PRESET_VALIDATION_STRESS'
  | 'PRESET_SECURITY_SANITY'
  | 'COMPILER_CYPRESS'
  | 'COMPILER_PUPPETEER'
  | 'COMPILER_SELENIUM'
  | 'MULTI_STEP_RECORDING'
  | 'SAVED_FLOWS_UNLIMITED'
  | 'MANAGED_AI_INFERENCE'
  | 'BUG_REPORT_GENERATOR'
  | 'TEAM_WORKSPACE';

/**
 * Entitlement cache shape (NFR-6). Must be checked locally first; a stale
 * cache within `gracePeriodMs` of `lastVerifiedAt` is treated as valid so a
 * billing-provider outage never hard-locks a paying user out.
 */
export interface EntitlementState {
  tier: Tier;
  features: FeatureFlag[];
  lastVerifiedAt: number;
  gracePeriodMs: number;
}
