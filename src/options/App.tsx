import { useEffect, useState } from 'react';
import type { ByokProvider } from '@/shared/types/byok';
import type { FormflowByokSettingsResponse, FormflowByokTestResponse, FormflowEntitlementResponse, FormflowResponse } from '@/shared/messages';
import type { Tier } from '@/shared/types/entitlements';
import { DEFAULT_OLLAMA_ENDPOINT } from '@/shared/constants/byok-storage';

type Settings = FormflowByokSettingsResponse['settings'];

export function App() {
  const [provider, setProvider] = useState<ByokProvider>('groq');
  const [apiKey, setApiKey] = useState('');
  const [endpoint, setEndpoint] = useState(DEFAULT_OLLAMA_ENDPOINT);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [tier, setTier] = useState<Tier>('FREE');
  const [simulatePro, setSimulatePro] = useState(false);

  useEffect(() => {
    void loadSettings();
    void loadEntitlement();
  }, []);

  async function loadEntitlement() {
    const response = (await chrome.runtime.sendMessage({
      type: 'FORMFLOW_GET_ENTITLEMENT',
    })) as FormflowResponse;
    if (response.ok && 'tier' in response) {
      const ent = response as FormflowEntitlementResponse;
      setTier(ent.tier);
      setSimulatePro(ent.tier === 'PRO' || ent.tier === 'TEAM');
    }
  }

  async function handleTogglePro(enabled: boolean) {
    setSimulatePro(enabled);
    setLoading(true);
    try {
      const response = (await chrome.runtime.sendMessage({
        type: 'FORMFLOW_SET_DEV_PRO_TIER',
        enabled,
      })) as FormflowResponse;
      if (response.ok && 'tier' in response) {
        setTier(response.tier);
        setStatus(enabled ? 'Pro tier simulated for development.' : 'Reverted to Free tier.');
      }
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not update tier.');
      setSimulatePro(!enabled);
    } finally {
      setLoading(false);
    }
  }

  async function loadSettings() {
    const response = (await chrome.runtime.sendMessage({
      type: 'FORMFLOW_GET_BYOK_SETTINGS',
    })) as FormflowResponse;

    if (response.ok && 'settings' in response) {
      setSettings(response.settings);
      setProvider(response.settings.provider);
      if (response.settings.endpoint) setEndpoint(response.settings.endpoint);
    }
  }

  async function handleSave() {
    setLoading(true);
    setStatus(null);
    try {
      const response = (await chrome.runtime.sendMessage({
        type: 'FORMFLOW_SAVE_BYOK_SETTINGS',
        provider,
        apiKey: apiKey.trim() || undefined,
        endpoint: provider === 'ollama' ? endpoint : undefined,
      })) as FormflowResponse;

      if (!response.ok) throw new Error('error' in response ? response.error : 'Save failed.');
      if ('settings' in response) {
        setSettings(response.settings);
        setApiKey('');
        setStatus('Settings saved.');
      }
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setLoading(false);
    }
  }

  async function handleTest() {
    setLoading(true);
    setStatus(null);
    try {
      const response = (await chrome.runtime.sendMessage({
        type: 'FORMFLOW_TEST_BYOK',
      })) as FormflowResponse;

      if (!response.ok) throw new Error('error' in response ? response.error : 'Test failed.');
      const result = response as FormflowByokTestResponse;
      setStatus(
        `Connected (${result.provider}, ${result.latencyMs}ms). Sample value: "${result.value}"`,
      );
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Test failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg p-8 font-sans text-slate-900">
      <h1 className="mb-1 text-xl font-semibold">FormFlow AI Settings</h1>
      <p className="mb-6 text-sm text-slate-500">
        BYOK keys are AES-256 encrypted in local storage. Protects against casual inspection, not
        a compromised device.
      </p>

      <section className="mb-6 rounded border border-slate-200 p-4">
        <h2 className="mb-3 text-sm font-medium">AI Provider (BYOK — Free)</h2>

        <label className="mb-2 block text-xs font-medium text-slate-600">Provider</label>
        <select
          value={provider}
          onChange={(e) => setProvider(e.target.value as ByokProvider)}
          className="mb-3 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
        >
          <option value="groq">Groq</option>
          <option value="gemini">Google Gemini</option>
          <option value="ollama">Local Ollama</option>
        </select>

        {provider !== 'ollama' && (
          <>
            <label className="mb-2 block text-xs font-medium text-slate-600">API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={settings?.hasApiKey ? '••••••••  (leave blank to keep existing)' : 'Paste API key'}
              className="mb-3 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
            />
          </>
        )}

        {provider === 'ollama' && (
          <>
            <label className="mb-2 block text-xs font-medium text-slate-600">Ollama endpoint</label>
            <input
              type="url"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              className="mb-3 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
            />
            <p className="mb-3 text-[11px] text-slate-500">
              Default model: llama3.2 — run <code className="rounded bg-slate-100 px-1">ollama pull llama3.2</code>{' '}
              if missing.
            </p>
          </>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="rounded bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
          >
            Save
          </button>
          <button
            type="button"
            onClick={handleTest}
            disabled={loading || !settings?.configured}
            className="rounded border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            Test connection
          </button>
        </div>

        {settings && (
          <p className="mt-3 text-[11px] text-slate-500">
            Status: {settings.configured ? `Configured (${settings.provider})` : 'Not configured'}
          </p>
        )}
      </section>

      {status && (
        <p className="mb-4 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
          {status}
        </p>
      )}

      <section className="mb-6 rounded border border-slate-200 p-4">
        <h2 className="mb-2 text-sm font-medium">Developer — Simulate Pro tier</h2>
        <p className="mb-3 text-xs text-slate-500">
          Unlocks Pro presets (Boundary, Validation Stress, Security Sanity) for local testing
          before Phase 5 billing ships. Current tier: <strong>{tier}</strong>.
        </p>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={simulatePro}
            onChange={(e) => void handleTogglePro(e.target.checked)}
            disabled={loading}
          />
          Simulate Pro tier
        </label>
      </section>

      <section className="rounded border border-slate-200 p-4">
        <h2 className="mb-2 text-sm font-medium">License</h2>
        <p className="text-xs text-slate-500">Billing integration ships in Phase 5.</p>
      </section>
    </div>
  );
}
