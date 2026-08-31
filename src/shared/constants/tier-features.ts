import type { FeatureFlag, Tier } from '@/shared/types/entitlements';
import { TIER_FEATURES } from '@/shared/constants/tiers';

/** Features are always derived from tier — never trust a stored features array (FR-5.2). */
export function featuresForTier(tier: Tier): FeatureFlag[] {
  return TIER_FEATURES[tier];
}

export function tierHasFeature(tier: Tier, feature: FeatureFlag): boolean {
  return featuresForTier(tier).includes(feature);
}
