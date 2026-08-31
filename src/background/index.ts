/**
 * Service worker entry point (Manifest: background.service_worker).
 */

import {
  isFormflowMessage,
  type FormflowFillResponse,
  type FormflowResponse,
} from '@/shared/messages';
import { resolveFieldWithAi, testByokConnection } from '@/background/ai-router';
import {
  getByokSettingsPublic,
  saveByokSettings,
} from '@/background/ai-router/settings';
import { isAiRouterError } from '@/background/ai-router/errors';
import { assertFillAllowed, isFillGateError } from '@/background/fill-gate';
import { authorizeSecurityDomain } from '@/background/security/domain-authorization';
import {
  getCachedEntitlement,
  derivedFeatures,
  isWithinGracePeriod,
  setDevProTier,
  activateLicenseKey,
  deactivateLicense,
  verifyEntitlementRemote,
} from '@/background/licensing/index';
import { getManagedAiUsage } from '@/background/ai-router/managed-quota';
import {
  getCompilableLedger,
  getRecordingStatus,
  handleContentReady,
  recordActionForActiveTab,
  startRecording,
  stopRecording,
} from '@/background/ledger/recording-manager';
import { compileLedger } from '@/background/compiler';
import { assertCompilerAllowed, isCompilerGateError } from '@/background/compiler-gate';
import { assertMultiStepAllowed, isRecordingGateError } from '@/background/recording-gate';
import {
  deleteSavedFlow,
  listSavedFlows,
  saveFlow,
  isSavedFlowError,
} from '@/background/saved-flows';

const SW_STATUS_KEY = 'formflow.serviceWorker.startedAt';

type FormflowErrorResponse = Extract<FormflowResponse, { ok: false }>;

console.debug('[FormFlow AI] service worker started');

chrome.runtime.onStartup.addListener(async () => {
  await chrome.storage.local.set({ [SW_STATUS_KEY]: Date.now() });
  console.debug('[FormFlow AI] service worker restarted on browser startup');
});

void chrome.storage.local.set({ [SW_STATUS_KEY]: Date.now() });

function errorResponse(err: unknown): FormflowErrorResponse {
  if (isAiRouterError(err)) {
    return { ok: false, error: err.message, code: err.code };
  }
  if (isFillGateError(err)) {
    return { ok: false, error: err.message, code: err.code, hostname: err.hostname };
  }
  if (isCompilerGateError(err)) {
    return { ok: false, error: err.message, code: err.code };
  }
  if (isRecordingGateError(err)) {
    return { ok: false, error: err.message, code: err.code };
  }
  if (isSavedFlowError(err)) {
    return { ok: false, error: err.message, code: err.code };
  }
  return {
    ok: false,
    error: err instanceof Error ? err.message : 'Unexpected error.',
  };
}

async function getActiveTab(): Promise<chrome.tabs.Tab> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error('No active tab found.');
  if (!tab.url?.startsWith('http')) {
    throw new Error('FormFlow AI only works on http(s) pages. Open a web page and try again.');
  }
  return tab;
}

async function getActiveTabId(): Promise<number> {
  const tab = await getActiveTab();
  return tab.id!;
}

async function sendToTab<T>(tabId: number, payload: unknown): Promise<T> {
  try {
    return await chrome.tabs.sendMessage(tabId, payload);
  } catch {
    throw new Error(
      'Content script is not loaded on this tab. Refresh the page after installing or updating the extension.',
    );
  }
}

