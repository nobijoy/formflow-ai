/**
 * Module 3 — FR-3.4 Managed Inference (Pro/Team).
 *
 * Routes inference through a FormFlow-operated proxy backed by a pooled
 * Groq/Gemini key. IMPORTANT: the pooled key must live server-side only —
 * this client module only ever calls the proxy's HTTPS endpoint with a
 * license/account token, never a provider key directly (NFR-7).
 */

import type { AiInferenceRequest, AiInferenceResult } from './byok';

const MANAGED_PROXY_ENDPOINT = 'https://api.formflow.ai/v1/infer'; // placeholder — real endpoint TBD.

export interface ManagedInferenceError {
  code: 'QUOTA_EXCEEDED' | 'UNAUTHENTICATED' | 'PROVIDER_TIMEOUT' | 'UNKNOWN';
  message: string;
}

/**
 * Placeholder — Phase 5 implements the real fetch + quota-metering-aware
 * error handling. Must fail closed (surface an error) rather than silently
 * falling back to BYOK/no-op if the account is over quota (NFR-7).
 */
export async function callManagedInference(
  _licenseToken: string,
  _request: AiInferenceRequest,
): Promise<AiInferenceResult> {
  throw new Error('Not implemented: see docs/03-ai-inference-and-routing.md Phase 5 checklist');
}

void MANAGED_PROXY_ENDPOINT;
