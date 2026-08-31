/**
 * Module 5 — FR-5.4 Team Workspace Lite.
 *
 * Remote sync via FormFlow API; dev invite codes use local storage simulation
 * so the invite/join/sync flow works without a hosted backend.
 */

import {
  DEV_TEAM_INVITE_CODES,
  TEAM_WORKSPACE_API,
  TEAM_WORKSPACE_CACHE_KEY,
  TEAM_WORKSPACE_STORAGE_KEY,
} from '@/shared/constants/team-workspace';
import type { SharedSeedProfile } from '@/shared/types/data-packs';
import type {
  TeamSharedFlow,
  TeamWorkspaceState,
  TeamWorkspaceSyncPayload,
} from '@/shared/types/team-workspace';
import { hasFeature } from '@/background/licensing';
import { getLicenseKey } from '@/background/licensing/license-key-storage';
import type { SavedFlow } from '@/shared/types/saved-flows';

export type TeamWorkspaceErrorCode = 'TEAM_REQUIRED' | 'NOT_JOINED' | 'INVALID_INVITE';

export class TeamWorkspaceError extends Error {
  readonly code: TeamWorkspaceErrorCode;

  constructor(code: TeamWorkspaceErrorCode, message: string) {
    super(message);
    this.name = 'TeamWorkspaceError';
    this.code = code;
  }
}

export function isTeamWorkspaceError(err: unknown): err is TeamWorkspaceError {
  return err instanceof TeamWorkspaceError;
}

function createSeatId(): string {
  return `seat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function loadWorkspaceState(): Promise<TeamWorkspaceState | null> {
  const stored = await chrome.storage.local.get(TEAM_WORKSPACE_STORAGE_KEY);
  return (stored[TEAM_WORKSPACE_STORAGE_KEY] as TeamWorkspaceState | undefined) ?? null;
}

async function saveWorkspaceState(state: TeamWorkspaceState | null): Promise<void> {
  if (state) {
    await chrome.storage.local.set({ [TEAM_WORKSPACE_STORAGE_KEY]: state });
  } else {
    await chrome.storage.local.remove(TEAM_WORKSPACE_STORAGE_KEY);
  }
}

async function loadSyncCache(): Promise<TeamWorkspaceSyncPayload | null> {
  const stored = await chrome.storage.local.get(TEAM_WORKSPACE_CACHE_KEY);
  return (stored[TEAM_WORKSPACE_CACHE_KEY] as TeamWorkspaceSyncPayload | undefined) ?? null;
}

async function saveSyncCache(payload: TeamWorkspaceSyncPayload): Promise<void> {
  await chrome.storage.local.set({ [TEAM_WORKSPACE_CACHE_KEY]: payload });
}

export async function getTeamWorkspace(): Promise<TeamWorkspaceState | null> {
  if (!(await hasFeature('TEAM_WORKSPACE'))) return null;
  return loadWorkspaceState();
}

export async function assertTeamWorkspace(): Promise<TeamWorkspaceState> {
  if (!(await hasFeature('TEAM_WORKSPACE'))) {
    throw new TeamWorkspaceError('TEAM_REQUIRED', 'Team workspace requires FormFlow Team tier.');
  }
  const state = await loadWorkspaceState();
  if (!state) {
    throw new TeamWorkspaceError('NOT_JOINED', 'Join a team workspace with an invite code first.');
  }
  return state;
}

async function fetchRemoteSync(workspaceId: string): Promise<TeamWorkspaceSyncPayload | null> {
  const licenseKey = await getLicenseKey();
  if (!licenseKey) return null;

  try {
    const response = await fetch(`${TEAM_WORKSPACE_API}/${workspaceId}/sync`, {
      headers: { Authorization: `Bearer ${licenseKey}` },
    });
    if (!response.ok) return null;
    return (await response.json()) as TeamWorkspaceSyncPayload;
  } catch {
    return null;
  }
}

async function pushRemoteSync(
  workspaceId: string,
  payload: TeamWorkspaceSyncPayload,
): Promise<boolean> {
  const licenseKey = await getLicenseKey();
  if (!licenseKey) return false;

  try {
    const response = await fetch(`${TEAM_WORKSPACE_API}/${workspaceId}/sync`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${licenseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function createTeamWorkspace(name: string): Promise<TeamWorkspaceState> {
  if (!(await hasFeature('TEAM_WORKSPACE'))) {
    throw new TeamWorkspaceError('TEAM_REQUIRED', 'Team workspace requires FormFlow Team tier.');
  }

  const inviteCode = `INV-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
  const state: TeamWorkspaceState = {
    workspaceId: `ws_${Date.now()}`,
    name: name.trim() || 'My Team',
    inviteCode,
    seatId: createSeatId(),
    seatLabel: 'Owner',
    memberCount: 1,
    joinedAt: Date.now(),
  };

  await saveWorkspaceState(state);
  await saveSyncCache({
    workspaceId: state.workspaceId,
    sharedFlows: [],
    seedProfiles: [],
    updatedAt: Date.now(),
  });

  return state;
}

