import { BYOK_DEFAULT_MODELS } from '@/shared/constants/byok-storage';
import {
  buildInferencePrompt,
  fetchWithTimeout,
  mapHttpStatusToError,
  normalizeModelValue,
} from '@/background/ai-router/providers/http';
import { AiRouterError } from '@/background/ai-router/errors';

interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
}

export async function callGemini(
  apiKey: string,
  fieldSnippet: string,
  model: string = BYOK_DEFAULT_MODELS.gemini,
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const response = await fetchWithTimeout(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: buildInferencePrompt(fieldSnippet) }] }],
      generationConfig: { maxOutputTokens: 64, temperature: 0.2 },
    }),
  });

  if (!response.ok) await mapHttpStatusToError('Gemini', response);

  const json = (await response.json()) as GeminiResponse;
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new AiRouterError('BAD_RESPONSE', 'Gemini returned an empty response.');
  return normalizeModelValue(text);
}
