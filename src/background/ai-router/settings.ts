/**
 * Module 3 — FR-3.3 persisted BYOK settings (encrypted at rest).
 */

import {
  BYOK_CONFIG_KEY,
  DEFAULT_OLLAMA_ENDPOINT,
} from '@/shared/constants/byok-storage';
import { decryptSecret, encryptSecret } from '@/background/ai-router/key-storage';
import type { ByokProvider } from '@/background/ai-router/byok';

export interface StoredByokSettings {
  provider: ByokProvider;
  encryptedApiKey: string;
  endpoint?: string;
  /** Ollama does not require an API key — stored as empty ciphertext. */
  hasApiKey: boolean;
}

export interface ByokSettingsPublic {
  provider: ByokProvider;
  endpoint?: string;
  hasApiKey: boolean;
  configured: boolean;
}

export async function loadByokSettings(): Promise<StoredByokSettings | null> {
  const stored = await chrome.storage.local.get(BYOK_CONFIG_KEY);
  return (stored[BYOK_CONFIG_KEY] as StoredByokSettings | undefined) ?? null;
}

export async function getByokSettingsPublic(): Promise<ByokSettingsPublic> {
  const settings = await loadByokSettings();
  if (!settings) {
    return { provider: 'groq', hasApiKey: false, configured: false };
  }

  const configured =
    settings.provider === 'ollama' || (settings.hasApiKey && settings.encryptedApiKey.length > 0);

  return {
    provider: settings.provider,
    endpoint: settings.endpoint,
    hasApiKey: settings.hasApiKey,
    configured,
  };
}

export async function saveByokSettings(input: {
  provider: ByokProvider;
  apiKey?: string;
  endpoint?: string;
}): Promise<void> {
  const existing = await loadByokSettings();
  const endpoint =
    input.provider === 'ollama'
      ? (input.endpoint?.trim() || DEFAULT_OLLAMA_ENDPOINT)
      : undefined;

  let encryptedApiKey = existing?.encryptedApiKey ?? '';
  let hasApiKey = existing?.hasApiKey ?? false;

  if (input.provider === 'ollama') {
    encryptedApiKey = '';
    hasApiKey = false;
  } else if (input.apiKey !== undefined) {
    const trimmed = input.apiKey.trim();
    if (trimmed) {
      encryptedApiKey = await encryptSecret(trimmed);
      hasApiKey = true;
    }
  }

  if (input.provider !== 'ollama' && !hasApiKey) {
    throw new Error('An API key is required for Gemini and Groq.');
  }

  const settings: StoredByokSettings = {
    provider: input.provider,
    encryptedApiKey,
    endpoint,
    hasApiKey,
  };

  await chrome.storage.local.set({ [BYOK_CONFIG_KEY]: settings });
}

export async function decryptApiKey(settings: StoredByokSettings): Promise<string> {
  if (settings.provider === 'ollama') return '';
  if (!settings.hasApiKey || !settings.encryptedApiKey) {
    throw new Error('No API key configured. Add one in FormFlow AI Settings.');
  }
  return decryptSecret(settings.encryptedApiKey);
}
