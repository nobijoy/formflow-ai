import type { PresetMode, LedgerAction } from '@/shared/schema/action-ledger';
import type { ActionLedger } from '@/shared/schema/action-ledger';
import type { InspectionReport } from '@/shared/types/fill-report';
import type { ByokProvider, InferenceProvider } from '@/shared/types/byok';
import type { CompilerTarget, EntitlementSource, FeatureFlag, ManagedAiUsage, Tier } from '@/shared/types/entitlements';
import type { SavedFlow } from '@/shared/types/saved-flows';
import type { BugReportDestination, BugReportSettingsPublic } from '@/shared/types/bug-report';
import type { DataPackId } from '@/shared/types/data-packs';
import type { SharedSeedProfile } from '@/shared/types/data-packs';
import type { TeamSharedFlow, TeamWorkspaceState, TeamWorkspaceSyncPayload } from '@/shared/types/team-workspace';

export type RecordableAction = Omit<LedgerAction, 'step'>;

/** Popup / background / content-script message contract. */
export type FormflowMessage =
  | { type: 'FORMFLOW_PING' }
  | { type: 'FORMFLOW_FILL_FORM'; presetMode: PresetMode }
  | { type: 'FORMFLOW_GET_STATUS' }
  | { type: 'FORMFLOW_RESOLVE_FIELD'; snippet: string }
  | { type: 'FORMFLOW_GET_BYOK_SETTINGS' }
  | { type: 'FORMFLOW_SAVE_BYOK_SETTINGS'; provider: ByokProvider; apiKey?: string; endpoint?: string }
  | { type: 'FORMFLOW_TEST_BYOK' }
  | { type: 'FORMFLOW_GET_ENTITLEMENT' }
  | { type: 'FORMFLOW_SET_DEV_PRO_TIER'; enabled: boolean }
  | { type: 'FORMFLOW_AUTHORIZE_SECURITY_DOMAIN'; hostname: string }
  | { type: 'FORMFLOW_START_RECORDING' }
  | { type: 'FORMFLOW_STOP_RECORDING' }
  | { type: 'FORMFLOW_GET_RECORDING_STATUS' }
  | { type: 'FORMFLOW_RECORD_ACTION'; action: RecordableAction }
  | { type: 'FORMFLOW_CONTENT_READY'; url: string }
  | { type: 'FORMFLOW_RECORDING_CONTROL'; active: boolean }
  | { type: 'FORMFLOW_COMPILE_LEDGER'; target: CompilerTarget }
  | { type: 'FORMFLOW_ACTIVATE_LICENSE'; licenseKey: string }
  | { type: 'FORMFLOW_VERIFY_ENTITLEMENT' }
  | { type: 'FORMFLOW_DEACTIVATE_LICENSE' }
  | { type: 'FORMFLOW_GET_MANAGED_AI_USAGE' }
  | { type: 'FORMFLOW_SAVE_FLOW'; name: string }
  | { type: 'FORMFLOW_LIST_SAVED_FLOWS' }
  | { type: 'FORMFLOW_DELETE_SAVED_FLOW'; id: string }
  | { type: 'FORMFLOW_GET_BUG_REPORT_SETTINGS' }
  | {
      type: 'FORMFLOW_SAVE_BUG_REPORT_SETTINGS';
      github?: { owner?: string; repo?: string; token?: string };
      linear?: { teamId?: string; token?: string };
      jira?: { baseUrl?: string; projectKey?: string; email?: string; token?: string };
    }
  | {
      type: 'FORMFLOW_EXPORT_BUG_REPORT';
      destination: BugReportDestination;
      title: string;
      extraNotes?: string;
      stepLimit?: number;
    }
  | { type: 'FORMFLOW_GET_DATA_PACKS' }
  | { type: 'FORMFLOW_ACTIVATE_DATA_PACK'; key: string }
  | { type: 'FORMFLOW_SET_ACTIVE_DATA_PACKS'; packIds: DataPackId[] }
  | { type: 'FORMFLOW_GET_TEAM_WORKSPACE' }
  | { type: 'FORMFLOW_CREATE_TEAM_WORKSPACE'; name: string }
  | { type: 'FORMFLOW_JOIN_TEAM_WORKSPACE'; inviteCode: string }
  | { type: 'FORMFLOW_LEAVE_TEAM_WORKSPACE' }
  | { type: 'FORMFLOW_SYNC_TEAM_WORKSPACE' }
  | { type: 'FORMFLOW_PUBLISH_FLOW_TO_TEAM'; flowId: string }
  | {
      type: 'FORMFLOW_PUBLISH_SEED_PROFILE';
      name: string;
      domain: string;
      packIds: DataPackId[];
      overrides?: Record<string, string>;
    };

export interface FormflowPingResponse {
  ok: true;
  source: 'service-worker' | 'content-script';
}

export interface FormflowFillResponse {
  ok: true;
  report: InspectionReport;
}

export interface FormflowResolveFieldResponse {
  ok: true;
  value: string;
  latencyMs: number;
  provider: InferenceProvider;
}

export interface FormflowByokSettingsResponse {
  ok: true;
  settings: {
    provider: ByokProvider;
    endpoint?: string;
    hasApiKey: boolean;
    configured: boolean;
  };
}

export interface FormflowByokTestResponse {
  ok: true;
  value: string;
  latencyMs: number;
  provider: InferenceProvider;
}

export interface FormflowEntitlementResponse {
  ok: true;
  tier: Tier;
  features: FeatureFlag[];
  source: EntitlementSource;
  withinGrace: boolean;
}

