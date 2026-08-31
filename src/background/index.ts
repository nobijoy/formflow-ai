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
import {
  authorizeSecurityDomain,
} from '@/background/security/domain-authorization';
import {
  getCachedEntitlement,
  setDevProTier,
} from '@/background/licensing/index';

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
  return {
    ok: false,
    error: err instanceof Error ? err.message : 'Unexpected error.',
  };
}

async function getActiveTabId(): Promise<number> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error('No active tab found.');
  if (!tab.url?.startsWith('http')) {
    throw new Error('FormFlow AI only works on http(s) pages. Open a web page and try again.');
  }
  return tab.id;
}

async function sendToActiveTab<T>(payload: unknown): Promise<T> {
  const tabId = await getActiveTabId();
  try {
    return await chrome.tabs.sendMessage(tabId, payload);
  } catch {
    throw new Error(
      'Content script is not loaded on this tab. Refresh the page after installing or updating the extension.',
    );
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
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
      respond({ ok: true, tier: state.tier, features: state.features });
    });
    return true;
  }

  if (message.type === 'FORMFLOW_SET_DEV_PRO_TIER') {
    void setDevProTier(message.enabled)
      .then(async () => {
        const state = await getCachedEntitlement();
        respond({ ok: true, tier: state.tier, features: state.features });
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
