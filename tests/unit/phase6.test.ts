import { describe, expect, it } from 'vitest';
import { buildBugReportPayload } from '@/background/bug-report/format';
import type { ActionLedger } from '@/shared/schema/action-ledger';
import { heuristicsForPacks, matchHeuristics } from '@/data-generators/data-packs/registry';

function sampleLedger(): ActionLedger {
  return {
    sessionId: 'sess_bug',
    timestamp: 1_700_000_000_000,
    originDomain: 'shop.example.com',
    actions: [
      { step: 1, type: 'NAVIGATE', url: 'https://shop.example.com/checkout', target: { css: 'html' } },
      { step: 2, type: 'FILL', value: '4111111111111111', presetMode: 'HAPPY_PATH', target: { label: 'Card number' } },
      { step: 3, type: 'CLICK', target: { label: 'Pay now' } },
    ],
  };
}

describe('bug report format', () => {
  it('builds markdown with steps and JSON ledger', () => {
    const payload = buildBugReportPayload({
      title: 'Checkout fails',
      ledger: sampleLedger(),
      stepLimit: 20,
      screenshotDataUrl: null,
    });

    expect(payload.title).toBe('Checkout fails');
    expect(payload.bodyMarkdown).toContain('## Steps to reproduce');
    expect(payload.bodyMarkdown).toContain('Fill "Card number"');
    expect(payload.bodyMarkdown).toContain('```json');
    expect(payload.stepCount).toBe(3);
  });
});

describe('data pack heuristics', () => {
  it('matches fintech card field', () => {
    const heuristics = heuristicsForPacks(['fintech']);
    const value = matchHeuristics(
      { label: 'Credit card', name: 'card', type: 'text' },
      heuristics,
    );
    expect(value).toBe('4111111111111111');
  });

  it('matches healthcare MRN', () => {
    const heuristics = heuristicsForPacks(['healthcare']);
    const value = matchHeuristics({ label: 'Medical record number', type: 'text' }, heuristics);
    expect(value).toBe('MRN-00482173');
  });
});
