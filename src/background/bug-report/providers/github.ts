import type { BugReportGithubConfig, BugReportPayload } from '@/shared/types/bug-report';

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',');
  const mime = header.match(/data:([^;]+)/)?.[1] ?? 'image/png';
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  return new Blob([bytes], { type: mime });
}

async function uploadGithubScreenshot(
  config: BugReportGithubConfig,
  issueNumber: number,
  dataUrl: string,
): Promise<void> {
  const blob = dataUrlToBlob(dataUrl);
  const form = new FormData();
  form.append('file', blob, 'formflow-screenshot.png');

  const response = await fetch(
    `https://uploads.github.com/repos/${config.owner}/${config.repo}/issues/${issueNumber}/assets`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: form,
    },
  );

  if (!response.ok) {
    console.warn('[FormFlow] GitHub screenshot upload failed:', response.status);
  }
}

export async function exportToGithub(
  config: BugReportGithubConfig,
  payload: BugReportPayload,
): Promise<{ issueUrl: string; issueId: string }> {
  const response = await fetch(
    `https://api.github.com/repos/${config.owner}/${config.repo}/issues`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({
        title: payload.title,
        body: payload.bodyMarkdown,
        labels: ['bug', 'formflow-ai'],
      }),
    },
  );

  if (response.status === 401 || response.status === 403) {
    throw new Error('GitHub token rejected — check repo access and `repo` scope.');
  }
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub API error (${response.status}): ${text.slice(0, 200)}`);
  }

  const json = (await response.json()) as { number: number; html_url: string; id: number };
  if (payload.screenshotDataUrl) {
    await uploadGithubScreenshot(config, json.number, payload.screenshotDataUrl);
  }

  return { issueUrl: json.html_url, issueId: String(json.id) };
}
