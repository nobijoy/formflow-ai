import { useEffect, useState } from 'react';
import type { ByokProvider } from '@/shared/types/byok';
import type {
  FormflowByokSettingsResponse,
  FormflowByokTestResponse,
  FormflowEntitlementResponse,
  FormflowManagedAiUsageResponse,
  FormflowResponse,
  FormflowSavedFlowsListResponse,
} from '@/shared/messages';
import type { EntitlementSource, Tier } from '@/shared/types/entitlements';
import type { SavedFlow } from '@/shared/types/saved-flows';
import { CHECKOUT_URL, DEV_LICENSE_KEYS } from '@/shared/constants/licensing';
import { DEFAULT_OLLAMA_ENDPOINT } from '@/shared/constants/byok-storage';
import { Phase6Settings } from '@/options/Phase6Settings';

type Settings = FormflowByokSettingsResponse['settings'];

export function App() {
  const [provider, setProvider] = useState<ByokProvider>('groq');
  const [apiKey, setApiKey] = useState('');
  const [endpoint, setEndpoint] = useState(DEFAULT_OLLAMA_ENDPOINT);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [tier, setTier] = useState<Tier>('FREE');
  const [source, setSource] = useState<EntitlementSource>('free');
  const [simulatePro, setSimulatePro] = useState(false);
  const [licenseKey, setLicenseKey] = useState('');
  const [managedUsage, setManagedUsage] = useState<{ used: number; quota: number } | null>(null);
  const [savedFlows, setSavedFlows] = useState<SavedFlow[]>([]);

  useEffect(() => {
    void loadSettings();
    void loadEntitlement();
    void loadManagedUsage();
    void loadSavedFlows();
  }, []);

  async function loadEntitlement() {
    const response = (await chrome.runtime.sendMessage({
      type: 'FORMFLOW_GET_ENTITLEMENT',
    })) as FormflowResponse;
    if (response.ok && 'tier' in response) {
      const ent = response as FormflowEntitlementResponse;
      setTier(ent.tier);
      setSource(ent.source);
      setSimulatePro(ent.source === 'dev' && (ent.tier === 'PRO' || ent.tier === 'TEAM'));
    }
  }

  async function loadManagedUsage() {
    const response = (await chrome.runtime.sendMessage({
      type: 'FORMFLOW_GET_MANAGED_AI_USAGE',
    })) as FormflowResponse;
    if (response.ok && 'usage' in response) {
      const u = (response as FormflowManagedAiUsageResponse).usage;
      setManagedUsage({ used: u.used, quota: u.quota });
    }
  }

  async function loadSavedFlows() {
    const response = (await chrome.runtime.sendMessage({
      type: 'FORMFLOW_LIST_SAVED_FLOWS',
    })) as FormflowResponse;
    if (response.ok && 'flows' in response) {
      setSavedFlows((response as FormflowSavedFlowsListResponse).flows);
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
        const ent = response as FormflowEntitlementResponse;
        setTier(ent.tier);
        setSource(ent.source);
        setStatus(enabled ? 'Pro tier simulated for development.' : 'Reverted to Free tier.');
      }
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not update tier.');
      setSimulatePro(!enabled);
    } finally {
      setLoading(false);
    }
  }

  async function handleActivateLicense() {
    if (!licenseKey.trim()) {
      setStatus('Enter a license key first.');
      return;
    }
    setLoading(true);
    setStatus(null);
    try {
      const response = (await chrome.runtime.sendMessage({
        type: 'FORMFLOW_ACTIVATE_LICENSE',
        licenseKey: licenseKey.trim(),
      })) as FormflowResponse;
      if (!response.ok) throw new Error('error' in response ? response.error : 'Activation failed.');
      const ent = response as FormflowEntitlementResponse;
      setTier(ent.tier);
      setSource(ent.source);
      setLicenseKey('');
      setStatus(`License activated — ${ent.tier} tier (${ent.source}).`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Activation failed.');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyEntitlement() {
    setLoading(true);
    setStatus(null);
    try {
      const response = (await chrome.runtime.sendMessage({
        type: 'FORMFLOW_VERIFY_ENTITLEMENT',
      })) as FormflowResponse;
      if (!response.ok) throw new Error('error' in response ? response.error : 'Verify failed.');
      const ent = response as FormflowEntitlementResponse;
      setTier(ent.tier);
      setSource(ent.source);
      setStatus(
        ent.withinGrace
          ? `Entitlement verified (${ent.tier}). Grace period active.`
          : `Entitlement verified (${ent.tier}).`,
      );
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Verify failed.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDeactivateLicense() {
    setLoading(true);
    try {
      const response = (await chrome.runtime.sendMessage({
        type: 'FORMFLOW_DEACTIVATE_LICENSE',
      })) as FormflowResponse;
      if (!response.ok) throw new Error('error' in response ? response.error : 'Deactivate failed.');
      const ent = response as FormflowEntitlementResponse;
      setTier(ent.tier);
      setSource(ent.source);
      setStatus('License removed — reverted to Free tier.');
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Deactivate failed.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteFlow(id: string) {
    await chrome.runtime.sendMessage({ type: 'FORMFLOW_DELETE_SAVED_FLOW', id });
    await loadSavedFlows();
  }

  async function loadSettings() {
    const response = (await chrome.runtime.sendMessage({
      type: 'FORMFLOW_GET_BYOK_SETTINGS',
    })) as FormflowResponse;

    if (response.ok && 'settings' in response && 'provider' in (response as FormflowByokSettingsResponse).settings) {
      const byok = response as FormflowByokSettingsResponse;
      setSettings(byok.settings);
      setProvider(byok.settings.provider);
      if (byok.settings.endpoint) setEndpoint(byok.settings.endpoint);
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
      if ('settings' in response && 'provider' in (response as FormflowByokSettingsResponse).settings) {
        setSettings((response as FormflowByokSettingsResponse).settings);
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

  const devKeys = Object.keys(DEV_LICENSE_KEYS);

  return (
    <div className="mx-auto max-w-lg p-8 font-sans text-slate-900">
      <h1 className="mb-1 text-xl font-semibold">FormFlow AI Settings</h1>
      <p className="mb-6 text-sm text-slate-500">
        BYOK keys are AES-256 encrypted in local storage. License keys are verified remotely with a
        72h offline grace period.
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

      <section className="mb-6 rounded border border-slate-200 p-4">
        <h2 className="mb-2 text-sm font-medium">License</h2>
        <p className="mb-3 text-xs text-slate-500">
          Current tier: <strong>{tier}</strong> ({source})
          {managedUsage && (
            <>
              {' '}
              · Managed AI: {managedUsage.used}/{managedUsage.quota} this month
            </>
          )}
        </p>

        <label className="mb-2 block text-xs font-medium text-slate-600">License key</label>
        <input
          type="text"
          value={licenseKey}
          onChange={(e) => setLicenseKey(e.target.value)}
          placeholder="Paste license key"
          className="mb-3 w-full rounded border border-slate-300 px-2 py-1.5 text-sm font-mono"
        />

        <div className="mb-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleActivateLicense}
            disabled={loading}
            className="rounded bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
          >
            Activate
          </button>
          <button
            type="button"
            onClick={handleVerifyEntitlement}
            disabled={loading}
            className="rounded border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={handleDeactivateLicense}
            disabled={loading}
            className="rounded border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
          >
            Remove license
          </button>
          <button
            type="button"
            onClick={() => chrome.tabs.create({ url: CHECKOUT_URL })}
            className="rounded border border-indigo-300 px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-50"
          >
            Upgrade
          </button>
        </div>

        <details className="text-[11px] text-slate-500">
          <summary className="cursor-pointer font-medium">Dev test keys</summary>
          <ul className="mt-2 list-inside list-disc">
            {devKeys.map((key) => (
              <li key={key}>
                <code className="rounded bg-slate-100 px-1">{key}</code>
              </li>
            ))}
          </ul>
        </details>
      </section>

      {savedFlows.length > 0 && (
        <section className="mb-6 rounded border border-slate-200 p-4">
          <h2 className="mb-2 text-sm font-medium">Saved flows ({savedFlows.length})</h2>
          <ul className="space-y-2 text-xs">
            {savedFlows.map((flow) => (
              <li key={flow.id} className="flex items-center justify-between rounded bg-slate-50 px-2 py-1.5">
                <span>
                  {flow.name} <span className="text-slate-400">({flow.domain})</span>
                </span>
                <div className="flex gap-2">
                  {tier === 'TEAM' && (
                    <button
                      type="button"
                      onClick={async () => {
                        await chrome.runtime.sendMessage({
                          type: 'FORMFLOW_PUBLISH_FLOW_TO_TEAM',
                          flowId: flow.id,
                        });
                        setStatus(`Published “${flow.name}” to team workspace.`);
                      }}
                      className="text-indigo-600 hover:underline"
                    >
                      Share
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void handleDeleteFlow(flow.id)}
                    className="text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Phase6Settings
        tier={tier}
        source={source}
        onStatus={setStatus}
        loading={loading}
        setLoading={setLoading}
      />

      {status && (
        <p className="mb-4 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
          {status}
        </p>
      )}

      <section className="mb-6 rounded border border-slate-200 p-4">
        <h2 className="mb-2 text-sm font-medium">Developer — Simulate Pro tier</h2>
        <p className="mb-3 text-xs text-slate-500">
          Unlocks Pro presets and compilers for local testing without a license key.
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
    </div>
  );
}
