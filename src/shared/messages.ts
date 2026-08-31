import type { PresetMode } from '@/shared/schema/action-ledger';
import type { InspectionReport } from '@/shared/types/fill-report';
import type { ByokProvider } from '@/shared/types/byok';

/** Popup / background / content-script message contract. */
export type FormflowMessage =
  | { type: 'FORMFLOW_PING' }
  | { type: 'FORMFLOW_FILL_FORM'; presetMode: PresetMode }
  | { type: 'FORMFLOW_GET_STATUS' }
  | { type: 'FORMFLOW_RESOLVE_FIELD'; snippet: string }
  | { type: 'FORMFLOW_GET_BYOK_SETTINGS' }
  | { type: 'FORMFLOW_SAVE_BYOK_SETTINGS'; provider: ByokProvider; apiKey?: string; endpoint?: string }
  | { type: 'FORMFLOW_TEST_BYOK' };

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

export interface FormflowErrorResponse {
  ok: false;
  error: string;
  code?: string;
}

export type FormflowResponse =
  | FormflowPingResponse
  | FormflowFillResponse
  | FormflowResolveFieldResponse
  | FormflowByokSettingsResponse
  | FormflowByokTestResponse
  | FormflowErrorResponse
  | { ok: true; startedAt: number };

const MESSAGE_TYPES = new Set([
  'FORMFLOW_PING',
  'FORMFLOW_FILL_FORM',
  'FORMFLOW_GET_STATUS',
  'FORMFLOW_RESOLVE_FIELD',
  'FORMFLOW_GET_BYOK_SETTINGS',
  'FORMFLOW_SAVE_BYOK_SETTINGS',
  'FORMFLOW_TEST_BYOK',
]);

export function isFormflowMessage(value: unknown): value is FormflowMessage {
  if (!value || typeof value !== 'object') return false;
  const type = (value as { type?: unknown }).type;
  return typeof type === 'string' && MESSAGE_TYPES.has(type);
}
