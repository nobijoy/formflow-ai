/**
 * Module 3 — FR-3.3 BYOK orchestration (Gemini, Groq, Ollama).
 *
 * Threat model: see key-storage.ts — casual storage inspection only.
 */

import type { ByokProvider } from '@/shared/types/byok';
import {
  DEFAULT_OLLAMA_ENDPOINT,
} from '@/shared/constants/byok-storage';
import { decryptApiKey, loadByokSettings } from '@/background/ai-router/settings';
import { callGemini } from '@/background/ai-router/providers/gemini';
import { callGroq } from '@/background/ai-router/providers/groq';
import { callOllama } from '@/background/ai-router/providers/ollama';
import { AiRouterError } from '@/background/ai-router/errors';

export type { ByokProvider };

export interface AiInferenceRequest {
  /** Sanitized DOM snippet — PII must already be stripped (FR-3.2). */
  prompt: string;
}

export interface AiInferenceResult {
  suggestedValue: string;
  latencyMs: number;
  provider: ByokProvider;
}

export async function callByokProvider(request: AiInferenceRequest): Promise<AiInferenceResult> {
  const settings = await loadByokSettings();
  if (!settings) {
    throw new AiRouterError('NO_BYOK', 'BYOK is not configured. Add a provider in Settings.');
  }

  const start = performance.now();
  let suggestedValue: string;
  const provider = settings.provider;

  switch (settings.provider) {
    case 'gemini': {
      const apiKey = await decryptApiKey(settings);
      suggestedValue = await callGemini(apiKey, request.prompt);
      break;
    }
    case 'groq': {
      const apiKey = await decryptApiKey(settings);
      suggestedValue = await callGroq(apiKey, request.prompt);
      break;
    }
    case 'ollama': {
      const endpoint = settings.endpoint ?? DEFAULT_OLLAMA_ENDPOINT;
      suggestedValue = await callOllama(endpoint, request.prompt);
      break;
    }
    default:
      throw new AiRouterError('BAD_RESPONSE', 'Unknown BYOK provider.');
  }

  return {
    suggestedValue,
    latencyMs: Math.round(performance.now() - start),
    provider,
  };
}

/** Lightweight connectivity check used by the options page. */
export async function testByokConnection(): Promise<AiInferenceResult> {
  return callByokProvider({
    prompt: 'tag=input type=text label="Favorite color"',
  });
}
