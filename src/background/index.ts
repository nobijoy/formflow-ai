/**
 * Service worker entry point (Manifest: background.service_worker).
 *
 * Owns: the session action ledger (Module 4), the compiler dispatch
 * (Module 4), AI routing (Module 3), and licensing/entitlements (Module 5).
 * The content script never talks to these directly — everything routes
 * through chrome.runtime messaging so this file is the single source of
 * truth for cross-tab / cross-navigation state.
 */

console.debug('[FormFlow AI] service worker started');

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'FORMFLOW_PING') {
    sendResponse({ ok: true, source: 'service-worker' });
    return;
  }
  // Additional message handlers (start/stop recording, compile request,
  // AI resolve request, entitlement check) land here as each module ships —
  // see docs/roadmap.md for sequencing.
});
