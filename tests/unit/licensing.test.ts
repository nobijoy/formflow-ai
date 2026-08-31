import { describe, expect, it, vi } from 'vitest';
import {
  buildSignedEntitlement,
  parseSignedEntitlement,
  signEntitlement,
} from '@/background/licensing/entitlement-integrity';
import { featuresForTier, tierHasFeature } from '@/shared/constants/tier-features';
import { verifyLicenseKey } from '@/background/licensing/license-provider';

vi.stubGlobal('chrome', {
  runtime: { id: 'test-extension-id' },
  storage: {
    local: {
      get: vi.fn(async () => ({})),
      set: vi.fn(async () => undefined),
      remove: vi.fn(async () => undefined),
    },
  },
});

describe('entitlement integrity', () => {
  it('signs and verifies entitlement payload', async () => {
    const signed = await signEntitlement({
      tier: 'PRO',
      source: 'subscription',
      lastVerifiedAt: 1_700_000_000_000,
    });
    const parsed = await parseSignedEntitlement(signed);
    expect(parsed).not.toBeNull();
    expect(parsed!.tier).toBe('PRO');
    expect(parsed!.source).toBe('subscription');
  });

  it('rejects tampered signature', async () => {
    const state = await buildSignedEntitlement('PRO', 'dev');
    const tampered = state.integrity.replace('"PRO"', '"TEAM"');
    const parsed = await parseSignedEntitlement(tampered);
    expect(parsed).toBeNull();
  });
});

describe('tier feature derivation', () => {
  it('derives Pro features from tier only', () => {
    const proFeatures = featuresForTier('PRO');
    expect(proFeatures).toContain('MANAGED_AI_INFERENCE');
    expect(proFeatures).toContain('MULTI_STEP_RECORDING');
    expect(featuresForTier('FREE')).toHaveLength(0);
  });

  it('does not grant Pro features to Free tier even if requested', () => {
    expect(tierHasFeature('FREE', 'COMPILER_CYPRESS')).toBe(false);
    expect(tierHasFeature('PRO', 'COMPILER_CYPRESS')).toBe(true);
  });
});

describe('license provider dev keys', () => {
  it('accepts dev Pro license key', async () => {
    const result = await verifyLicenseKey('FFAI-PRO-DEV-2026');
    expect(result.valid).toBe(true);
    expect(result.tier).toBe('PRO');
    expect(result.source).toBe('dev');
  });

  it('rejects unknown keys', async () => {
    const result = await verifyLicenseKey('INVALID-KEY');
    expect(result.valid).toBe(false);
    expect(result.tier).toBe('FREE');
  });
});
