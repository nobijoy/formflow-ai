/**
 * Module 3 — AI inference router entry point.
 *
 * FR-3.1: static heuristics are applied in the content script before this
 * module is called. This file only handles external inference for heuristic
 * misses.
 *
 * Routing order: BYOK (Free) → managed inference (Pro, no key required).
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
export { callManagedInference } from '@/background/ai-router/managed';

import { callByokProvider } from '@/background/ai-router/byok';
import { AiRouterError } from '@/background/ai-router/errors';
import { callManagedInference } from '@/background/ai-router/managed';
import { loadByokSettings } from '@/background/ai-router/settings';
import { hasFeature } from '@/background/licensing';

export async function resolveFieldWithAi(sanitizedSnippet: string) {
  const settings = await loadByokSettings();
  if (settings) {
    return callByokProvider({ prompt: sanitizedSnippet });
  }

  if (await hasFeature('MANAGED_AI_INFERENCE')) {
    return callManagedInference({ prompt: sanitizedSnippet });
  }

  throw new AiRouterError(
    'NO_BYOK',
    'Configure BYOK in Settings, or upgrade to Pro for managed AI inference.',
  );
}