async function sendToActiveTab<T>(payload: unknown): Promise<T> {
  const tabId = await getActiveTabId();
  return sendToTab<T>(tabId, payload);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!isFormflowMessage(message)) return;

  const respond = (response: FormflowResponse) => {
    sendResponse(response);
  };

  if (message.type === 'FORMFLOW_PING') {
    respond({ ok: true, source: 'service-worker' });
    return;
  }

  if (message.type === 'FORMFLOW_GET_STATUS') {
    void chrome.storage.local.get(SW_STATUS_KEY).then((stored) => {
      respond({ ok: true, startedAt: stored[SW_STATUS_KEY] ?? Date.now() });
    });
    return true;
  }

  if (message.type === 'FORMFLOW_GET_ENTITLEMENT') {
    void getCachedEntitlement().then((state) => {
      respond({
        ok: true,
        tier: state.tier,
        features: derivedFeatures(state),
        source: state.source,
        withinGrace: isWithinGracePeriod(state),
      });
    });
    return true;
  }

  if (message.type === 'FORMFLOW_VERIFY_ENTITLEMENT') {
    void verifyEntitlementRemote()
      .then((state) => {
        respond({
          ok: true,
          tier: state.tier,
          features: derivedFeatures(state),
          source: state.source,
          withinGrace: isWithinGracePeriod(state),
        });
      })
      .catch((err) => respond(errorResponse(err)));
    return true;
  }

  if (message.type === 'FORMFLOW_ACTIVATE_LICENSE') {
    void activateLicenseKey(message.licenseKey)
      .then((state) => {
        respond({
          ok: true,
          tier: state.tier,
          features: derivedFeatures(state),
          source: state.source,
          withinGrace: isWithinGracePeriod(state),
        });
      })
      .catch((err) => respond(errorResponse(err)));
    return true;
  }

  if (message.type === 'FORMFLOW_DEACTIVATE_LICENSE') {
    void deactivateLicense()
      .then((state) => {
        respond({
          ok: true,
          tier: state.tier,
          features: derivedFeatures(state),
          source: state.source,
          withinGrace: isWithinGracePeriod(state),
        });
      })
      .catch((err) => respond(errorResponse(err)));
    return true;
  }

  if (message.type === 'FORMFLOW_GET_MANAGED_AI_USAGE') {
    void getManagedAiUsage()
      .then((usage) => respond({ ok: true, usage }))
      .catch((err) => respond(errorResponse(err)));
    return true;
  }

  if (message.type === 'FORMFLOW_SET_DEV_PRO_TIER') {
    void setDevProTier(message.enabled)
      .then((state) => {
        respond({
          ok: true,
          tier: state.tier,
          features: derivedFeatures(state),
          source: state.source,
          withinGrace: isWithinGracePeriod(state),
        });
      })
      .catch((err) => respond(errorResponse(err)));
    return true;
  }

  if (message.type === 'FORMFLOW_AUTHORIZE_SECURITY_DOMAIN') {
    void authorizeSecurityDomain(message.hostname)
      .then(() => respond({ ok: true, authorized: true }))
      .catch((err) => respond(errorResponse(err)));
    return true;
  }

  if (message.type === 'FORMFLOW_GET_RECORDING_STATUS') {
    void getRecordingStatus()
      .then((status) => respond({ ok: true, ...status }))
      .catch((err) => respond(errorResponse(err)));
    return true;
  }

  if (message.type === 'FORMFLOW_START_RECORDING') {
    void (async () => {
      const tab = await getActiveTab();
      const ledger = await startRecording(tab.id!, tab.url!);
      await sendToTab(tab.id!, { type: 'FORMFLOW_RECORDING_CONTROL', active: true });
      respond({
        ok: true,
        isRecording: true,
        stepCount: ledger.actions.length,
        sessionId: ledger.sessionId,
      });
    })().catch((err) => respond(errorResponse(err)));
    return true;
  }

  if (message.type === 'FORMFLOW_STOP_RECORDING') {
    void (async () => {
      const status = await getRecordingStatus();
      const ledger = await stopRecording();
      if (status.tabId) {
        await sendToTab(status.tabId, { type: 'FORMFLOW_RECORDING_CONTROL', active: false });
      }
      if (!ledger) throw new Error('No recording to stop.');
      await assertMultiStepAllowed(ledger);
      respond({ ok: true, ledger });
    })().catch((err) => respond(errorResponse(err)));
    return true;
  }

  if (message.type === 'FORMFLOW_RECORD_ACTION') {
    const tabId = sender.tab?.id;
    if (!tabId) {
      respond({ ok: false, error: 'Missing tab context for recorded action.' });
      return true;
    }
    void recordActionForActiveTab(tabId, message.action)
      .then(() => getRecordingStatus())
      .then((status) => respond({ ok: true, ...status }))
      .catch((err) => respond(errorResponse(err)));
    return true;
  }

  if (message.type === 'FORMFLOW_CONTENT_READY') {
    const tabId = sender.tab?.id;
    if (!tabId) return;
    void handleContentReady(tabId, message.url).catch(() => undefined);
    return;
  }

  if (message.type === 'FORMFLOW_COMPILE_LEDGER') {
    void (async () => {
      await assertCompilerAllowed(message.target);
      const ledger = await getCompilableLedger();
      if (!ledger || ledger.actions.length === 0) {
        throw new Error('Record a flow first — the action ledger is empty.');
      }
      await assertMultiStepAllowed(ledger);
      const code = compileLedger(ledger, message.target);
      respond({ ok: true, code, target: message.target });
    })().catch((err) => respond(errorResponse(err)));
    return true;
  }

  if (message.type === 'FORMFLOW_RESOLVE_FIELD') {
    void resolveFieldWithAi(message.snippet)
      .then((result) => {
        respond({
          ok: true,
          value: result.suggestedValue,
          latencyMs: result.latencyMs,
          provider: result.provider,
        });
      })
      .catch((err) => respond(errorResponse(err)));
    return true;
  }

  if (message.type === 'FORMFLOW_GET_BYOK_SETTINGS') {
    void getByokSettingsPublic()
      .then((settings) => respond({ ok: true, settings }))
      .catch((err) => respond(errorResponse(err)));
    return true;
  }

  if (message.type === 'FORMFLOW_SAVE_BYOK_SETTINGS') {
    void saveByokSettings({
      provider: message.provider,
      apiKey: message.apiKey,
      endpoint: message.endpoint,
    })
      .then(async () => {
        const settings = await getByokSettingsPublic();
        respond({ ok: true, settings });
      })
      .catch((err) => respond(errorResponse(err)));
    return true;
  }

  if (message.type === 'FORMFLOW_TEST_BYOK') {
    void testByokConnection()
      .then((result) => {
        respond({
          ok: true,
          value: result.suggestedValue,
          latencyMs: result.latencyMs,
          provider: result.provider,
        });
      })
      .catch((err) => respond(errorResponse(err)));
    return true;
  }

  if (message.type === 'FORMFLOW_SAVE_FLOW') {
    void (async () => {
      const ledger = await getCompilableLedger();
      if (!ledger || ledger.actions.length === 0) {
        throw new Error('Record a flow first — nothing to save.');
      }
      await assertMultiStepAllowed(ledger);
      const flow = await saveFlow(message.name, ledger);
      respond({ ok: true, flow });
    })().catch((err) => respond(errorResponse(err)));
    return true;
  }

  if (message.type === 'FORMFLOW_LIST_SAVED_FLOWS') {
    void listSavedFlows()
      .then((flows) => respond({ ok: true, flows }))
      .catch((err) => respond(errorResponse(err)));
    return true;
  }

  if (message.type === 'FORMFLOW_DELETE_SAVED_FLOW') {
    void deleteSavedFlow(message.id)
      .then(() => getRecordingStatus())
      .then((status) => respond({ ok: true, ...status }))
      .catch((err) => respond(errorResponse(err)));
    return true;
  }

  if (message.type === 'FORMFLOW_FILL_FORM') {
    void assertFillAllowed(message.presetMode)
      .then(() => sendToActiveTab<FormflowFillResponse>(message))
      .then((result) => {
        if (result?.ok) respond(result);
        else respond({ ok: false, error: 'Fill request failed.' });
      })
      .catch((err) => respond(errorResponse(err)));
    return true;
  }
});
