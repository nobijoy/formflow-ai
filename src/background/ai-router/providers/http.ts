import { BYOK_REQUEST_TIMEOUT_MS } from '@/shared/constants/byok-storage';
import { AiRouterError } from '@/background/ai-router/errors';

const SYSTEM_PROMPT =
  'You generate one realistic synthetic test value for a web form field used in QA testing. Reply with ONLY the value — no quotes, labels, or explanation.';

export function buildInferencePrompt(fieldSnippet: string): string {
  return `${SYSTEM_PROMPT}\n\nField context: ${fieldSnippet}`;
}

export function normalizeModelValue(raw: string): string {
  return raw.trim().replace(/^["'`]|["'`]$/g, '').split('\n')[0]?.trim() ?? '';
}

export async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number = BYOK_REQUEST_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new AiRouterError(
        'TIMEOUT',
        `AI request timed out after ${Math.round(timeoutMs / 1000)}s.`,
      );
    }
    throw new AiRouterError(
      'NETWORK_ERROR',
      'Network error — check your connection or that Ollama is running locally.',
    );
  } finally {
    clearTimeout(timer);
  }
}

export async function mapHttpStatusToError(
  provider: string,
  response: Response,
): Promise<never> {
  if (response.status === 401 || response.status === 403) {
    throw new AiRouterError('INVALID_KEY', `Invalid ${provider} API key.`);
  }
  if (response.status >= 500) {
    throw new AiRouterError(
      'PROVIDER_OUTAGE',
      `${provider} is unavailable (${response.status}). Try again later.`,
    );
  }

  const body = await response.text();
  throw new AiRouterError(
    'BAD_RESPONSE',
    `${provider} error (${response.status}): ${body.slice(0, 160)}`,
  );
}
