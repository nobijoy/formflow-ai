/** Licensing & managed-AI constants (Module 5). */
export const ENTITLEMENT_STORAGE_KEY = 'formflow.entitlement.v2';
export const LICENSE_KEY_STORAGE_KEY = 'formflow.license.encrypted';
export const MANAGED_AI_USAGE_KEY = 'formflow.managedAi.usage';
export const SAVED_FLOWS_STORAGE_KEY = 'formflow.savedFlows';

/** Placeholder — replace with ExtensionPay/Lemon Squeezy verify URL when live. */
export const LICENSE_VERIFY_URL = 'https://api.formflow.ai/v1/license/verify';

/** Opens in a new tab; low-permission checkout flow (FR-5.2). */
export const CHECKOUT_URL = 'https://formflow.ai/checkout';
export const FOUNDING_LIFETIME_CHECKOUT_URL = 'https://formflow.ai/founding-lifetime';

/** Pro tier managed-AI monthly quota (client-side backup; server enforces NFR-7). */
export const MANAGED_AI_MONTHLY_QUOTA = 500;

/** Free tier: one saved flow total. Pro: unlimited (FR-5.1). */
export const FREE_TIER_MAX_SAVED_FLOWS = 1;

/**
 * Dev/test license keys — accepted locally when remote verify is unreachable.
 * Document in Settings; replace with real keys from billing provider in production.
 */
export const DEV_LICENSE_KEYS: Record<string, { tier: 'PRO' | 'TEAM'; source: 'dev' | 'founding_lifetime' }> = {
  'FFAI-PRO-DEV-2026': { tier: 'PRO', source: 'dev' },
  'FFAI-LIFETIME-DEV-2026': { tier: 'PRO', source: 'founding_lifetime' },
  'FFAI-TEAM-DEV-2026': { tier: 'TEAM', source: 'dev' },
};

export const MANAGED_PROXY_ENDPOINT = 'https://api.formflow.ai/v1/infer';