export async function joinTeamWorkspace(inviteCode: string): Promise<TeamWorkspaceState> {
  if (!(await hasFeature('TEAM_WORKSPACE'))) {
    throw new TeamWorkspaceError('TEAM_REQUIRED', 'Team workspace requires FormFlow Team tier.');
  }

  const normalized = inviteCode.trim().toUpperCase();
  const dev = DEV_TEAM_INVITE_CODES[normalized];

  if (dev) {
    const existingCache = await loadSyncCache();
    const seatId = createSeatId();
    const state: TeamWorkspaceState = {
      workspaceId: dev.workspaceId,
      name: dev.name,
      inviteCode: normalized,
      seatId,
      seatLabel: `Seat ${seatId.slice(-4)}`,
      memberCount: existingCache ? 2 : 1,
      joinedAt: Date.now(),
    };
    await saveWorkspaceState(state);

    if (!existingCache || existingCache.workspaceId !== dev.workspaceId) {
      await saveSyncCache({
        workspaceId: dev.workspaceId,
        sharedFlows: [],
        seedProfiles: [],
        updatedAt: Date.now(),
      });
    } else {
      await saveSyncCache({
        ...existingCache,
        updatedAt: Date.now(),
      });
    }

    return state;
  }

  const licenseKey = await getLicenseKey();
  if (!licenseKey) {
    throw new TeamWorkspaceError(
      'INVALID_INVITE',
      'Unknown invite code. Use a dev code or activate a Team license.',
    );
  }

  try {
    const response = await fetch(`${TEAM_WORKSPACE_API}/join`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${licenseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inviteCode: normalized }),
    });

    if (!response.ok) {
      throw new TeamWorkspaceError('INVALID_INVITE', 'Invite code rejected by workspace server.');
    }

    const json = (await response.json()) as TeamWorkspaceState;
    await saveWorkspaceState(json);
    return json;
  } catch (err) {
    if (err instanceof TeamWorkspaceError) throw err;
    throw new TeamWorkspaceError('INVALID_INVITE', 'Could not join workspace — check invite code.');
  }
}

export async function leaveTeamWorkspace(): Promise<void> {
  await saveWorkspaceState(null);
  await chrome.storage.local.remove(TEAM_WORKSPACE_CACHE_KEY);
}

export async function syncTeamWorkspace(): Promise<TeamWorkspaceSyncPayload> {
  const state = await assertTeamWorkspace();
  const remote = await fetchRemoteSync(state.workspaceId);
  if (remote) {
    await saveSyncCache(remote);
    return remote;
  }

  const cached = await loadSyncCache();
  if (cached?.workspaceId === state.workspaceId) return cached;

  const empty: TeamWorkspaceSyncPayload = {
    workspaceId: state.workspaceId,
    sharedFlows: [],
    seedProfiles: [],
    updatedAt: Date.now(),
  };
  await saveSyncCache(empty);
  return empty;
}

export async function publishFlowToTeam(flow: SavedFlow): Promise<TeamSharedFlow> {
  const state = await assertTeamWorkspace();
  const cache = (await loadSyncCache()) ?? {
    workspaceId: state.workspaceId,
    sharedFlows: [],
    seedProfiles: [],
    updatedAt: Date.now(),
  };

  const shared: TeamSharedFlow = {
    id: flow.id,
    name: flow.name,
    domain: flow.domain,
    ledger: flow.ledger,
    savedAt: flow.savedAt,
    authorSeatId: state.seatId,
  };

  const nextFlows = cache.sharedFlows.filter((f) => f.id !== shared.id);
  nextFlows.push(shared);

  const payload: TeamWorkspaceSyncPayload = {
    ...cache,
    sharedFlows: nextFlows,
    updatedAt: Date.now(),
  };

  await saveSyncCache(payload);
  await pushRemoteSync(state.workspaceId, payload);
  return shared;
}

export async function publishSeedProfile(profile: SharedSeedProfile): Promise<SharedSeedProfile> {
  const state = await assertTeamWorkspace();
  const cache = await syncTeamWorkspace();

  const entry = { ...profile, updatedAt: Date.now(), authorSeatId: state.seatId };
  const next = cache.seedProfiles.filter((p) => p.id !== entry.id);
  next.push(entry);

  const payload: TeamWorkspaceSyncPayload = {
    ...cache,
    seedProfiles: next,
    updatedAt: Date.now(),
  };

  await saveSyncCache(payload);
  await pushRemoteSync(state.workspaceId, payload);
  return entry;
}

export async function getTeamSeedProfilesForDomain(domain: string): Promise<SharedSeedProfile[]> {
  const workspace = await getTeamWorkspace();
  if (!workspace) return [];

  const cache = await loadSyncCache();
  if (!cache || cache.workspaceId !== workspace.workspaceId) return [];
  return cache.seedProfiles.filter((p) => p.domain === domain || p.domain === '*');
}

export async function getTeamSharedFlows(): Promise<TeamSharedFlow[]> {
  const workspace = await getTeamWorkspace();
  if (!workspace) return [];
  const cache = await loadSyncCache();
  if (!cache || cache.workspaceId !== workspace.workspaceId) return [];
  return cache.sharedFlows;
}
