/**
 * Module 1 — DOM Inspection orchestration.
 */

import { findFillableElements } from '@/content/shadow-dom';
import { resolveLocator } from '@/content/locator-resolver';
import { injectValue } from '@/content/inject-value';
import type { PresetMode } from '@/shared/schema/action-ledger';
import type { FillPlanEntry, InspectionReport } from '@/shared/types/fill-report';

export type { FillPlanEntry, InspectionReport } from '@/shared/types/fill-report';

export function runFillPass(
  valueForElement: (el: Element) => { value: string; presetMode: PresetMode } | null,
): InspectionReport {
  const { reachableInputs, unreachableHosts } = findFillableElements(document);
  const filled: FillPlanEntry[] = [];

  for (const el of reachableInputs) {
    if (!(el instanceof HTMLElement)) continue;
    const decision = valueForElement(el);
    if (!decision) continue;

    injectValue(el as HTMLInputElement, decision.value);
    filled.push({
      target: resolveLocator(el),
      value: decision.value,
      presetMode: decision.presetMode,
    });
  }

  return emptyReport(filled, unreachableHosts.length);
}

/** Phase 2 — async value resolver for BYOK AI calls between fields. */
export async function runFillPassAsync(
  valueForElement: (
    el: Element,
  ) => Promise<{ value: string; presetMode: PresetMode } | null>,
): Promise<InspectionReport> {
  const { reachableInputs, unreachableHosts } = findFillableElements(document);
  const filled: FillPlanEntry[] = [];

  for (const el of reachableInputs) {
    if (!(el instanceof HTMLElement)) continue;
    const decision = await valueForElement(el);
    if (!decision) continue;

    injectValue(el as HTMLInputElement, decision.value);
    filled.push({
      target: resolveLocator(el),
      value: decision.value,
      presetMode: decision.presetMode,
    });
  }

  return emptyReport(filled, unreachableHosts.length);
}

function emptyReport(filled: FillPlanEntry[], unreachableCount: number): InspectionReport {
  return { filled, unreachableCount, heuristicResolvedCount: 0, aiResolvedCount: 0 };
}
