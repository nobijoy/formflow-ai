import type { ActionLedger } from '@/shared/schema/action-ledger';
import type { CompilerTarget } from '@/shared/types/entitlements';
import type { FrameworkCompiler } from './types';
import { playwrightCompiler } from './playwright';
import { cypressCompiler } from './cypress';
import { puppeteerCompiler } from './puppeteer';
import { seleniumCompiler } from './selenium';

const COMPILERS: Record<CompilerTarget, FrameworkCompiler> = {
  playwright: playwrightCompiler,
  cypress: cypressCompiler,
  puppeteer: puppeteerCompiler,
  selenium: seleniumCompiler,
};

/** Caller is responsible for checking entitlement (FR-5.2) before calling this. */
export function compileLedger(ledger: ActionLedger, target: CompilerTarget): string {
  return COMPILERS[target].compile(ledger);
}

export * from './types';
