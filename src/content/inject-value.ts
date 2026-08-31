/**
 * Module 1 — FR-1.1 + FR-1.2 combined entry point.
 *
 * Sets a field value via the native prototype setter, then dispatches the
 * framework event sequence so SPA controlled inputs keep the injected value.
 */

import { setNativeValue } from '@/content/setter-interceptor';
import { dispatchFillEvents } from '@/content/event-dispatcher';

type Fillable = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

export function injectValue(element: Fillable, value: string): void {
  setNativeValue(element, value);
  dispatchFillEvents(element);
}
