/**
 * Module 3 — FR-3.3 encrypted BYOK key storage.
 *
 * Threat model (Open Question #3 — decided): keys are encrypted with a key
 * derived from the extension ID + a random salt in chrome.storage.local.
 * This protects against *casual inspection* of raw storage/sync data (another
 * extension reading storage, a user browsing chrome.storage in DevTools).
 * It does NOT protect against a fully compromised device where an attacker can
 * run code as the user and call the same decrypt path — no user passphrase or
 * OS keychain is involved in v1.
 */

import { BYOK_SALT_KEY } from '@/shared/constants/byok-storage';

const PBKDF2_ITERATIONS = 100_000;

function getExtensionMaterial(): Uint8Array {
  return new TextEncoder().encode(chrome.runtime.id);
}

async function getOrCreateSalt(): Promise<Uint8Array> {
  const stored = await chrome.storage.local.get(BYOK_SALT_KEY);
  const existing = stored[BYOK_SALT_KEY] as string | undefined;
  if (existing) {
    return Uint8Array.from(atob(existing), (c) => c.charCodeAt(0));
  }

  const salt = crypto.getRandomValues(new Uint8Array(16));
  await chrome.storage.local.set({
    [BYOK_SALT_KEY]: btoa(String.fromCharCode(...salt)),
  });
  return salt;
}

async function deriveAesKey(salt: Uint8Array): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    getExtensionMaterial() as BufferSource,
    'PBKDF2',
    false,
    ['deriveKey'],
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: new Uint8Array(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function encryptSecret(plaintext: string): Promise<string> {
  const salt = await getOrCreateSalt();
  const key = await deriveAesKey(salt);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plaintext),
  );

  const payload = new Uint8Array(iv.length + ciphertext.byteLength);
  payload.set(iv, 0);
  payload.set(new Uint8Array(ciphertext), iv.length);
  return btoa(String.fromCharCode(...payload));
}

export async function decryptSecret(ciphertextB64: string): Promise<string> {
  const salt = await getOrCreateSalt();
  const key = await deriveAesKey(salt);
  const payload = Uint8Array.from(atob(ciphertextB64), (c) => c.charCodeAt(0));
  const iv = payload.slice(0, 12);
  const data = payload.slice(12);

  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
  return new TextDecoder().decode(plaintext);
}
