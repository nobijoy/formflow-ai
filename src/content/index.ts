/**
 * Content script entry point (Manifest: content_scripts).
 */

import { fillFormWithPreset } from '@/content/fill-handler';
import { isFormflowMessage, type FormflowResponse } from '@/shared/messages';

console.debug('[FormFlow AI] content script loaded');

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!isFormflowMessage(message)) return;

  const respond = (response: FormflowResponse) => {
    sendResponse(response);
  };

  if (message.type === 'FORMFLOW_PING') {
    respond({ ok: true, source: 'content-script' });
    return;
  }

  if (message.type === 'FORMFLOW_FILL_FORM') {
    void fillFormWithPreset(message.presetMode)
      .then((report) => respond({ ok: true, report }))
      .catch((err: unknown) => {
        const error = err instanceof Error ? err.message : 'Fill failed.';
        respond({ ok: false, error });
      });
    return true;
  }
});
