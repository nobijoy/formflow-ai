/**
 * Phase 3–4 fill orchestration — all presets + recording FILL actions.
 */

import { generateHappyPathValue } from '@/data-generators/happy-path';
import { resolvePresetValue } from '@/data-generators/preset-resolver';
import { runFillPassAsync } from '@/content/dom-inspector';
import { recordFillEntries } from '@/content/recorder';
import type { InspectionReport } from '@/shared/types/fill-report';
import {
  extractFieldContext,
  extractFieldSnippet,
  genericFallback,
  isFillableInput,
} from '@/content/field-context';
import type { PresetMode } from '@/shared/schema/action-ledger';
import type { FormflowResolveFieldResponse, FormflowResponse } from '@/shared/messages';

function readMaxLength(el: Element): number | null {
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    return el.maxLength > 0 ? el.maxLength : null;
  }
  return null;
}

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
  let heuristicResolvedCount = 0;
  let aiResolvedCount = 0;
  let fieldIndex = 0;

  const report = await runFillPassAsync(async (el) => {
    if (!isFillableInput(el)) return null;

    const context = extractFieldContext(el);
    const presetValue = resolvePresetValue(presetMode, {
      context,
      maxLength: readMaxLength(el),
      fieldIndex,
    });
    fieldIndex += 1;

    if (presetValue !== null) {
      heuristicResolvedCount += 1;
      return { value: presetValue, presetMode };
    }

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

  await recordFillEntries(report.filled);

  return { ...report, heuristicResolvedCount, aiResolvedCount };
}
