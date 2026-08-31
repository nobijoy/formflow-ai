/**
 * Module 5 — FR-5.1 Saved flows (Free: 1 total, Pro: unlimited per domain).
 */

import {
  FREE_TIER_MAX_SAVED_FLOWS,
  SAVED_FLOWS_STORAGE_KEY,
} from '@/shared/constants/licensing';
import type { ActionLedger } from '@/shared/schema/action-ledger';
import { hasFeature } from '@/background/licensing';

import type { SavedFlow } from '@/shared/types/saved-flows';

export type SavedFlowErrorCode = 'FLOW_LIMIT_REACHED' | 'FLOW_NOT_FOUND';

export type { SavedFlow };

export class SavedFlowError extends Error {
  readonly code: SavedFlowErrorCode;

  constructor(code: SavedFlowErrorCode, message: string) {
    super(message);
    this.name = 'SavedFlowError';
    this.code = code;
  }
}

export function isSavedFlowError(err: unknown): err is SavedFlowError {
  return err instanceof SavedFlowError;
}

function createFlowId(): string {
  return `flow_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function loadAllFlows(): Promise<SavedFlow[]> {
  const stored = await chrome.storage.local.get(SAVED_FLOWS_STORAGE_KEY);
  return (stored[SAVED_FLOWS_STORAGE_KEY] as SavedFlow[] | undefined) ?? [];
}

async function persistFlows(flows: SavedFlow[]): Promise<void> {
  await chrome.storage.local.set({ [SAVED_FLOWS_STORAGE_KEY]: flows });
}

export async function listSavedFlows(domain?: string): Promise<SavedFlow[]> {
  const flows = await loadAllFlows();
  if (!domain) return flows.sort((a, b) => b.savedAt - a.savedAt);
  return flows.filter((f) => f.domain === domain).sort((a, b) => b.savedAt - a.savedAt);
}

export async function getSavedFlow(id: string): Promise<SavedFlow | null> {
  const flows = await loadAllFlows();
  return flows.find((f) => f.id === id) ?? null;
}

export async function canSaveFlow(): Promise<{ allowed: boolean; reason?: string; count: number }> {
  const flows = await loadAllFlows();
  if (await hasFeature('SAVED_FLOWS_UNLIMITED')) {
    return { allowed: true, count: flows.length };
  }
  if (flows.length >= FREE_TIER_MAX_SAVED_FLOWS) {
    return {
      allowed: false,
      count: flows.length,
      reason: `Free tier allows ${FREE_TIER_MAX_SAVED_FLOWS} saved flow. Upgrade to Pro for unlimited.`,
    };
  }
  return { allowed: true, count: flows.length };
}

export async function saveFlow(
  name: string,
  ledger: ActionLedger,
  domain?: string,
): Promise<SavedFlow> {
  const trimmedName = name.trim() || 'Untitled flow';
  const flowDomain = domain ?? ledger.originDomain ?? 'unknown';

  const gate = await canSaveFlow();
  if (!gate.allowed) {
    throw new SavedFlowError('FLOW_LIMIT_REACHED', gate.reason ?? 'Saved flow limit reached.');
  }

  const flow: SavedFlow = {
    id: createFlowId(),
    name: trimmedName,
    domain: flowDomain,
    ledger: { ...ledger, originDomain: flowDomain },
    savedAt: Date.now(),
  };

  const flows = await loadAllFlows();
  flows.push(flow);
  await persistFlows(flows);
  return flow;
}

export async function deleteSavedFlow(id: string): Promise<void> {
  const flows = await loadAllFlows();
  const next = flows.filter((f) => f.id !== id);
  if (next.length === flows.length) {
    throw new SavedFlowError('FLOW_NOT_FOUND', 'Saved flow not found.');
  }
  await persistFlows(next);
}
