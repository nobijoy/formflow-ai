/**
 * Module 3 — FR-3.3 BYOK (Free tier).
 *
 * User-supplied keys for Gemini, Groq, or local Ollama. Keys are AES-256
 * encrypted before being written to chrome.storage.local — see
 * docs/03-ai-inference-and-routing.md Open Question #3 for the documented
 * threat model this protects against (casual local inspection, not a fully
 * compromised device).
 */

export type ByokProvider = 'gemini' | 'groq' | 'ollama';

export interface ByokConfig {
  provider: ByokProvider;
  /** Ciphertext only — never hold a decrypted key in memory longer than one call. */
  encryptedApiKey: string;
  /** Required for 'ollama'; defaults to http://localhost:11434 */
  endpoint?: string;
}

export interface AiInferenceRequest {
  /** Sanitized DOM snippet only — see sanitizePayload in payload-sanitizer.ts. PII must already be stripped. */
  prompt: string;
}

export interface AiInferenceResult {
  suggestedValue: string;
  latencyMs: number;
}

/**
 * Placeholder — Phase 2 implements the real per-provider request/response
 * mapping and the invalid-key / timeout / provider-outage failure paths
 * called out in the Phase 2 exit criteria (PROJECT.md Section 10).
 */
export async function callByokProvider(
  _config: ByokConfig,
  _request: AiInferenceRequest,
): Promise<AiInferenceResult> {
  throw new Error('Not implemented: see docs/03-ai-inference-and-routing.md Phase 2 checklist');
}
