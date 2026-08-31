/**
 * Module 4 — FR-4.3 Cypress compiler. Pro.
 */

import type { ActionLedger } from '@/shared/schema/action-ledger';
import type { FrameworkCompiler } from './types';
import { toCypressLocator } from './locator-syntax';
import { escapeTestName, escapeTestString } from './escape';

export const cypressCompiler: FrameworkCompiler = {
  target: 'cypress',
  compile(ledger: ActionLedger): string {
    const lines: string[] = [
      `describe('${escapeTestName(ledger.sessionId)}', () => {`,
      "  it('runs the recorded flow', () => {",
    ];

    for (const action of ledger.actions) {
      const locator = toCypressLocator(action.target);
      switch (action.type) {
        case 'NAVIGATE':
          lines.push(`    cy.visit('${escapeTestString(action.url ?? '')}');`);
          break;
        case 'FILL':
          lines.push(`    cy.${locator}.clear().type('${escapeTestString(action.value ?? '')}');`);
          break;
        case 'CLICK':
          lines.push(`    cy.${locator}.click();`);
          break;
        case 'SELECT':
          lines.push(`    cy.${locator}.select('${escapeTestString(action.value ?? '')}');`);
          break;
        case 'CHECK':
          lines.push(`    cy.${locator}.check();`);
          break;
        case 'ASSERT':
          lines.push(`    cy.${locator}.should('be.visible');`);
          break;
      }
    }

    lines.push('  });', '});');
    return lines.join('\n');
  },
};
