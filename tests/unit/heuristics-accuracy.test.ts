import { describe, expect, it } from 'vitest';
import { generateHappyPathValue, type FieldContext } from '@/data-generators/happy-path';
import { resolveViaStaticHeuristic } from '@/background/ai-router/heuristics';
import cases from '../fixtures/heuristic-labels.json';

interface HeuristicFixture {
  label: string;
  expected: string | null;
}

const labeledCases = cases as HeuristicFixture[];

describe('static heuristics accuracy (FR-3.1, Phase 2 ≥95%)', () => {
  it('matches labeled fixture set at ≥95% accuracy', () => {
    let correct = 0;

    for (const testCase of labeledCases) {
      const context: FieldContext = { label: testCase.label };
      const actual = generateHappyPathValue(context);
      const matches =
        testCase.expected === null ? actual === null : actual === testCase.expected;
      if (matches) correct += 1;
    }

    const accuracy = correct / labeledCases.length;
    expect(accuracy).toBeGreaterThanOrEqual(0.95);
  });

  it('resolveViaStaticHeuristic delegates to the same table', () => {
    expect(resolveViaStaticHeuristic({ label: 'Email Address' })).toBe('qa.tester@example.com');
    expect(resolveViaStaticHeuristic({ label: 'Favorite Color' })).toBeNull();
  });
});
