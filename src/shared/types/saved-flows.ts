import type { ActionLedger } from '@/shared/schema/action-ledger';

export interface SavedFlow {
  id: string;
  name: string;
  domain: string;
  ledger: ActionLedger;
  savedAt: number;
}
