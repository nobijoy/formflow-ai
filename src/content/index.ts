/**
 * Content script entry point (Manifest: content_scripts).
 */

import { fillFormWithPreset } from '@/content/fill-handler';
import {
  isContentControlMessage,
  isFormflowMessage,
  type FormflowResponse,
} from '@/shared/messages';
import {
  notifyContentReady,
  patchSpaNavigation,
  setRecordingActive,
} from '@/content/recorder';

console.debug('[FormFlow AI] content script loaded');

patchSpaNavigation();
void notifyContentReady();

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (isContentControlMessage(message)) {
    setRecordingActive(message.active);
    sendResponse({ ok: true, source: 'content-script' });
    return;
  }

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
