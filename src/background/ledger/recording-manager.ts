/**
 * Module 4 — active recording session management (FR-4.2, FR-4.4).
 */

import type { ActionLedger, LedgerAction } from '@/shared/schema/action-ledger';
import {
  appendAction,
  getSession,
  restoreSession,
  startSession,
} from '@/background/ledger/index';

const ACTIVE_RECORDING_KEY = 'formflow.recording.active';
const LAST_LEDGER_KEY = 'formflow.recording.lastCompleted';
const LEDGER_BACKUP_KEY = 'formflow.recording.ledger';

export interface ActiveRecording {
  sessionId: string;
  tabId: number;
  originDomain: string;
  lastUrl: string;
}

function createSessionId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function loadActiveRecording(): Promise<ActiveRecording | null> {
  const stored = await chrome.storage.session.get(ACTIVE_RECORDING_KEY);
  return (stored[ACTIVE_RECORDING_KEY] as ActiveRecording | undefined) ?? null;
}

async function saveActiveRecording(state: ActiveRecording | null): Promise<void> {
  if (state) {
    await chrome.storage.session.set({ [ACTIVE_RECORDING_KEY]: state });
  } else {
    await chrome.storage.session.remove(ACTIVE_RECORDING_KEY);
  }
}

async function backupLedger(ledger: ActionLedger): Promise<void> {
  await chrome.storage.session.set({ [LEDGER_BACKUP_KEY]: ledger });
}

async function getOrRestoreSession(sessionId: string): Promise<ActionLedger | undefined> {
  const existing = getSession(sessionId);
  if (existing) return existing;

  const stored = await chrome.storage.session.get(LEDGER_BACKUP_KEY);
  const ledger = stored[LEDGER_BACKUP_KEY] as ActionLedger | undefined;
  if (ledger?.sessionId === sessionId) {
    restoreSession(ledger);
    return ledger;
  }
  return undefined;
}

export async function getRecordingStatus(): Promise<{
  isRecording: boolean;
  stepCount: number;
  sessionId?: string;
  tabId?: number;
}> {
  const active = await loadActiveRecording();
  if (!active) return { isRecording: false, stepCount: 0 };

  const session = await getOrRestoreSession(active.sessionId);
  return {
    isRecording: true,
    stepCount: session?.actions.length ?? 0,
    sessionId: active.sessionId,
    tabId: active.tabId,
  };
}

export async function startRecording(tabId: number, url: string): Promise<ActionLedger> {
  const existing = await loadActiveRecording();
  if (existing) {
    throw new Error('A recording is already in progress. Stop it before starting a new one.');
  }

  const originDomain = new URL(url).hostname;
  const sessionId = createSessionId();
  startSession(sessionId, originDomain);

  await saveActiveRecording({
    sessionId,
    tabId,
    originDomain,
    lastUrl: url,
  });

  appendAction(sessionId, {
    type: 'NAVIGATE',
    url,
    target: { css: 'html' },
  });

  const ledger = getSession(sessionId)!;
  await backupLedger(ledger);
  return ledger;
}

export async function stopRecording(): Promise<ActionLedger | null> {
  const active = await loadActiveRecording();
  if (!active) return null;

  const ledger = (await getOrRestoreSession(active.sessionId)) ?? null;
  await saveActiveRecording(null);
  await chrome.storage.session.remove(LEDGER_BACKUP_KEY);
  if (ledger) {
    await chrome.storage.session.set({ [LAST_LEDGER_KEY]: ledger });
  }
  return ledger;
}

export async function getCompilableLedger(): Promise<ActionLedger | null> {
  const active = await getActiveLedger();
  if (active) return active;

  const stored = await chrome.storage.session.get(LAST_LEDGER_KEY);
  return (stored[LAST_LEDGER_KEY] as ActionLedger | undefined) ?? null;
}

export async function getActiveLedger(): Promise<ActionLedger | null> {
  const active = await loadActiveRecording();
  if (!active) return null;
  return (await getOrRestoreSession(active.sessionId)) ?? null;
}

export async function recordActionForActiveTab(
  tabId: number,
  action: Omit<LedgerAction, 'step'>,
): Promise<LedgerAction | null> {
  const active = await loadActiveRecording();
  if (!active || active.tabId !== tabId) return null;

  const session = await getOrRestoreSession(active.sessionId);
  if (!session) return null;

  const entry = appendAction(active.sessionId, action);
  await backupLedger(getSession(active.sessionId)!);
  return entry;
}

export async function handleContentReady(tabId: number, url: string): Promise<void> {
  const active = await loadActiveRecording();
  if (!active || active.tabId !== tabId) return;
  if (active.lastUrl === url) return;

  active.lastUrl = url;
  await saveActiveRecording(active);
  await recordActionForActiveTab(tabId, {
    type: 'NAVIGATE',
    url,
    target: { css: 'html' },
  });
}

export async function isTabRecording(tabId: number): Promise<boolean> {
  const active = await loadActiveRecording();
  return active?.tabId === tabId;
}
