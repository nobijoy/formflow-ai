/** Vertical data pack identifiers (FR-5.5 add-on). */
export type DataPackId = 'fintech' | 'healthcare' | 'ecommerce';

export interface DataPackHeuristic {
  /** Regex source string — compiled at runtime. */
  pattern: string;
  value: string;
}

export interface DataPackDefinition {
  id: DataPackId;
  name: string;
  description: string;
  /** One-time add-on price band for display. */
  priceLabel: string;
  heuristics: DataPackHeuristic[];
}

/** Team-shared seed profile (FR-5.4). */
export interface SharedSeedProfile {
  id: string;
  name: string;
  domain: string;
  packIds: DataPackId[];
  /** Field-level overrides keyed by label/name pattern. */
  overrides: Record<string, string>;
  updatedAt: number;
  authorSeatId?: string;
}
