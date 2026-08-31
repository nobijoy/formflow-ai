import { afterEach, describe, expect, it, vi } from 'vitest';
import { callGemini } from '@/background/ai-router/providers/gemini';
import { callGroq } from '@/background/ai-router/providers/groq';
import { callOllama } from '@/background/ai-router/providers/ollama';
import { AiRouterError } from '@/background/ai-router/errors';

describe('BYOK provider clients (FR-3.3)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('Gemini: invalid key surfaces INVALID_KEY', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('Unauthorized', { status: 401 })),
    );

    await expect(callGemini('bad-key', 'tag=input type=text')).rejects.toMatchObject({
      code: 'INVALID_KEY',
    });
  });

  it('Groq: provider outage surfaces PROVIDER_OUTAGE', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('Server error', { status: 503 })),
    );

    await expect(callGroq('key', 'tag=input type=text')).rejects.toMatchObject({
      code: 'PROVIDER_OUTAGE',
    });
  });

  it('Groq: parses a successful completion', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ choices: [{ message: { content: 'Blue' } }] }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    );

    await expect(callGroq('key', 'tag=input type=text label="Color"')).resolves.toBe('Blue');
  });

  it('Ollama: network failure surfaces NETWORK_ERROR', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await expect(callOllama('http://127.0.0.1:11434', 'tag=input')).rejects.toBeInstanceOf(
      AiRouterError,
    );
  });

  it('fetchWithTimeout aborts with TIMEOUT', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((_url, init?: RequestInit) => {
        return new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'));
          });
        });
      }),
    );

    const { fetchWithTimeout } = await import('@/background/ai-router/providers/http');
    await expect(fetchWithTimeout('https://example.com', {}, 50)).rejects.toMatchObject({
      code: 'TIMEOUT',
    });
  });
});
