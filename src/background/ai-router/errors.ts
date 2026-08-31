/**
 * Module 3 — typed inference errors for Phase 2 exit criteria
 * (invalid key, timeout, provider outage must surface clearly).
 */

export type AiRouterErrorCode =
  | 'NO_BYOK'
  | 'INVALID_KEY'
  | 'TIMEOUT'
  | 'PROVIDER_OUTAGE'
  | 'NETWORK_ERROR'
  | 'BAD_RESPONSE';

export class AiRouterError extends Error {
  readonly code: AiRouterErrorCode;

  constructor(code: AiRouterErrorCode, message: string) {
    super(message);
    this.name = 'AiRouterError';
    this.code = code;
  }
}

export function isAiRouterError(err: unknown): err is AiRouterError {
  return err instanceof AiRouterError;
}
