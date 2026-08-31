import { BYOK_DEFAULT_MODELS } from '@/shared/constants/byok-storage';
import {
  buildInferencePrompt,
  fetchWithTimeout,
  mapHttpStatusToError,
  normalizeModelValue,
} from '@/background/ai-router/providers/http';
import { AiRouterError } from '@/background/ai-router/errors';

interface GroqResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

export async function callGroq(
  apiKey: string,
  fieldSnippet: string,
  model: string = BYOK_DEFAULT_MODELS.groq,
): Promise<string> {
  const response = await fetchWithTimeout('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: buildInferencePrompt(fieldSnippet) }],
      max_tokens: 64,
      temperature: 0.2,
    }),
  });

  if (!response.ok) await mapHttpStatusToError('Groq', response);

  const json = (await response.json()) as GroqResponse;
  const text = json.choices?.[0]?.message?.content;
  if (!text) throw new AiRouterError('BAD_RESPONSE', 'Groq returned an empty response.');
  return normalizeModelValue(text);
}
