/**
 * Multi-step recording Pro gate (FR-5.2 / MULTI_STEP_RECORDING).
 */

import type { ActionLedger } from '@/shared/schema/action-ledger';
import { hasFeature } from '@/background/licensing';

export type RecordingGateErrorCode = 'MULTI_STEP_PRO_REQUIRED';

export class RecordingGateError extends Error {
  readonly code: RecordingGateErrorCode;

  constructor(code: RecordingGateErrorCode, message: string) {
    super(message);
    this.name = 'RecordingGateError';
    this.code = code;
  }
}

export function isRecordingGateError(err: unknown): err is RecordingGateError {
  return err instanceof RecordingGateError;
}

function navigateStepCount(ledger: ActionLedger): number {
  return ledger.actions.filter((a) => a.type === 'NAVIGATE').length;
}

export async function assertMultiStepAllowed(ledger: ActionLedger): Promise<void> {
  if (navigateStepCount(ledger) <= 1) return;

  if (await hasFeature('MULTI_STEP_RECORDING')) return;

  throw new RecordingGateError(
    'MULTI_STEP_PRO_REQUIRED',
    'Multi-step flows (more than one page navigation) require FormFlow Pro.',
  );
}
