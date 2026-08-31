/** Team workspace types (FR-5.4). */
export interface TeamWorkspaceState {
  workspaceId: string;
  name: string;
  inviteCode: string;
  seatId: string;
  seatLabel: string;
  memberCount: number;
  joinedAt: number;
}

export interface TeamWorkspaceSyncPayload {
  workspaceId: string;
  sharedFlows: TeamSharedFlow[];
  seedProfiles: import('@/shared/types/data-packs').SharedSeedProfile[];
  updatedAt: number;
}

export interface TeamSharedFlow {
  id: string;
  name: string;
  domain: string;
  ledger: import('@/shared/schema/action-ledger').ActionLedger;
  savedAt: number;
  authorSeatId: string;
}
