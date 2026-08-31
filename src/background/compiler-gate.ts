/**
 * Phase 4 — compiler target Pro gating (FR-4.3, FR-5.2).
 */

import { featureFlagForCompiler } from '@/shared/constants/compiler-gating';
import { hasFeature } from '@/background/licensing';
import type { CompilerTarget } from '@/shared/types/entitlements';

export class CompilerGateError extends Error {
  readonly code = 'PRO_REQUIRED';

  constructor(message: string) {
    super(message);
    this.name = 'CompilerGateError';
  }
}

export function isCompilerGateError(err: unknown): err is CompilerGateError {
  return err instanceof CompilerGateError;
}

export async function assertCompilerAllowed(target: CompilerTarget): Promise<void> {
  const flag = featureFlagForCompiler(target);
  if (flag && !(await hasFeature(flag))) {
    throw new CompilerGateError(
      `${target} export requires FormFlow Pro. Enable “Simulate Pro” in Settings or upgrade when billing ships.`,
    );
  }
}