export interface FormflowManagedAiUsageResponse {
  ok: true;
  usage: ManagedAiUsage;
}

export interface FormflowBugReportSettingsResponse {
  ok: true;
  settings: BugReportSettingsPublic;
}

export interface FormflowBugReportExportResponse {
  ok: true;
  issueUrl: string;
  issueId: string;
  destination: BugReportDestination;
}

export interface FormflowDataPacksResponse {
  ok: true;
  catalog: Array<{ id: DataPackId; name: string; description: string; priceLabel: string }>;
  owned: DataPackId[];
  active: DataPackId[];
}

export interface FormflowTeamWorkspaceResponse {
  ok: true;
  workspace: TeamWorkspaceState | null;
}

export interface FormflowTeamSyncResponse {
  ok: true;
  sync: TeamWorkspaceSyncPayload;
  sharedFlows: TeamSharedFlow[];
  seedProfiles: SharedSeedProfile[];
}

export interface FormflowSavedFlowResponse {
  ok: true;
  flow: SavedFlow;
}

export interface FormflowSavedFlowsListResponse {
  ok: true;
  flows: SavedFlow[];
}

export interface FormflowRecordingStatusResponse {
  ok: true;
  isRecording: boolean;
  stepCount: number;
  sessionId?: string;
}

export interface FormflowRecordingStoppedResponse {
  ok: true;
  ledger: ActionLedger;
}

export interface FormflowCompileResponse {
  ok: true;
  code: string;
  target: CompilerTarget;
}

export interface FormflowErrorResponse {
  ok: false;
  error: string;
  code?: string;
  hostname?: string;
}

export type FormflowResponse =
  | FormflowPingResponse
  | FormflowFillResponse
  | FormflowResolveFieldResponse
  | FormflowByokSettingsResponse
  | FormflowByokTestResponse
  | FormflowEntitlementResponse
  | FormflowRecordingStatusResponse
  | FormflowRecordingStoppedResponse
  | FormflowCompileResponse
  | FormflowManagedAiUsageResponse
  | FormflowSavedFlowResponse
  | FormflowSavedFlowsListResponse
  | FormflowBugReportSettingsResponse
  | FormflowBugReportExportResponse
  | FormflowDataPacksResponse
  | FormflowTeamWorkspaceResponse
  | FormflowTeamSyncResponse
  | FormflowErrorResponse
  | { ok: true; startedAt: number }
  | { ok: true; authorized: true };

const MESSAGE_TYPES = new Set([
  'FORMFLOW_PING',
  'FORMFLOW_FILL_FORM',
  'FORMFLOW_GET_STATUS',
  'FORMFLOW_RESOLVE_FIELD',
  'FORMFLOW_GET_BYOK_SETTINGS',
  'FORMFLOW_SAVE_BYOK_SETTINGS',
  'FORMFLOW_TEST_BYOK',
  'FORMFLOW_GET_ENTITLEMENT',
  'FORMFLOW_SET_DEV_PRO_TIER',
  'FORMFLOW_AUTHORIZE_SECURITY_DOMAIN',
  'FORMFLOW_START_RECORDING',
  'FORMFLOW_STOP_RECORDING',
  'FORMFLOW_GET_RECORDING_STATUS',
  'FORMFLOW_RECORD_ACTION',
  'FORMFLOW_CONTENT_READY',
  'FORMFLOW_RECORDING_CONTROL',
  'FORMFLOW_COMPILE_LEDGER',
  'FORMFLOW_ACTIVATE_LICENSE',
  'FORMFLOW_VERIFY_ENTITLEMENT',
  'FORMFLOW_DEACTIVATE_LICENSE',
  'FORMFLOW_GET_MANAGED_AI_USAGE',
  'FORMFLOW_SAVE_FLOW',
  'FORMFLOW_LIST_SAVED_FLOWS',
  'FORMFLOW_DELETE_SAVED_FLOW',
  'FORMFLOW_GET_BUG_REPORT_SETTINGS',
  'FORMFLOW_SAVE_BUG_REPORT_SETTINGS',
  'FORMFLOW_EXPORT_BUG_REPORT',
  'FORMFLOW_GET_DATA_PACKS',
  'FORMFLOW_ACTIVATE_DATA_PACK',
  'FORMFLOW_SET_ACTIVE_DATA_PACKS',
  'FORMFLOW_GET_TEAM_WORKSPACE',
  'FORMFLOW_CREATE_TEAM_WORKSPACE',
  'FORMFLOW_JOIN_TEAM_WORKSPACE',
  'FORMFLOW_LEAVE_TEAM_WORKSPACE',
  'FORMFLOW_SYNC_TEAM_WORKSPACE',
  'FORMFLOW_PUBLISH_FLOW_TO_TEAM',
  'FORMFLOW_PUBLISH_SEED_PROFILE',
]);

export function isFormflowMessage(value: unknown): value is FormflowMessage {
  if (!value || typeof value !== 'object') return false;
  const type = (value as { type?: unknown }).type;
  return typeof type === 'string' && MESSAGE_TYPES.has(type);
}

/** Content-only inbound control message from background. */
export function isContentControlMessage(
  value: unknown,
): value is { type: 'FORMFLOW_RECORDING_CONTROL'; active: boolean } {
  return (
    !!value &&
    typeof value === 'object' &&
    (value as { type?: unknown }).type === 'FORMFLOW_RECORDING_CONTROL'
  );
}
