import { useCallback, useEffect, useState } from 'react';
import type { PresetMode } from '@/shared/schema/action-ledger';
import type { ActionLedger } from '@/shared/schema/action-ledger';
import type { CompilerTarget, FeatureFlag, Tier } from '@/shared/types/entitlements';
import { featureFlagForPreset, isProPreset } from '@/shared/constants/preset-gating';
import { featureFlagForCompiler, isProCompilerTarget } from '@/shared/constants/compiler-gating';
import type {
  FormflowCompileResponse,
  FormflowEntitlementResponse,
  FormflowFillResponse,
  FormflowRecordingStatusResponse,
  FormflowRecordingStoppedResponse,
  FormflowResponse,
} from '@/shared/messages';

const PRESETS: Array<{ id: PresetMode; label: string; description: string }> = [
  { id: 'HAPPY_PATH', label: 'Happy Path', description: 'Realistic synthetic data' },
  { id: 'BOUNDARY_OVERFLOW', label: 'Boundary & Overflow', description: 'Max length + Unicode stress' },
  { id: 'VALIDATION_STRESS', label: 'Validation Stress', description: 'Malformed / out-of-range values' },
  { id: 'SECURITY_SANITY', label: 'Security Sanity', description: 'Non-destructive XSS/SQL probes' },
];

const COMPILER_TARGETS: Array<{ id: CompilerTarget; label: string }> = [
  { id: 'playwright', label: 'Playwright' },
  { id: 'cypress', label: 'Cypress' },
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
  if (!('report' in response)) throw new Error('Unexpected fill response.');
  return response;
}

async function loadEntitlement(): Promise<FormflowEntitlementResponse> {
  const response = (await chrome.runtime.sendMessage({
    type: 'FORMFLOW_GET_ENTITLEMENT',
  })) as FormflowResponse;
  if (!response.ok || !('tier' in response)) throw new Error('Could not load entitlement.');
  return response;
}

async function fetchRecordingStatus(): Promise<FormflowRecordingStatusResponse> {
  const response = (await chrome.runtime.sendMessage({
    type: 'FORMFLOW_GET_RECORDING_STATUS',
  })) as FormflowResponse;
  if (!response.ok || !('isRecording' in response)) {
    throw new Error('Could not load recording status.');
  }
  return response;
}

function presetUnlocked(preset: PresetMode, features: FeatureFlag[]): boolean {
  const flag = featureFlagForPreset(preset);
  return !flag || features.includes(flag);
}

function compilerUnlocked(target: CompilerTarget, features: FeatureFlag[]): boolean {
  const flag = featureFlagForCompiler(target);
  return !flag || features.includes(flag);
}

