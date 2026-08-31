/**
 * Module 4 — FR-4.3 Playwright compiler. Primary engine, Free + Pro.
 */

import type { ActionLedger } from '@/shared/schema/action-ledger';
import type { FrameworkCompiler } from './types';
import { toPlaywrightLocator } from './locator-syntax';
import { escapeTestName, escapeTestString } from './escape';

export const playwrightCompiler: FrameworkCompiler = {
  target: 'playwright',
  compile(ledger: ActionLedger): string {
    const lines: string[] = [
      "import { test, expect } from '@playwright/test';",
      '',
      `test('${escapeTestName(ledger.sessionId)}', async ({ page }) => {`,
    ];

    for (const action of ledger.actions) {
      const locator = toPlaywrightLocator(action.target);
      switch (action.type) {
        case 'NAVIGATE':
          lines.push(`  await page.goto('${escapeTestString(action.url ?? '')}');`);
          break;
        case 'FILL':
          lines.push(`  await page.${locator}.fill('${escapeTestString(action.value ?? '')}');`);
          break;
        case 'CLICK':
          lines.push(`  await page.${locator}.click();`);
          break;
        case 'SELECT':
          lines.push(
            `  await page.${locator}.selectOption('${escapeTestString(action.value ?? '')}');`,
          );
          break;
        case 'CHECK':
          lines.push(`  await page.${locator}.check();`);
          break;
        case 'ASSERT':
          lines.push(`  await expect(page.${locator}).toBeVisible();`);
          break;
      }
    }

    lines.push('});');
    return lines.join('\n');
  },
};
