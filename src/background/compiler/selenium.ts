/**
 * Module 4 — FR-4.3 Selenium compiler. Pro, secondary mapping.
 * Selenium has no first-class role-based locator equivalent, so this target
 * falls back to CSS/XPath more often — full four-way locator parity is a
 * Phase 2+ concern, not a v1 blocker (see FR-4.3 scoping note).
 */

import type { ActionLedger } from '@/shared/schema/action-ledger';
import type { FrameworkCompiler } from './types';

export const seleniumCompiler: FrameworkCompiler = {
  target: 'selenium',
  compile(ledger: ActionLedger): string {
    const lines: string[] = [
      "const { Builder, By } = require('selenium-webdriver');",
      '',
      '(async function run() {',
      "  const driver = await new Builder().forBrowser('chrome').build();",
    ];

    for (const action of ledger.actions) {
      const css = action.target.css ?? `[data-testid="${action.target.testId}"]`;
      switch (action.type) {
        case 'NAVIGATE':
          lines.push(`  await driver.get('${action.url}');`);
          break;
        case 'FILL':
          lines.push(`  await driver.findElement(By.css('${css}')).sendKeys('${action.value ?? ''}');`);
          break;
        case 'CLICK':
          lines.push(`  await driver.findElement(By.css('${css}')).click();`);
          break;
        case 'SELECT':
          lines.push(`  await driver.findElement(By.css('${css}')).sendKeys('${action.value ?? ''}');`);
          break;
        case 'CHECK':
          lines.push(`  await driver.findElement(By.css('${css}')).click();`);
          break;
        case 'ASSERT':
          lines.push(`  await driver.findElement(By.css('${css}'));`);
          break;
      }
    }

    lines.push('  await driver.quit();', '})();');
    return lines.join('\n');
  },
};
