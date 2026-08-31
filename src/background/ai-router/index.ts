/**
 * Module 3 — AI inference router entry point.
 *
 * FR-3.1: static heuristics are applied in the content script before this
 * module is called. This file only handles external inference for heuristic
 * misses.
 */

export { resolveViaStaticHeuristic } from '@/background/ai-router/heuristics';
export { sanitizePayload } from '@/background/ai-router/payload-sanitizer';
export {
  callByokProvider,
  testByokConnection,
  type AiInferenceRequest,
  type AiInferenceResult,
} from '@/background/ai-router/byok';
export {
  getByokSettingsPublic,
  saveByokSettings,
  loadByokSettings,
  type ByokSettingsPublic,
} from '@/background/ai-router/settings';
export { AiRouterError, isAiRouterError } from '@/background/ai-router/errors';

import { callByokProvider } from '@/background/ai-router/byok';

export async function resolveFieldWithAi(sanitizedSnippet: string) {
  return callByokProvider({ prompt: sanitizedSnippet });
}
