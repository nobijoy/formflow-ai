import type { PresetMode, LedgerAction } from '@/shared/schema/action-ledger';
import type { ActionLedger } from '@/shared/schema/action-ledger';
import type { InspectionReport } from '@/shared/types/fill-report';
import type { ByokProvider } from '@/shared/types/byok';
import type { CompilerTarget, FeatureFlag, Tier } from '@/shared/types/entitlements';

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
  | { type: 'FORMFLOW_COMPILE_LEDGER'; target: CompilerTarget };

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
  provider: ByokProvider;
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
  provider: ByokProvider;
}

export interface FormflowEntitlementResponse {
  ok: true;
  tier: Tier;
  features: FeatureFlag[];
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
