/**
 * Module 4 — Session Action Ledger (FR-4.2, FR-4.4).
 *
 * Lives in the service worker (not the content script) specifically so it
 * persists across navigation events — full page loads and SPA route
 * changes — within one recording session. That persistence is what makes
 * multi-step/multi-page flow recording (FR-4.4) possible; a content-script-
 * only ledger would be destroyed on every full page navigation.
 */

import type { ActionLedger, LedgerAction } from '@/shared/schema/action-ledger';

const sessions = new Map<string, ActionLedger>();

export function startSession(sessionId: string, originDomain?: string): ActionLedger {
  const session: ActionLedger = { sessionId, timestamp: Date.now(), originDomain, actions: [] };
  sessions.set(sessionId, session);
  return session;
}

export function appendAction(sessionId: string, action: Omit<LedgerAction, 'step'>): LedgerAction {
  const session = sessions.get(sessionId);
  if (!session) throw new Error(`No active session: ${sessionId}`);

  const entry: LedgerAction = { ...action, step: session.actions.length + 1 };
  session.actions.push(entry);
  return entry;
}

export function getSession(sessionId: string): ActionLedger | undefined {
  return sessions.get(sessionId);
}

export function endSession(sessionId: string): ActionLedger | undefined {
  const session = sessions.get(sessionId);
  sessions.delete(sessionId);
  return session;
}

/** Rehydrates an in-memory session from chrome.storage.session after SW restart. */
export function restoreSession(ledger: ActionLedger): void {
  sessions.set(ledger.sessionId, ledger);
}
