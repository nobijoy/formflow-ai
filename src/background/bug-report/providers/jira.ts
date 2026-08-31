import type { BugReportJiraConfig, BugReportPayload } from '@/shared/types/bug-report';

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1] ?? '';
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

function jiraAuthHeader(config: BugReportJiraConfig): string {
  return `Basic ${btoa(`${config.email}:${config.token}`)}`;
}

export async function exportToJira(
  config: BugReportJiraConfig,
  payload: BugReportPayload,
): Promise<{ issueUrl: string; issueId: string }> {
  const createResponse = await fetch(`${config.baseUrl}/rest/api/3/issue`, {
    method: 'POST',
    headers: {
      Authorization: jiraAuthHeader(config),
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fields: {
        project: { key: config.projectKey },
        summary: payload.title,
        issuetype: { name: 'Bug' },
        description: {
          type: 'doc',
          version: 1,
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: payload.bodyMarkdown.slice(0, 32000) }],
            },
          ],
        },
        labels: ['formflow-ai'],
      },
    }),
  });

  if (createResponse.status === 401 || createResponse.status === 403) {
    throw new Error('Jira credentials rejected — check email, API token, and project key.');
  }
  if (!createResponse.ok) {
    const text = await createResponse.text();
    throw new Error(`Jira API error (${createResponse.status}): ${text.slice(0, 200)}`);
  }

  const created = (await createResponse.json()) as { id: string; key: string; self: string };

  if (payload.screenshotDataUrl) {
    const bytes = dataUrlToBytes(payload.screenshotDataUrl);
    const form = new FormData();
    form.append('file', new Blob([bytes as BlobPart], { type: 'image/png' }), 'formflow-screenshot.png');

    await fetch(`${config.baseUrl}/rest/api/3/issue/${created.key}/attachments`, {
      method: 'POST',
      headers: {
        Authorization: jiraAuthHeader(config),
        'X-Atlassian-Token': 'no-check',
      },
      body: form,
    });
  }

  const issueUrl = `${config.baseUrl}/browse/${created.key}`;
  return { issueUrl, issueId: created.id };
}
