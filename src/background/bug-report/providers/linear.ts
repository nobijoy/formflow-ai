import type { BugReportLinearConfig, BugReportPayload } from '@/shared/types/bug-report';

export async function exportToLinear(
  config: BugReportLinearConfig,
  payload: BugReportPayload,
): Promise<{ issueUrl: string; issueId: string }> {
  const mutation = `
    mutation CreateIssue($teamId: String!, $title: String!, $description: String!) {
      issueCreate(input: { teamId: $teamId, title: $title, description: $description }) {
        success
        issue { id identifier url }
      }
    }
  `;

  const response = await fetch('https://api.linear.app/graphql', {
    method: 'POST',
    headers: {
      Authorization: config.token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: mutation,
      variables: {
        teamId: config.teamId,
        title: payload.title,
        description: payload.bodyMarkdown,
      },
    }),
  });

  if (response.status === 401 || response.status === 403) {
    throw new Error('Linear API key rejected — check team ID and token.');
  }
  if (!response.ok) {
    throw new Error(`Linear API error (${response.status}).`);
  }

  const json = (await response.json()) as {
    data?: { issueCreate?: { success?: boolean; issue?: { id: string; url: string; identifier: string } } };
    errors?: Array<{ message: string }>;
  };

  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join('; '));
  }

  const issue = json.data?.issueCreate?.issue;
  if (!issue?.url) {
    throw new Error('Linear did not return an issue URL.');
  }

  return { issueUrl: issue.url, issueId: issue.id };
}
