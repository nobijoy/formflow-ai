import { describe, expect, it, vi, beforeEach } from 'vitest';
import { FREE_TIER_MAX_SAVED_FLOWS, SAVED_FLOWS_STORAGE_KEY } from '@/shared/constants/licensing';
import type { ActionLedger } from '@/shared/schema/action-ledger';

const storage: Record<string, unknown> = {};

vi.stubGlobal('chrome', {
  storage: {
    local: {
      get: vi.fn(async (keys: string | string[] | Record<string, unknown>) => {
        if (typeof keys === 'string') return { [keys]: storage[keys] };
        if (Array.isArray(keys)) {
          const out: Record<string, unknown> = {};
          for (const k of keys) out[k] = storage[k];
          return out;
        }
        return storage;
      }),
      set: vi.fn(async (obj: Record<string, unknown>) => {
        Object.assign(storage, obj);
      }),
    },
  },
});

const hasFeatureMock = vi.fn();

vi.mock('@/background/licensing', () => ({
  hasFeature: (...args: unknown[]) => hasFeatureMock(...args),
}));

import { canSaveFlow, saveFlow } from '@/background/saved-flows';

function sampleLedger(): ActionLedger {
  return {
    sessionId: 'sess_test',
    originDomain: 'example.com',
    actions: [{ step: 1, type: 'CLICK', target: { css: 'button' } }],
  };
}

describe('saved flows', () => {
  beforeEach(() => {
    delete storage[SAVED_FLOWS_STORAGE_KEY];
    hasFeatureMock.mockReset();
  });

  it('allows Free tier to save one flow', async () => {
    hasFeatureMock.mockResolvedValue(false);
    const gate = await canSaveFlow();
    expect(gate.allowed).toBe(true);

    await saveFlow('Checkout', sampleLedger());
    const after = await canSaveFlow();
    expect(after.allowed).toBe(false);
    expect(after.count).toBe(FREE_TIER_MAX_SAVED_FLOWS);
  });

  it('allows unlimited saves for Pro', async () => {
    hasFeatureMock.mockResolvedValue(true);
    await saveFlow('Flow A', sampleLedger());
    await saveFlow('Flow B', sampleLedger());
    const gate = await canSaveFlow();
    expect(gate.allowed).toBe(true);
    expect(gate.count).toBe(2);
  });
});
