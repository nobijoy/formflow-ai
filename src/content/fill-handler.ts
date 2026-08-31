/**
 * Phase 1–2 fill orchestration.
 *
 * FR-3.1: static heuristics run first (<5 ms, no network). Only heuristic
 * misses call the background AI router (FR-3.3 BYOK).
 */

import { generateHappyPathValue } from '@/data-generators/happy-path';
import { runFillPassAsync } from '@/content/dom-inspector';
import type { InspectionReport } from '@/shared/types/fill-report';
import {
  extractFieldContext,
  extractFieldSnippet,
  genericFallback,
  isFillableInput,
} from '@/content/field-context';
import type { PresetMode } from '@/shared/schema/action-ledger';
import type { FormflowResolveFieldResponse, FormflowResponse } from '@/shared/messages';

async function resolveViaAi(snippet: string): Promise<string | null> {
  const response = (await chrome.runtime.sendMessage({
    type: 'FORMFLOW_RESOLVE_FIELD',
    snippet,
  })) as FormflowResponse;

  if (!response?.ok) {
    const code = 'code' in response ? response.code : undefined;
    if (code === 'NO_BYOK') return null;
    throw new Error('error' in response ? response.error : 'AI resolution failed.');
  }

  if (!('value' in response)) return null;
  return (response as FormflowResolveFieldResponse).value;
}

export async function fillFormWithPreset(presetMode: PresetMode): Promise<InspectionReport> {
  if (presetMode !== 'HAPPY_PATH') {
    throw new Error(`Preset "${presetMode}" is not available until Phase 3.`);
  }

  let heuristicResolvedCount = 0;
  let aiResolvedCount = 0;

  const report = await runFillPassAsync(async (el) => {
    if (!isFillableInput(el)) return null;

    const context = extractFieldContext(el);
    const heuristic = generateHappyPathValue(context);
    if (heuristic) {
      heuristicResolvedCount += 1;
      return { value: heuristic, presetMode: 'HAPPY_PATH' };
    }

    const snippet = extractFieldSnippet(el);
    const aiValue = await resolveViaAi(snippet);
    if (aiValue) {
      aiResolvedCount += 1;
      return { value: aiValue, presetMode: 'HAPPY_PATH' };
    }

    heuristicResolvedCount += 1;
    return { value: genericFallback(context), presetMode: 'HAPPY_PATH' };
  });

  return { ...report, heuristicResolvedCount, aiResolvedCount };
}
