/**
 * Module 1 — FR-1.2 Framework Event Dispatching.
 *
 * Fires the same event sequence a real user produces, in order, all with
 * `bubbles: true` so delegated listeners higher in the tree (common in
 * React/Vue forms) still fire. Order matters: frameworks that listen for
 * `input` to update state and `blur` to trigger validation will behave
 * incorrectly if the sequence is out of order or events are skipped.
 */

export function dispatchFillEvents(element: Element): void {
  const eventSequence: Array<[string, EventInit]> = [
    ['keydown', { bubbles: true }],
    ['input', { bubbles: true }],
    ['change', { bubbles: true }],
    ['blur', { bubbles: true }],
  ];

  for (const [type, init] of eventSequence) {
    element.dispatchEvent(new Event(type, init));
  }
}
