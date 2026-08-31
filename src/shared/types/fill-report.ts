import type { PresetMode, TargetLocator } from '@/shared/schema/action-ledger';

export interface FillPlanEntry {
  target: TargetLocator;
  value: string;
  presetMode: PresetMode;
}

export interface InspectionReport {
  filled: FillPlanEntry[];
  unreachableCount: number;
  heuristicResolvedCount: number;
  aiResolvedCount: number;
}
