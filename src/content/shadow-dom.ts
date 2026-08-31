/**
 * Module 1 — FR-1.3 Shadow DOM & Web Components.
 *
 * Recursively walks open shadow roots to find fillable inputs inside web
 * components. Closed-mode shadow roots return `null` from `element.shadowRoot`
 * by design (see PROJECT.md Open Question #4) — this is not fixable from a
 * content script, so callers must surface a visible "not reachable" indicator
 * for those elements instead of failing silently.
 */

export interface ShadowScanResult {
  reachableInputs: Element[];
  unreachableHosts: Element[];
}

const FILLABLE_SELECTOR = 'input, textarea, select';

export function findFillableElements(root: ParentNode): ShadowScanResult {
  const reachableInputs: Element[] = [];
  const unreachableHosts: Element[] = [];

  const walk = (node: ParentNode) => {
    node.querySelectorAll(FILLABLE_SELECTOR).forEach((el) => reachableInputs.push(el));

    node.querySelectorAll('*').forEach((el) => {
      if (el.shadowRoot) {
        walk(el.shadowRoot);
      } else if (isLikelyClosedShadowHost(el)) {
        unreachableHosts.push(el);
      }
    });
  };

  walk(root);
  return { reachableInputs, unreachableHosts };
}

/**
 * Heuristic only: there is no API to confirm a closed shadow root exists.
 * Custom-element tag names (contain a hyphen) with no accessible shadowRoot
 * and no light-DOM fillable children are flagged as "possibly unreachable"
 * so the UI can surface FR-1.3's required warning.
 */
function isLikelyClosedShadowHost(el: Element): boolean {
  const isCustomElement = el.tagName.includes('-');
  const hasNoAccessibleShadow = el.shadowRoot === null;
  const hasNoLightDomInputs = el.querySelectorAll(FILLABLE_SELECTOR).length === 0;
  return isCustomElement && hasNoAccessibleShadow && hasNoLightDomInputs;
}
