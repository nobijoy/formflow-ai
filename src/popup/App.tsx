import { useCallback, useEffect, useState } from 'react';
import type { PresetMode } from '@/shared/schema/action-ledger';
import type { FeatureFlag, Tier } from '@/shared/types/entitlements';
import { featureFlagForPreset, isProPreset } from '@/shared/constants/preset-gating';
import type { FormflowEntitlementResponse, FormflowFillResponse, FormflowResponse } from '@/shared/messages';

const PRESETS: Array<{ id: PresetMode; label: string; description: string }> = [
  { id: 'HAPPY_PATH', label: 'Happy Path', description: 'Realistic synthetic data' },
  { id: 'BOUNDARY_OVERFLOW', label: 'Boundary & Overflow', description: 'Max length + Unicode stress' },
  { id: 'VALIDATION_STRESS', label: 'Validation Stress', description: 'Malformed / out-of-range values' },
  { id: 'SECURITY_SANITY', label: 'Security Sanity', description: 'Non-destructive XSS/SQL probes' },
];

type Status =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | {
      kind: 'success';
      preset: PresetMode;
      filled: number;
      unreachable: number;
      heuristic: number;
      ai: number;
    }
  | { kind: 'error'; message: string };

async function requestFill(presetMode: PresetMode): Promise<FormflowFillResponse> {
  const response = (await chrome.runtime.sendMessage({
    type: 'FORMFLOW_FILL_FORM',
    presetMode,
  })) as FormflowResponse;

  if (!response?.ok) {
    const err = new Error('error' in response ? response.error : 'Fill request failed.');
    if ('code' in response && response.code) {
      (err as Error & { code?: string; hostname?: string }).code = response.code;
      if ('hostname' in response && response.hostname) {
        (err as Error & { hostname?: string }).hostname = response.hostname;
      }
    }
    throw err;
  }
  if (!('report' in response)) {
    throw new Error('Unexpected response from background script.');
  }
  return response;
}

async function loadEntitlement(): Promise<FormflowEntitlementResponse> {
  const response = (await chrome.runtime.sendMessage({
    type: 'FORMFLOW_GET_ENTITLEMENT',
  })) as FormflowResponse;
  if (!response.ok || !('tier' in response)) {
    throw new Error('Could not load entitlement.');
  }
  return response;
}

function presetUnlocked(preset: PresetMode, features: FeatureFlag[]): boolean {
  const flag = featureFlagForPreset(preset);
  return !flag || features.includes(flag);
}

export function App() {
  const [activePreset, setActivePreset] = useState<PresetMode>('HAPPY_PATH');
  const [tier, setTier] = useState<Tier>('FREE');
  const [features, setFeatures] = useState<FeatureFlag[]>([]);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [securityPrompt, setSecurityPrompt] = useState<{ hostname: string } | null>(null);

  useEffect(() => {
    void loadEntitlement()
      .then((ent) => {
        setTier(ent.tier);
        setFeatures(ent.features);
      })
      .catch(() => undefined);
  }, []);

  const runFill = useCallback(async (presetMode: PresetMode) => {
    setStatus({ kind: 'loading' });
    try {
      const result = await requestFill(presetMode);
      setSecurityPrompt(null);
      setStatus({
        kind: 'success',
        preset: presetMode,
        filled: result.report.filled.length,
        unreachable: result.report.unreachableCount,
        heuristic: result.report.heuristicResolvedCount,
        ai: result.report.aiResolvedCount,
      });
    } catch (err) {
      const error = err as Error & { code?: string; hostname?: string };
      if (error.code === 'SECURITY_DOMAIN_BLOCKED' && error.hostname) {
        setSecurityPrompt({ hostname: error.hostname });
        setStatus({ kind: 'idle' });
        return;
      }
      setStatus({
        kind: 'error',
        message: error.message ?? 'Fill failed.',
      });
    }
  }, []);

  const handleFill = () => {
    if (isProPreset(activePreset) && !presetUnlocked(activePreset, features)) {
      setStatus({
        kind: 'error',
        message: 'This preset requires Pro. Enable “Simulate Pro” in Settings to test before Phase 5 billing.',
      });
      return;
    }
    void runFill(activePreset);
  };

  const handleAuthorizeSecurity = async () => {
    if (!securityPrompt) return;
    setStatus({ kind: 'loading' });
    await chrome.runtime.sendMessage({
      type: 'FORMFLOW_AUTHORIZE_SECURITY_DOMAIN',
      hostname: securityPrompt.hostname,
    });
    await runFill('SECURITY_SANITY');
  };

  return (
    <div className="p-4 font-sans text-sm text-slate-900">
      <header className="mb-3 flex items-center justify-between">
        <h1 className="text-base font-semibold">FormFlow AI</h1>
        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{tier}</span>
      </header>

      <div className="mb-3 grid grid-cols-2 gap-2">
        {PRESETS.map((preset) => {
          const locked = isProPreset(preset.id) && !presetUnlocked(preset.id, features);
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => {
                setActivePreset(preset.id);
                setStatus({ kind: 'idle' });
                setSecurityPrompt(null);
              }}
              className={`rounded border px-2 py-2 text-left text-xs transition ${
                activePreset === preset.id
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span className="font-medium">{preset.label}</span>
              {locked && <span className="ml-1 text-[10px] text-amber-600">PRO</span>}
              <span className="mt-0.5 block text-[10px] text-slate-500">{preset.description}</span>
            </button>
          );
        })}
      </div>

      {securityPrompt && (
        <div className="mb-3 rounded border border-amber-300 bg-amber-50 p-2 text-xs text-amber-950">
          <p className="mb-2 font-medium">Authorize Security Sanity on {securityPrompt.hostname}?</p>
          <p className="mb-2 text-[11px]">
            This preset injects non-destructive XSS/SQL probe strings. Only continue if you are
            authorized to test this domain.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAuthorizeSecurity}
              className="rounded bg-amber-700 px-2 py-1 text-[11px] font-medium text-white"
            >
              I&apos;m authorized — fill
            </button>
            <button
              type="button"
              onClick={() => setSecurityPrompt(null)}
              className="rounded border border-amber-400 px-2 py-1 text-[11px]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={handleFill}
        disabled={status.kind === 'loading'}
        className="mb-2 w-full rounded bg-indigo-600 py-2 font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status.kind === 'loading' ? 'Filling…' : 'Fill Form'}
      </button>

      {status.kind === 'success' && (
        <p className="mb-2 rounded border border-green-200 bg-green-50 px-2 py-1.5 text-xs text-green-800">
          {status.preset}: filled {status.filled} field{status.filled === 1 ? '' : 's'} (
          {status.heuristic} generated{status.ai > 0 ? `, ${status.ai} AI` : ''}).
          {status.unreachable > 0 &&
            ` ${status.unreachable} closed shadow-DOM host${status.unreachable === 1 ? '' : 's'} not reachable.`}
        </p>
      )}

      {status.kind === 'error' && (
        <p className="mb-2 rounded border border-red-200 bg-red-50 px-2 py-1.5 text-xs text-red-800">
          {status.message}
        </p>
      )}

      <p className="text-[11px] text-slate-500">
        Phase 3: all four presets wired.{' '}
        <button
          type="button"
          className="text-indigo-600 underline"
          onClick={() => chrome.runtime.openOptionsPage()}
        >
          Settings
        </button>
      </p>
    </div>
  );
}
