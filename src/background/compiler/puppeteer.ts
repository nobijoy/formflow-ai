/**
 * Module 4 — FR-4.3 Puppeteer compiler. Pro, secondary mapping.
 * Puppeteer has no built-in accessible-role locator, so this falls back to
 * CSS more often than the Playwright/Cypress compilers (see FR-4.3 scoping note).
 */

import type { ActionLedger } from '@/shared/schema/action-ledger';
import type { FrameworkCompiler } from './types';

export const puppeteerCompiler: FrameworkCompiler = {
  target: 'puppeteer',
  compile(ledger: ActionLedger): string {
    const lines: string[] = ['const puppeteer = require(\'puppeteer\');', '', '(async () => {', '  const browser = await puppeteer.launch();', '  const page = await browser.newPage();'];

    for (const action of ledger.actions) {
      const css = action.target.css ?? `[data-testid="${action.target.testId}"]`;
      switch (action.type) {
        case 'NAVIGATE':
          lines.push(`  await page.goto('${action.url}');`);
          break;
        case 'FILL':
          lines.push(`  await page.type('${css}', '${action.value ?? ''}');`);
          break;
        case 'CLICK':
          lines.push(`  await page.click('${css}');`);
          break;
        case 'SELECT':
          lines.push(`  await page.select('${css}', '${action.value ?? ''}');`);
          break;
        case 'CHECK':
          lines.push(`  await page.click('${css}');`);
          break;
        case 'ASSERT':
          lines.push(`  await page.waitForSelector('${css}', { visible: true });`);
          break;
      }
    }

    lines.push('  await browser.close();', '})();');
    return lines.join('\n');
  },
};
