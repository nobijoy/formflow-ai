/**
 * Client-side managed-AI quota tracking (NFR-7 backup — server is authoritative).
 */

import {
  MANAGED_AI_MONTHLY_QUOTA,
  MANAGED_AI_USAGE_KEY,
} from '@/shared/constants/licensing';
import type { ManagedAiUsage } from '@/shared/types/entitlements';
import { AiRouterError } from '@/background/ai-router/errors';

function currentMonthKey(now: Date = new Date()): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

async function loadUsageRecord(): Promise<ManagedAiUsage> {
  const stored = await chrome.storage.local.get(MANAGED_AI_USAGE_KEY);
  const existing = stored[MANAGED_AI_USAGE_KEY] as ManagedAiUsage | undefined;
  const monthKey = currentMonthKey();

  if (existing?.monthKey === monthKey) {
    return { ...existing, quota: MANAGED_AI_MONTHLY_QUOTA };
  }

  return { monthKey, used: 0, quota: MANAGED_AI_MONTHLY_QUOTA };
}

async function saveUsage(usage: ManagedAiUsage): Promise<void> {
  await chrome.storage.local.set({ [MANAGED_AI_USAGE_KEY]: usage });
}

export async function getManagedAiUsage(): Promise<ManagedAiUsage> {
  return loadUsageRecord();
}

export async function assertManagedQuotaAvailable(): Promise<void> {
  const usage = await loadUsageRecord();
  if (usage.used >= usage.quota) {
    throw new AiRouterError(
      'QUOTA_EXCEEDED',
      `Managed AI quota reached (${usage.quota}/month). Add BYOK in Settings or wait until next month.`,
    );
  }
}

export async function incrementManagedQuota(): Promise<ManagedAiUsage> {
  const usage = await loadUsageRecord();
  const updated = { ...usage, used: usage.used + 1 };
  await saveUsage(updated);
  return updated;
}
