import type { PresetMode } from '@/shared/schema/action-ledger';
import type { FeatureFlag } from '@/shared/types/entitlements';

/** Maps preset modes to Pro feature flags (FR-5.2). Happy-Path is ungated. */
export const PRESET_FEATURE_FLAGS: Partial<Record<PresetMode, FeatureFlag>> = {
  BOUNDARY_OVERFLOW: 'PRESET_BOUNDARY_OVERFLOW',
  VALIDATION_STRESS: 'PRESET_VALIDATION_STRESS',
  SECURITY_SANITY: 'PRESET_SECURITY_SANITY',
};

export function featureFlagForPreset(presetMode: PresetMode): FeatureFlag | null {
  return PRESET_FEATURE_FLAGS[presetMode] ?? null;
}

export function isProPreset(presetMode: PresetMode): boolean {
  return presetMode !== 'HAPPY_PATH';
}
