import type { CompilerTarget } from '@/shared/types/entitlements';
import type { FeatureFlag } from '@/shared/types/entitlements';

/** Maps compiler targets to Pro feature flags. Playwright is Free (no flag). */
export const COMPILER_FEATURE_FLAGS: Partial<Record<CompilerTarget, FeatureFlag>> = {
  cypress: 'COMPILER_CYPRESS',
  puppeteer: 'COMPILER_PUPPETEER',
  selenium: 'COMPILER_SELENIUM',
};

export function featureFlagForCompiler(target: CompilerTarget): FeatureFlag | null {
  return COMPILER_FEATURE_FLAGS[target] ?? null;
}

export function isProCompilerTarget(target: CompilerTarget): boolean {
  return target !== 'playwright';
}
