/**
 * Shared locator → framework-syntax mapping so each compiler doesn't
 * reimplement the FR-4.1 priority order (role > label > testId > css).
 */

import type { TargetLocator } from '@/shared/schema/action-ledger';

export function toPlaywrightLocator(target: TargetLocator): string {
  if (target.role && target.label) return `getByRole('${target.role}', { name: '${target.label}' })`;
  if (target.role) return `getByRole('${target.role}')`;
  if (target.label) return `getByLabel('${target.label}')`;
  if (target.testId) return `getByTestId('${target.testId}')`;
  return `locator('${target.css}')`;
}

export function toCypressLocator(target: TargetLocator): string {
  if (target.role && target.label) return `findByRole('${target.role}', { name: '${target.label}' })`;
  if (target.role) return `findByRole('${target.role}')`;
  if (target.label) return `findByLabelText('${target.label}')`;
  if (target.testId) return `findByTestId('${target.testId}')`;
  return `get('${target.css}')`;
}
