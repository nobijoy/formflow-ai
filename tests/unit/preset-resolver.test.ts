import { describe, expect, it } from 'vitest';
import { resolvePresetValue } from '@/data-generators/preset-resolver';
import { isDomainAllowListed } from '@/data-generators/security-sanity';
import { featureFlagForPreset, isProPreset } from '@/shared/constants/preset-gating';

describe('resolvePresetValue (Phase 3)', () => {
  it('returns null for Happy-Path so AI/heuristic flow runs', () => {
    expect(
      resolvePresetValue('HAPPY_PATH', {
        context: { label: 'Email' },
        maxLength: 64,
        fieldIndex: 0,
      }),
    ).toBeNull();
  });

  it('generates boundary values from maxlength', () => {
    const value = resolvePresetValue('BOUNDARY_OVERFLOW', {
      context: { label: 'Name' },
      maxLength: 10,
      fieldIndex: 0,
    });
    expect(value).toHaveLength(10);
  });

  it('generates malformed email for validation stress on email fields', () => {
    const value = resolvePresetValue('VALIDATION_STRESS', {
      context: { label: 'Email Address', type: 'email' },
      maxLength: null,
      fieldIndex: 0,
    });
    expect(value).toContain('@example.notarealtld');
  });

  it('rotates security sanity payloads', () => {
    const first = resolvePresetValue('SECURITY_SANITY', {
      context: { label: 'Comment' },
      maxLength: null,
      fieldIndex: 0,
    });
    const second = resolvePresetValue('SECURITY_SANITY', {
      context: { label: 'Comment' },
      maxLength: null,
      fieldIndex: 1,
    });
    expect(first).not.toEqual(second);
    expect(first).toContain('<script>');
  });
});

describe('preset gating map', () => {
  it('maps Pro presets to feature flags', () => {
    expect(featureFlagForPreset('BOUNDARY_OVERFLOW')).toBe('PRESET_BOUNDARY_OVERFLOW');
    expect(featureFlagForPreset('HAPPY_PATH')).toBeNull();
    expect(isProPreset('VALIDATION_STRESS')).toBe(true);
  });
});

describe('security domain allow-list (FR-2.4)', () => {
  it('allows localhost and staging domains', () => {
    expect(isDomainAllowListed('localhost')).toBe(true);
    expect(isDomainAllowListed('app.staging.example.com')).toBe(true);
  });

  it('blocks arbitrary production domains by default', () => {
    expect(isDomainAllowListed('example.com')).toBe(false);
    expect(isDomainAllowListed('bankofamerica.com')).toBe(false);
  });
});
