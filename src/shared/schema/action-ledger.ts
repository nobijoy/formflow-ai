/**
 * Neutral Action Ledger — Module 4 (FR-4.2).
 *
 * Framework-agnostic intermediate representation of a recorded session.
 * The compiler layer (src/background/compiler) turns this into Playwright /
 * Cypress / Puppeteer / Selenium source; nothing upstream of this schema
 * should know about any specific test framework.
 *
 * See docs/04-action-ledger-and-compiler.md for the full spec and rationale.
 */

export type ActionType = 'FILL' | 'CLICK' | 'SELECT' | 'CHECK' | 'NAVIGATE' | 'ASSERT';

/**
 * Locator candidates in priority order (FR-4.1). The compiler picks the
 * highest-priority field that is present: role+label > label > testId > css.
 */
export interface TargetLocator {
  role?: string;
  label?: string;
  testId?: string;
  css?: string;
}

export type PresetMode =
  | 'HAPPY_PATH'
  | 'BOUNDARY_OVERFLOW'
  | 'VALIDATION_STRESS'
  | 'SECURITY_SANITY';

export interface LedgerAction {
  step: number;
  type: ActionType;
  target: TargetLocator;
  /** Present for FILL/SELECT actions. */
  value?: string;
  /** Which preset engine (Module 2) produced `value`, if any. */
  presetMode?: PresetMode;
  /** Present for NAVIGATE actions — supports multi-step/multi-page flows (FR-4.4). */
  url?: string;
}

export interface ActionLedger {
  sessionId: string;
  timestamp: number;
  /** Origin the recording started on; used for the Security Sanity allow-list (FR-2.4). */
  originDomain?: string;
  actions: LedgerAction[];
}
