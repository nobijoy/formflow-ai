import { describe, expect, it } from 'vitest';
import { escapeTestString } from '@/background/compiler/escape';
import { playwrightCompiler } from '@/background/compiler/playwright';
import { cypressCompiler } from '@/background/compiler/cypress';
import type { ActionLedger } from '@/shared/schema/action-ledger';

const sampleLedger: ActionLedger = {
  sessionId: 'sess_test_001',
  timestamp: Date.now(),
  originDomain: 'localhost',
  actions: [
    {
      step: 1,
      type: 'NAVIGATE',
      url: 'http://localhost:3333/vanilla-html/',
      target: { css: 'html' },
    },
    {
      step: 2,
      type: 'FILL',
      target: { role: 'textbox', label: 'Email Address', testId: 'user-email-input', css: '#email' },
      value: 'qa.tester@example.com',
      presetMode: 'HAPPY_PATH',
    },
    {
      step: 3,
      type: 'FILL',
      target: { role: 'textbox', label: "O'Brien", css: '#name' },
      value: "it's a test",
      presetMode: 'BOUNDARY_OVERFLOW',
    },
    {
      step: 4,
      type: 'CLICK',
      target: { role: 'button', label: 'Submit', testId: 'btn-submit', css: 'button[type=submit]' },
    },
  ],
};

describe('compiler output (FR-4.3, NFR-5 syntax)', () => {
  it('Playwright: emits getByRole-first locators and escaped strings', () => {
    const code = playwrightCompiler.compile(sampleLedger);
    expect(code).toContain("import { test, expect } from '@playwright/test'");
    expect(code).toContain("getByRole('textbox', { name: 'Email Address' })");
    expect(code).toContain("getByRole('button', { name: 'Submit' })");
    expect(code).toContain("fill('it\\'s a test')");
    expect(code).toContain('page.goto(');
  });

  it('Cypress: emits findByRole-first locators', () => {
    const code = cypressCompiler.compile(sampleLedger);
    expect(code).toContain("describe('sess_test_001'");
    expect(code).toContain("findByRole('textbox', { name: 'Email Address' })");
    expect(code).toContain("findByRole('button', { name: 'Submit' })");
    expect(code).toContain('cy.visit(');
  });

  it('escapeTestString handles quotes and newlines', () => {
    expect(escapeTestString("a'b\nc")).toBe("a\\'b\\nc");
  });
});
