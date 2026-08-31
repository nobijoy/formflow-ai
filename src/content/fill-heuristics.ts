/**
 * Loads data-pack + team seed heuristics for Happy-Path fill (FR-5.5 / FR-5.4).
 */

import { ACTIVE_DATA_PACKS_KEY } from '@/shared/constants/data-packs';
import { TEAM_WORKSPACE_CACHE_KEY } from '@/shared/constants/team-workspace';
import { heuristicsForPacks } from '@/data-generators/data-packs/registry';
import type { RuntimeHeuristic } from '@/data-generators/happy-path';
import type { DataPackId } from '@/shared/types/data-packs';
import type { TeamWorkspaceSyncPayload } from '@/shared/types/team-workspace';

export async function loadFillHeuristics(hostname: string): Promise<RuntimeHeuristic[]> {
  const stored = await chrome.storage.local.get([ACTIVE_DATA_PACKS_KEY, TEAM_WORKSPACE_CACHE_KEY]);
  const packIds = (stored[ACTIVE_DATA_PACKS_KEY] as DataPackId[] | undefined) ?? [];
  const heuristics = heuristicsForPacks(packIds);

  const cache = stored[TEAM_WORKSPACE_CACHE_KEY] as TeamWorkspaceSyncPayload | undefined;
  if (cache?.seedProfiles) {
    for (const profile of cache.seedProfiles) {
      if (profile.domain !== hostname && profile.domain !== '*') continue;
      heuristics.unshift(...heuristicsForPacks(profile.packIds));
      for (const [pattern, value] of Object.entries(profile.overrides)) {
        heuristics.unshift({
          pattern: new RegExp(pattern, 'i'),
          generate: () => value,
        });
      }
    }
  }

  return heuristics;
}
