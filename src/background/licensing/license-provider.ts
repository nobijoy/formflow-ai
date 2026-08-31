import { DEV_LICENSE_KEYS, LICENSE_VERIFY_URL } from '@/shared/constants/licensing';
import type { EntitlementSource, Tier } from '@/shared/types/entitlements';

export interface LicenseVerificationResult {
  tier: Tier;
  source: EntitlementSource;
  valid: boolean;
}

async function verifyRemoteLicense(licenseKey: string): Promise<LicenseVerificationResult | null> {
  try {
    const response = await fetch(LICENSE_VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ licenseKey }),
    });

    if (!response.ok) return null;

    const json = (await response.json()) as {
      valid?: boolean;
      tier?: Tier;
      source?: EntitlementSource;
    };

    if (!json.valid || !json.tier) return null;
    return {
      valid: true,
      tier: json.tier,
      source: json.source ?? 'subscription',
    };
  } catch {
    return null;
  }
}

function verifyDevLicense(licenseKey: string): LicenseVerificationResult | null {
  const normalized = licenseKey.trim().toUpperCase();
  const match = DEV_LICENSE_KEYS[normalized];
  if (!match) return null;
  return { valid: true, tier: match.tier, source: match.source };
}

/** Verifies a license key via remote billing provider, with dev-key fallback. */
export async function verifyLicenseKey(licenseKey: string): Promise<LicenseVerificationResult> {
  const trimmed = licenseKey.trim();
  if (!trimmed) {
    return { valid: false, tier: 'FREE', source: 'free' };
  }

  const remote = await verifyRemoteLicense(trimmed);
  if (remote?.valid) return remote;

  const dev = verifyDevLicense(trimmed);
  if (dev?.valid) return dev;

  return { valid: false, tier: 'FREE', source: 'free' };
}
