/**
 * Module 4 — FR-4.1 Accessibility-First Locator Resolver.
 *
 * Lives in the content script because resolving `role`/`label` requires
 * live DOM + accessibility tree access. Produces a TargetLocator (see
 * src/shared/schema/action-ledger.ts) with every tier of fallback filled in
 * where possible; the compiler decides at build time which one to emit.
 * Priority: getByRole() > getByLabel() > getByTestId() > CSS (fallback only).
 */

import type { TargetLocator } from '@/shared/schema/action-ledger';

function resolveAccessibleLabel(element: HTMLElement): string | undefined {
  const ariaLabel = element.getAttribute('aria-label');
  if (ariaLabel) return ariaLabel;

  const labelledBy = element.getAttribute('aria-labelledby');
  if (labelledBy) {
    const labelText = labelledBy
      .split(' ')
      .map((id) => document.getElementById(id)?.textContent?.trim())
      .filter(Boolean)
      .join(' ');
    if (labelText) return labelText;
  }

  if (element.id) {
    const associatedLabel = document.querySelector(`label[for="${element.id}"]`);
    if (associatedLabel?.textContent) return associatedLabel.textContent.trim();
  }

  const parentLabel = element.closest('label');
  if (parentLabel?.textContent) return parentLabel.textContent.trim();

  return undefined;
}

function resolveCssSelector(element: HTMLElement): string {
  if (element.id) return `#${element.id}`;
  if (element instanceof HTMLElement && element.getAttribute('name')) {
    return `${element.tagName.toLowerCase()}[name="${element.getAttribute('name')}"]`;
  }
  // Last-resort structural fallback — intentionally brittle; see FR-4.1 scoping note.
  const siblings = Array.from(element.parentElement?.children ?? []);
  const index = siblings.indexOf(element);
  return `${element.tagName.toLowerCase()}:nth-child(${index + 1})`;
}

export function resolveLocator(element: HTMLElement): TargetLocator {
  return {
    role: element.getAttribute('role') ?? inferImplicitRole(element),
    label: resolveAccessibleLabel(element),
    testId: element.getAttribute('data-testid') ?? undefined,
    css: resolveCssSelector(element),
  };
}

function inferImplicitRole(element: HTMLElement): string | undefined {
  const tag = element.tagName.toLowerCase();
  const type = (element as HTMLInputElement).type;
  if (tag === 'button' || (tag === 'input' && (type === 'submit' || type === 'button'))) {
    return 'button';
  }
  if (tag === 'input' && (type === undefined || type === 'text' || type === 'email')) {
    return 'textbox';
  }
  if (tag === 'select') return 'combobox';
  if (tag === 'textarea') return 'textbox';
  return undefined;
}
