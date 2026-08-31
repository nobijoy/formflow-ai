/**
 * Module 1 — FR-1.1 Native Setter Interception.
 *
 * SPA frameworks (React/Vue/Angular/Svelte) attach change listeners at the
 * React-fiber / VDOM layer, not the raw DOM node. Setting `.value` directly
 * only updates the DOM; the framework's controlled-input state silently
 * reverts it on next render. Calling the *native* prototype setter first
 * ensures the value actually lands before we dispatch the events the
 * framework listens for (see event-dispatcher.ts).
 */

type Fillable = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

function getNativeSetter(element: Fillable): ((value: string) => void) | null {
  const prototype =
    element instanceof HTMLTextAreaElement
      ? window.HTMLTextAreaElement.prototype
      : element instanceof HTMLSelectElement
        ? window.HTMLSelectElement.prototype
        : window.HTMLInputElement.prototype;

  const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
  return descriptor?.set ? descriptor.set.bind(element) : null;
}

/**
 * Sets `value` via the native setter, falling back to a direct assignment
 * if the platform ever changes and no native setter descriptor is found.
 */
export function setNativeValue(element: Fillable, value: string): void {
  const nativeSetter = getNativeSetter(element);
  if (nativeSetter) {
    nativeSetter(value);
  } else {
    element.value = value;
  }
}
