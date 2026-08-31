/**
 * Module 4 — content-script recorder (clicks + recording state).
 */

import { resolveLocator } from '@/content/locator-resolver';
import type { FillPlanEntry } from '@/shared/types/fill-report';
import type { FormflowMessage } from '@/shared/messages';

let recordingActive = false;
let clickListener: ((event: MouseEvent) => void) | null = null;

export function isRecordingActive(): boolean {
  return recordingActive;
}

export function setRecordingActive(active: boolean): void {
  recordingActive = active;
  if (active) {
    attachClickListener();
  } else {
    detachClickListener();
  }
}

async function sendRecordAction(message: Extract<FormflowMessage, { type: 'FORMFLOW_RECORD_ACTION' }>): Promise<void> {
  try {
    await chrome.runtime.sendMessage(message);
  } catch {
    // Service worker may be asleep — recording backup handles persistence on next action.
  }
}

export async function recordFillEntries(entries: FillPlanEntry[]): Promise<void> {
  if (!recordingActive) return;
  for (const entry of entries) {
    await sendRecordAction({
      type: 'FORMFLOW_RECORD_ACTION',
      action: {
        type: 'FILL',
        target: entry.target,
        value: entry.value,
        presetMode: entry.presetMode,
      },
    });
  }
}

function attachClickListener(): void {
  if (clickListener) return;

  clickListener = (event: MouseEvent) => {
    if (!recordingActive) return;

    const target = event.target;
    if (!(target instanceof Element)) return;

    const clickable = target.closest(
      'button, a[href], input[type="submit"], input[type="button"], [role="button"]',
    );
    if (!(clickable instanceof HTMLElement)) return;

    void sendRecordAction({
      type: 'FORMFLOW_RECORD_ACTION',
      action: {
        type: 'CLICK',
        target: resolveLocator(clickable),
      },
    });
  };

  document.addEventListener('click', clickListener, true);
}

function detachClickListener(): void {
  if (!clickListener) return;
  document.removeEventListener('click', clickListener, true);
  clickListener = null;
}

export async function notifyContentReady(): Promise<void> {
  try {
    await chrome.runtime.sendMessage({
      type: 'FORMFLOW_CONTENT_READY',
      url: location.href,
    });
  } catch {
    /* background may be restarting */
  }
}

/** Wraps history.pushState/replaceState to capture SPA navigations (FR-4.4). */
export function patchSpaNavigation(): void {
  const notify = () => {
    if (recordingActive) void notifyContentReady();
  };

  const wrapHistory = (method: 'pushState' | 'replaceState') => {
    const original = history[method].bind(history);
    history[method] = (...args: Parameters<History['pushState']>) => {
      original(...args);
      notify();
    };
  };

  wrapHistory('pushState');
  wrapHistory('replaceState');
  window.addEventListener('popstate', notify);
}