export function App() {
  const [activePreset, setActivePreset] = useState<PresetMode>('HAPPY_PATH');
  const [compilerTarget, setCompilerTarget] = useState<CompilerTarget>('playwright');
  const [tier, setTier] = useState<Tier>('FREE');
  const [features, setFeatures] = useState<FeatureFlag[]>([]);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [securityPrompt, setSecurityPrompt] = useState<{ hostname: string } | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [stepCount, setStepCount] = useState(0);
  const [lastLedger, setLastLedger] = useState<ActionLedger | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [bugTitle, setBugTitle] = useState('');
  const [bugDestination, setBugDestination] = useState<'github' | 'linear' | 'jira'>('github');
  const [bugMessage, setBugMessage] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [flowName, setFlowName] = useState('');

  const refreshRecording = useCallback(async () => {
    try {
      const rec = await fetchRecordingStatus();
      setIsRecording(rec.isRecording);
      setStepCount(rec.stepCount);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void loadEntitlement()
      .then((ent) => {
        setTier(ent.tier);
        setFeatures(ent.features);
      })
      .catch(() => undefined);
    void refreshRecording();
  }, [refreshRecording]);

  const runFill = useCallback(
    async (presetMode: PresetMode) => {
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
        await refreshRecording();
      } catch (err) {
        const error = err as Error & { code?: string; hostname?: string };
        if (error.code === 'SECURITY_DOMAIN_BLOCKED' && error.hostname) {
          setSecurityPrompt({ hostname: error.hostname });
          setStatus({ kind: 'idle' });
          return;
        }
        setStatus({ kind: 'error', message: error.message ?? 'Fill failed.' });
      }
    },
    [refreshRecording],
  );

  const handleFill = () => {
    if (isProPreset(activePreset) && !presetUnlocked(activePreset, features)) {
      setStatus({
        kind: 'error',
        message: 'This preset requires Pro. Enable “Simulate Pro” in Settings.',
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

  const handleToggleRecording = async () => {
    setCopyMessage(null);
    if (isRecording) {
      const response = (await chrome.runtime.sendMessage({
        type: 'FORMFLOW_STOP_RECORDING',
      })) as FormflowResponse;
      if (!response.ok || !('ledger' in response)) {
        setStatus({
          kind: 'error',
          message: 'error' in response ? response.error : 'Stop recording failed.',
        });
        return;
      }
      const stopped = response as FormflowRecordingStoppedResponse;
      setLastLedger(stopped.ledger);
      setIsRecording(false);
      setStepCount(stopped.ledger.actions.length);
      setFlowName(`Flow ${new Date().toLocaleDateString()}`);
      return;
    }

    const response = (await chrome.runtime.sendMessage({
      type: 'FORMFLOW_START_RECORDING',
    })) as FormflowResponse;
    if (!response.ok || !('isRecording' in response)) {
      setStatus({
        kind: 'error',
        message: 'error' in response ? response.error : 'Start recording failed.',
      });
      return;
    }
    setIsRecording(true);
    setStepCount((response as FormflowRecordingStatusResponse).stepCount);
    setLastLedger(null);
  };

  const handleSaveFlow = async () => {
    setSaveMessage(null);
    if (!lastLedger) {
      setSaveMessage('Record a flow first.');
      return;
    }
    const response = (await chrome.runtime.sendMessage({
      type: 'FORMFLOW_SAVE_FLOW',
      name: flowName.trim() || 'Untitled flow',
    })) as FormflowResponse;
    if (!response.ok || !('flow' in response)) {
      setSaveMessage('error' in response ? response.error : 'Save failed.');
      return;
    }
    setSaveMessage(`Saved “${response.flow.name}”.`);
  };

  const handleExportBugReport = async () => {
    setBugMessage(null);
    if (!features.includes('BUG_REPORT_GENERATOR')) {
      setBugMessage('Bug reports require Pro. Activate a license in Settings.');
      return;
    }
    const response = (await chrome.runtime.sendMessage({
      type: 'FORMFLOW_EXPORT_BUG_REPORT',
      destination: bugDestination,
      title: bugTitle.trim() || 'Form bug report',
    })) as FormflowResponse;
    if (!response.ok || !('issueUrl' in response)) {
      setBugMessage('error' in response ? response.error : 'Export failed.');
      return;
    }
    setBugMessage(`Issue created: ${response.issueUrl}`);
    await chrome.tabs.create({ url: response.issueUrl });
  };

  const handleCopyCode = async () => {
    setCopyMessage(null);
    if (isProCompilerTarget(compilerTarget) && !compilerUnlocked(compilerTarget, features)) {
      setCopyMessage('Cypress export requires Pro. Enable “Simulate Pro” in Settings.');
      return;
    }

    const response = (await chrome.runtime.sendMessage({
      type: 'FORMFLOW_COMPILE_LEDGER',
      target: compilerTarget,
    })) as FormflowResponse;

    if (!response.ok || !('code' in response)) {
      setCopyMessage('error' in response ? response.error : 'Compile failed.');
      return;
    }

    const compiled = response as FormflowCompileResponse;
    await navigator.clipboard.writeText(compiled.code);
    setCopyMessage(`${compiled.target} code copied (${compiled.code.split('\n').length} lines).`);
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
        className="mb-2 w-full rounded bg-indigo-600 py-2 font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
      >
        {status.kind === 'loading' ? 'Filling…' : 'Fill Form'}
      </button>

      <section className="mb-3 rounded border border-slate-200 p-2">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-medium">Recording</span>
          {isRecording && (
            <span className="text-[11px] text-red-600">{stepCount} step{stepCount === 1 ? '' : 's'}</span>
          )}
        </div>
        <button
          type="button"
          onClick={handleToggleRecording}
          className={`w-full rounded border py-1.5 text-xs font-medium ${
            isRecording
              ? 'border-red-400 text-red-700 hover:bg-red-50'
              : 'border-slate-300 text-slate-700 hover:bg-slate-50'
          }`}
        >
          {isRecording ? 'Stop Recording' : 'Start Recording'}
        </button>
        {lastLedger && !isRecording && (
          <>
            <p className="mt-1.5 text-[11px] text-slate-500">
              Last flow: {lastLedger.actions.length} actions recorded.
            </p>
            <div className="mt-2 flex gap-1">
              <input
                type="text"
                value={flowName}
                onChange={(e) => setFlowName(e.target.value)}
                placeholder="Flow name"
                className="min-w-0 flex-1 rounded border border-slate-300 px-2 py-1 text-[11px]"
              />
              <button
                type="button"
                onClick={handleSaveFlow}
                className="shrink-0 rounded border border-slate-300 px-2 py-1 text-[11px] font-medium hover:bg-slate-50"
              >
                Save
              </button>
            </div>
            {saveMessage && <p className="mt-1 text-[11px] text-slate-600">{saveMessage}</p>}
          </>
        )}
      </section>

      <section className="mb-3 rounded border border-slate-200 p-2">
        <label className="mb-1 block text-xs font-medium">Export target</label>
        <select
          value={compilerTarget}
          onChange={(e) => setCompilerTarget(e.target.value as CompilerTarget)}
          className="mb-2 w-full rounded border border-slate-300 px-2 py-1 text-xs"
        >
          {COMPILER_TARGETS.map((target) => (
            <option key={target.id} value={target.id}>
              {target.label}
              {isProCompilerTarget(target.id) && !compilerUnlocked(target.id, features) ? ' (PRO)' : ''}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleCopyCode}
          className="w-full rounded border border-indigo-300 bg-indigo-50 py-1.5 text-xs font-medium text-indigo-800 hover:bg-indigo-100"
        >
          Copy Code
        </button>
        {copyMessage && <p className="mt-1.5 text-[11px] text-slate-600">{copyMessage}</p>}
      </section>

      <section className="mb-3 rounded border border-slate-200 p-2">
        <div className="mb-1 text-xs font-medium">Bug report (Pro)</div>
        <input
          type="text"
          value={bugTitle}
          onChange={(e) => setBugTitle(e.target.value)}
          placeholder="Issue title"
          className="mb-1.5 w-full rounded border border-slate-300 px-2 py-1 text-[11px]"
        />
        <select
          value={bugDestination}
          onChange={(e) => setBugDestination(e.target.value as 'github' | 'linear' | 'jira')}
          className="mb-1.5 w-full rounded border border-slate-300 px-2 py-1 text-[11px]"
        >
          <option value="github">GitHub Issues</option>
          <option value="linear">Linear</option>
          <option value="jira">Jira</option>
        </select>
        <button
          type="button"
          onClick={handleExportBugReport}
          className="w-full rounded border border-amber-300 bg-amber-50 py-1.5 text-[11px] font-medium text-amber-900 hover:bg-amber-100"
        >
          Export bug report
        </button>
        {bugMessage && <p className="mt-1 text-[11px] text-slate-600">{bugMessage}</p>}
      </section>

      {status.kind === 'success' && (
        <p className="mb-2 rounded border border-green-200 bg-green-50 px-2 py-1.5 text-xs text-green-800">
          {status.preset}: filled {status.filled} field{status.filled === 1 ? '' : 's'}.
          {status.unreachable > 0 && ` ${status.unreachable} unreachable shadow hosts.`}
        </p>
      )}

      {status.kind === 'error' && (
        <p className="mb-2 rounded border border-red-200 bg-red-50 px-2 py-1.5 text-xs text-red-800">
          {status.message}
        </p>
      )}

      <p className="text-[11px] text-slate-500">
        Record → save → copy Playwright/Cypress.{' '}
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
