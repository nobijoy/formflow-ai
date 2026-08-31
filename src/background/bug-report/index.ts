/**
 * Module 5 — FR-5.3 Bug Report Generator (Pro).
 */

import { BUG_REPORT_DEFAULT_STEP_LIMIT } from '@/shared/constants/bug-report';
import type {
  BugReportDestination,
  BugReportExportResult,
  BugReportPayload,
} from '@/shared/types/bug-report';
import type { ActionLedger } from '@/shared/schema/action-ledger';
import { hasFeature } from '@/background/licensing';
import { buildBugReportPayload } from '@/background/bug-report/format';
import {
  loadGithubConfig,
  loadJiraConfig,
  loadLinearConfig,
} from '@/background/bug-report/settings';
import { exportToGithub } from '@/background/bug-report/providers/github';
import { exportToLinear } from '@/background/bug-report/providers/linear';
import { exportToJira } from '@/background/bug-report/providers/jira';

export type BugReportErrorCode = 'PRO_REQUIRED' | 'NOT_CONFIGURED' | 'NO_LEDGER';

export class BugReportError extends Error {
  readonly code: BugReportErrorCode;

  constructor(code: BugReportErrorCode, message: string) {
    super(message);
    this.name = 'BugReportError';
    this.code = code;
  }
}

export function isBugReportError(err: unknown): err is BugReportError {
  return err instanceof BugReportError;
}

export async function assertBugReportAllowed(): Promise<void> {
  if (!(await hasFeature('BUG_REPORT_GENERATOR'))) {
    throw new BugReportError(
      'PRO_REQUIRED',
      'Bug report export requires FormFlow Pro.',
    );
  }
}

export async function captureActiveTabScreenshot(): Promise<string | null> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.windowId) return null;
    return await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' });
  } catch {
    return null;
  }
}

export async function exportBugReport(input: {
  destination: BugReportDestination;
  title: string;
  ledger: ActionLedger;
  stepLimit?: number;
  extraNotes?: string;
  includeScreenshot?: boolean;
}): Promise<BugReportExportResult> {
  await assertBugReportAllowed();

  if (!input.ledger.actions.length) {
    throw new BugReportError('NO_LEDGER', 'Record a flow first — no steps to export.');
  }

  const screenshotDataUrl =
    input.includeScreenshot !== false ? await captureActiveTabScreenshot() : null;

  const payload = buildBugReportPayload({
    title: input.title,
    ledger: input.ledger,
    stepLimit: input.stepLimit ?? BUG_REPORT_DEFAULT_STEP_LIMIT,
    screenshotDataUrl,
    extraNotes: input.extraNotes,
  });

  return dispatchExport(input.destination, payload);
}

async function dispatchExport(
  destination: BugReportDestination,
  payload: BugReportPayload,
): Promise<BugReportExportResult> {
  switch (destination) {
    case 'github': {
      const config = await loadGithubConfig();
      if (!config) {
        throw new BugReportError('NOT_CONFIGURED', 'Configure GitHub owner, repo, and PAT in Settings.');
      }
      const result = await exportToGithub(config, payload);
      return { destination, ...result };
    }
    case 'linear': {
      const config = await loadLinearConfig();
      if (!config) {
        throw new BugReportError('NOT_CONFIGURED', 'Configure Linear team ID and API key in Settings.');
      }
      const result = await exportToLinear(config, payload);
      return { destination, ...result };
    }
    case 'jira': {
      const config = await loadJiraConfig();
      if (!config) {
        throw new BugReportError(
          'NOT_CONFIGURED',
          'Configure Jira base URL, project key, email, and API token in Settings.',
        );
      }
      const result = await exportToJira(config, payload);
      return { destination, ...result };
    }
  }
}

export {
  getBugReportSettingsPublic,
  saveBugReportSettings,
} from '@/background/bug-report/settings';
