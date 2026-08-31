/**
 * Bug report integration settings — PATs encrypted like BYOK keys (FR-5.3).
 */

import { BUG_REPORT_SETTINGS_KEY } from '@/shared/constants/bug-report';
import { decryptSecret, encryptSecret } from '@/background/ai-router/key-storage';
import type {
  BugReportGithubConfig,
  BugReportJiraConfig,
  BugReportLinearConfig,
  BugReportSettingsPublic,
} from '@/shared/types/bug-report';

interface StoredBugReportSettings {
  github?: { owner: string; repo: string; tokenEnc?: string };
  linear?: { teamId: string; tokenEnc?: string };
  jira?: { baseUrl: string; projectKey: string; email: string; tokenEnc?: string };
}

async function loadRaw(): Promise<StoredBugReportSettings> {
  const stored = await chrome.storage.local.get(BUG_REPORT_SETTINGS_KEY);
  return (stored[BUG_REPORT_SETTINGS_KEY] as StoredBugReportSettings | undefined) ?? {};
}

async function saveRaw(settings: StoredBugReportSettings): Promise<void> {
  await chrome.storage.local.set({ [BUG_REPORT_SETTINGS_KEY]: settings });
}

export async function getBugReportSettingsPublic(): Promise<BugReportSettingsPublic> {
  const raw = await loadRaw();
  return {
    github: {
      owner: raw.github?.owner ?? '',
      repo: raw.github?.repo ?? '',
      hasToken: Boolean(raw.github?.tokenEnc),
      configured: Boolean(raw.github?.owner && raw.github?.repo && raw.github?.tokenEnc),
    },
    linear: {
      teamId: raw.linear?.teamId ?? '',
      hasToken: Boolean(raw.linear?.tokenEnc),
      configured: Boolean(raw.linear?.teamId && raw.linear?.tokenEnc),
    },
    jira: {
      baseUrl: raw.jira?.baseUrl ?? '',
      projectKey: raw.jira?.projectKey ?? '',
      email: raw.jira?.email ?? '',
      hasToken: Boolean(raw.jira?.tokenEnc),
      configured: Boolean(
        raw.jira?.baseUrl && raw.jira?.projectKey && raw.jira?.email && raw.jira?.tokenEnc,
      ),
    },
  };
}

async function decryptToken(enc?: string): Promise<string | null> {
  if (!enc) return null;
  try {
    return await decryptSecret(enc);
  } catch {
    return null;
  }
}

export async function loadGithubConfig(): Promise<BugReportGithubConfig | null> {
  const raw = await loadRaw();
  if (!raw.github?.owner || !raw.github.repo) return null;
  const token = await decryptToken(raw.github.tokenEnc);
  if (!token) return null;
  return { owner: raw.github.owner, repo: raw.github.repo, token };
}

export async function loadLinearConfig(): Promise<BugReportLinearConfig | null> {
  const raw = await loadRaw();
  if (!raw.linear?.teamId) return null;
  const token = await decryptToken(raw.linear.tokenEnc);
  if (!token) return null;
  return { teamId: raw.linear.teamId, token };
}

export async function loadJiraConfig(): Promise<BugReportJiraConfig | null> {
  const raw = await loadRaw();
  if (!raw.jira?.baseUrl || !raw.jira.projectKey || !raw.jira.email) return null;
  const token = await decryptToken(raw.jira.tokenEnc);
  if (!token) return null;
  return {
    baseUrl: raw.jira.baseUrl.replace(/\/$/, ''),
    projectKey: raw.jira.projectKey,
    email: raw.jira.email,
    token,
  };
}

export async function saveBugReportSettings(input: {
  github?: { owner?: string; repo?: string; token?: string };
  linear?: { teamId?: string; token?: string };
  jira?: { baseUrl?: string; projectKey?: string; email?: string; token?: string };
}): Promise<BugReportSettingsPublic> {
  const raw = await loadRaw();

  if (input.github) {
    raw.github = {
      owner: input.github.owner ?? raw.github?.owner ?? '',
      repo: input.github.repo ?? raw.github?.repo ?? '',
      tokenEnc: input.github.token
        ? await encryptSecret(input.github.token)
        : raw.github?.tokenEnc,
    };
  }

  if (input.linear) {
    raw.linear = {
      teamId: input.linear.teamId ?? raw.linear?.teamId ?? '',
      tokenEnc: input.linear.token
        ? await encryptSecret(input.linear.token)
        : raw.linear?.tokenEnc,
    };
  }

  if (input.jira) {
    raw.jira = {
      baseUrl: input.jira.baseUrl ?? raw.jira?.baseUrl ?? '',
      projectKey: input.jira.projectKey ?? raw.jira?.projectKey ?? '',
      email: input.jira.email ?? raw.jira?.email ?? '',
      tokenEnc: input.jira.token ? await encryptSecret(input.jira.token) : raw.jira?.tokenEnc,
    };
  }

  await saveRaw(raw);
  return getBugReportSettingsPublic();
}
