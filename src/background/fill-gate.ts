/**
 * Phase 3 — preset Pro gating + Security Sanity domain guard (FR-2.4, FR-5.2).
 */

import { featureFlagForPreset } from '@/shared/constants/preset-gating';
import { hasFeature } from '@/background/licensing';
import {
  hostnameFromUrl,
  isSecurityFillAuthorized,
} from '@/background/security/domain-authorization';
import type { PresetMode } from '@/shared/schema/action-ledger';

export type FillGateErrorCode = 'PRO_REQUIRED' | 'SECURITY_DOMAIN_BLOCKED';

export class FillGateError extends Error {
  readonly code: FillGateErrorCode;
  readonly hostname?: string;

  constructor(code: FillGateErrorCode, message: string, hostname?: string) {
    super(message);
    this.name = 'FillGateError';
    this.code = code;
    this.hostname = hostname;
  }
}

export function isFillGateError(err: unknown): err is FillGateError {
  return err instanceof FillGateError;
}

async function getActiveTabUrl(): Promise<string> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url?.startsWith('http')) {
    throw new Error('FormFlow AI only works on http(s) pages. Open a web page and try again.');
  }
  return tab.url;
}

export async function assertFillAllowed(presetMode: PresetMode): Promise<void> {
  const feature = featureFlagForPreset(presetMode);
  if (feature && !(await hasFeature(feature))) {
    throw new FillGateError(
      'PRO_REQUIRED',
      'This preset requires FormFlow Pro. Activate a license in Settings or enable “Simulate Pro” for dev testing.',
    );
  }

  if (presetMode === 'SECURITY_SANITY') {
    const hostname = hostnameFromUrl(await getActiveTabUrl());
    if (!(await isSecurityFillAuthorized(hostname))) {
      throw new FillGateError(
        'SECURITY_DOMAIN_BLOCKED',
        `Security Sanity is blocked on “${hostname}” until you confirm you are authorized to test it.`,
        hostname,
      );
    }
  }
}
