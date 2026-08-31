/** Bug report export destinations (FR-5.3). */
export type BugReportDestination = 'github' | 'linear' | 'jira';

export interface BugReportGithubConfig {
  owner: string;
  repo: string;
  token: string;
}

export interface BugReportLinearConfig {
  teamId: string;
  token: string;
}

export interface BugReportJiraConfig {
  baseUrl: string;
  projectKey: string;
  email: string;
  token: string;
}

export interface BugReportSettingsPublic {
  github: { owner: string; repo: string; hasToken: boolean; configured: boolean };
  linear: { teamId: string; hasToken: boolean; configured: boolean };
  jira: { baseUrl: string; projectKey: string; email: string; hasToken: boolean; configured: boolean };
}

export interface BugReportPayload {
  title: string;
  bodyMarkdown: string;
  ledgerJson: string;
  screenshotDataUrl: string | null;
  stepCount: number;
  originDomain: string;
}

export interface BugReportExportResult {
  destination: BugReportDestination;
  issueUrl: string;
  issueId: string;
}
