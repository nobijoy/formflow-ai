/**
 * Module 1 — DOM Inspection orchestration.
 *
 * Ties together shadow-dom traversal, locator resolution, and value
 * injection into the single entry point the popup calls (via the service
 * worker → chrome.scripting message) to run a fill pass.
 */

import { findFillableElements } from '@/content/shadow-dom';
import { resolveLocator } from '@/content/locator-resolver';
import { setNativeValue } from '@/content/setter-interceptor';
import { dispatchFillEvents } from '@/content/event-dispatcher';
import type { PresetMode, TargetLocator } from '@/shared/schema/action-ledger';

export interface FillPlanEntry {
  target: TargetLocator;
  value: string;
  presetMode: PresetMode;
}

export interface InspectionReport {
  filled: FillPlanEntry[];
  unreachableCount: number;
}

/**
 * Runs one fill pass over the current document using `valueForElement` to
 * decide what to put in each field (delegated to Module 2's preset engine —
 * kept out of this file so DOM mechanics and data generation stay decoupled).
 */
export function runFillPass(
  valueForElement: (el: Element) => { value: string; presetMode: PresetMode } | null,
): InspectionReport {
  const { reachableInputs, unreachableHosts } = findFillableElements(document);
  const filled: FillPlanEntry[] = [];

  for (const el of reachableInputs) {
    if (!(el instanceof HTMLElement)) continue;
    const decision = valueForElement(el);
    if (!decision) continue;

    setNativeValue(el as HTMLInputElement, decision.value);
    dispatchFillEvents(el);

    filled.push({
      target: resolveLocator(el),
      value: decision.value,
      presetMode: decision.presetMode,
    });
  }

  return { filled, unreachableCount: unreachableHosts.length };
}
