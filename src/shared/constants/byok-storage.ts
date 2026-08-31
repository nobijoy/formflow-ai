/** chrome.storage.local keys for BYOK (FR-3.3). */
export const BYOK_CONFIG_KEY = 'formflow.byok.config';
export const BYOK_SALT_KEY = 'formflow.byok.encryptionSalt';

export const DEFAULT_OLLAMA_ENDPOINT = 'http://127.0.0.1:11434';

/** Default models per provider — user can override in a later phase. */
export const BYOK_DEFAULT_MODELS = {
  gemini: 'gemini-2.0-flash',
  groq: 'llama-3.3-70b-versatile',
  ollama: 'llama3.2',
} as const;

export const BYOK_REQUEST_TIMEOUT_MS = 15_000;
