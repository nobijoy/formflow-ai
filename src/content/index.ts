/**
 * Content script entry point (Manifest: content_scripts).
 *
 * Kept intentionally thin: listens for messages from the service worker and
 * delegates to dom-inspector. No business logic should live here — this
 * file is the wiring layer only.
 */

console.debug('[FormFlow AI] content script loaded');

// Placeholder message bridge — replaced in Phase 1 with the real
// chrome.runtime.onMessage contract shared with src/background/index.ts.
chrome.runtime?.onMessage?.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'FORMFLOW_PING') {
    sendResponse({ ok: true, source: 'content-script' });
  }
});
