import { DATA_PACKS } from '@/shared/constants/data-packs';
import type { DataPackHeuristic, DataPackId } from '@/shared/types/data-packs';
import type { FieldContext } from '@/data-generators/happy-path';

export interface RuntimeHeuristic {
  pattern: RegExp;
  generate: () => string;
}

function compileHeuristic(h: DataPackHeuristic): RuntimeHeuristic {
  return {
    pattern: new RegExp(h.pattern, 'i'),
    generate: () => h.value,
  };
}

export function heuristicsForPacks(packIds: DataPackId[]): RuntimeHeuristic[] {
  const out: RuntimeHeuristic[] = [];
  for (const id of packIds) {
    const pack = DATA_PACKS[id];
    if (!pack) continue;
    for (const h of pack.heuristics) {
      out.push(compileHeuristic(h));
    }
  }
  return out;
}

export function matchHeuristics(
  context: FieldContext,
  heuristics: RuntimeHeuristic[],
): string | null {
  const signal = [context.label, context.placeholder, context.name, context.type]
    .filter(Boolean)
    .join(' ');

  for (const { pattern, generate } of heuristics) {
    if (pattern.test(signal)) return generate();
  }
  return null;
}
