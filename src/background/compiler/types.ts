import type { ActionLedger } from '@/shared/schema/action-ledger';
import type { CompilerTarget } from '@/shared/types/entitlements';

/**
 * Contract every framework compiler (playwright.ts, cypress.ts, ...) must
 * implement. Keeping this narrow means adding a new target is "implement
 * this one function" — see .cursor/skills/add-compiler-target for the
 * step-by-step checklist.
 */
export interface FrameworkCompiler {
  target: CompilerTarget;
  compile(ledger: ActionLedger): string;
}
