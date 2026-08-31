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

export type EntitlementSource =
  | 'free'
  | 'dev'
  | 'subscription'
  | 'founding_lifetime'
  | 'team';

/**
 * Entitlement cache shape (NFR-6). Features are derived from `tier` at runtime —
 * never persisted or trusted from storage (FR-5.2 tamper resistance).
 */
export interface EntitlementState {
  tier: Tier;
  source: EntitlementSource;
  lastVerifiedAt: number;
  gracePeriodMs: number;
  /** HMAC-signed payload; invalid signature → treat as FREE. */
  integrity: string;
}

export interface ManagedAiUsage {
  monthKey: string;
  used: number;
  quota: number;
}
