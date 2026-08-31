import { useState } from 'react';
import type { PresetMode } from '@/shared/schema/action-ledger';
import type { FormflowFillResponse, FormflowResponse } from '@/shared/messages';

const PRESETS: Array<{ id: PresetMode; label: string; free: boolean }> = [
  { id: 'HAPPY_PATH', label: 'Happy Path', free: true },
  { id: 'BOUNDARY_OVERFLOW', label: 'Boundary & Overflow', free: false },
  { id: 'VALIDATION_STRESS', label: 'Validation Stress', free: false },
  { id: 'SECURITY_SANITY', label: 'Security Sanity', free: false },
];

type Status =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | {
      kind: 'success';
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
    throw new Error('error' in response ? response.error : 'Fill request failed.');
  }
  if (!('report' in response)) {
    throw new Error('Unexpected response from background script.');
  }
  return response;
}

export function App() {
  const [activePreset, setActivePreset] = useState<PresetMode>('HAPPY_PATH');
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  const handleFill = async () => {
    if (activePreset !== 'HAPPY_PATH') {
      setStatus({ kind: 'error', message: 'Pro presets ship in Phase 3. Use Happy Path for now.' });
      return;
    }

    setStatus({ kind: 'loading' });
    try {
      const result = await requestFill(activePreset);
      setStatus({
        kind: 'success',
        filled: result.report.filled.length,
        unreachable: result.report.unreachableCount,
        heuristic: result.report.heuristicResolvedCount,
        ai: result.report.aiResolvedCount,
      });
    } catch (err) {
      setStatus({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Fill failed.',
      });
    }
  };

  return (
    <div className="p-4 font-sans text-sm text-slate-900">
      <header className="mb-3 flex items-center justify-between">
        <h1 className="text-base font-semibold">FormFlow AI</h1>
        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">Free</span>
      </header>

      <div className="mb-3 grid grid-cols-2 gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => {
              setActivePreset(preset.id);
              setStatus({ kind: 'idle' });
            }}
            className={`rounded border px-2 py-2 text-left text-xs transition ${
              activePreset === preset.id
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                : 'border-slate-200 hover:bg-slate-50'
            }`}
          >
            {preset.label}
            {!preset.free && <span className="ml-1 text-[10px] text-amber-600">PRO</span>}
          </button>
        ))}
      </div>

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
          Filled {status.filled} field{status.filled === 1 ? '' : 's'} ({status.heuristic} heuristic
          {status.ai > 0 ? `, ${status.ai} AI` : ''}).
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
        Phase 2: regex-first fill, BYOK AI for ambiguous fields.{' '}
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
