import { BYOK_DEFAULT_MODELS } from '@/shared/constants/byok-storage';
import {
  buildInferencePrompt,
  fetchWithTimeout,
  mapHttpStatusToError,
  normalizeModelValue,
} from '@/background/ai-router/providers/http';
import { AiRouterError } from '@/background/ai-router/errors';

interface OllamaResponse {
  response?: string;
}

export async function callOllama(
  endpoint: string,
  fieldSnippet: string,
  model: string = BYOK_DEFAULT_MODELS.ollama,
): Promise<string> {
  const base = endpoint.replace(/\/$/, '');
  const response = await fetchWithTimeout(`${base}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      prompt: buildInferencePrompt(fieldSnippet),
      stream: false,
    }),
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new AiRouterError(
        'BAD_RESPONSE',
        `Ollama model "${model}" not found. Pull it with: ollama pull ${model}`,
      );
    }
    await mapHttpStatusToError('Ollama', response);
  }

  const json = (await response.json()) as OllamaResponse;
  if (!json.response) {
    throw new AiRouterError('BAD_RESPONSE', 'Ollama returned an empty response.');
  }
  return normalizeModelValue(json.response);
}
