/**
 * Module 3 — FR-3.4 Managed Inference (Pro/Team).
 *
 * Routes inference through a FormFlow-operated proxy backed by a pooled
 * Groq/Gemini key. The pooled key lives server-side only — this client
 * calls the proxy with a license token (NFR-7).
 */

import { MANAGED_PROXY_ENDPOINT } from '@/shared/constants/licensing';
import type { AiInferenceRequest, AiInferenceResult } from '@/background/ai-router/byok';
import { AiRouterError } from '@/background/ai-router/errors';
import {
  assertManagedQuotaAvailable,
  incrementManagedQuota,
} from '@/background/ai-router/managed-quota';
import { getCachedEntitlement, hasFeature } from '@/background/licensing';
import { getLicenseKey } from '@/background/licensing/license-key-storage';

const MANAGED_TIMEOUT_MS = 15_000;

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), MANAGED_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new AiRouterError('TIMEOUT', 'Managed AI request timed out.');
    }
    throw new AiRouterError('NETWORK_ERROR', 'Could not reach managed AI service.');
  } finally {
    clearTimeout(timer);
  }
}

/** Local stub for dev/founding license keys — no network required. */
async function callManagedDevStub(request: AiInferenceRequest): Promise<AiInferenceResult> {
  const start = performance.now();
  const labelMatch = request.prompt.match(/label="([^"]+)"/i);
  const nameMatch = request.prompt.match(/name="([^"]+)"/i);
  const hint = labelMatch?.[1] ?? nameMatch?.[1] ?? 'field';
  const value = `test-${hint.toLowerCase().replace(/\s+/g, '-')}`;

  await new Promise((r) => setTimeout(r, 50));

  return {
    suggestedValue: value,
    latencyMs: Math.round(performance.now() - start),
    provider: 'managed',
  };
}

export async function callManagedInference(request: AiInferenceRequest): Promise<AiInferenceResult> {
  if (!(await hasFeature('MANAGED_AI_INFERENCE'))) {
    throw new AiRouterError('NO_BYOK', 'Managed AI requires FormFlow Pro.');
  }

  await assertManagedQuotaAvailable();

  const entitlement = await getCachedEntitlement();
  const useDevStub =
    entitlement.source === 'dev' || entitlement.source === 'founding_lifetime';

  if (useDevStub) {
    const result = await callManagedDevStub(request);
    await incrementManagedQuota();
    return result;
  }

  const licenseKey = await getLicenseKey();
  if (!licenseKey) {
    throw new AiRouterError(
      'INVALID_KEY',
      'Activate a license key in Settings to use managed AI.',
    );
  }

  const start = performance.now();
  const response = await fetchWithTimeout(MANAGED_PROXY_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${licenseKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt: request.prompt }),
  });

  if (response.status === 401 || response.status === 403) {
    throw new AiRouterError('INVALID_KEY', 'License key rejected by managed AI service.');
  }

  if (response.status === 429) {
    throw new AiRouterError(
      'QUOTA_EXCEEDED',
      'Managed AI quota exceeded on the server. Try BYOK or wait until next month.',
    );
  }

  if (!response.ok) {
    throw new AiRouterError('PROVIDER_OUTAGE', `Managed AI service error (${response.status}).`);
  }

  const json = (await response.json()) as { value?: string; suggestedValue?: string };
  const suggestedValue = json.suggestedValue ?? json.value;
  if (!suggestedValue) {
    throw new AiRouterError('BAD_RESPONSE', 'Managed AI returned an empty value.');
  }

  await incrementManagedQuota();

  return {
    suggestedValue,
    latencyMs: Math.round(performance.now() - start),
    provider: 'managed',
  };
}
