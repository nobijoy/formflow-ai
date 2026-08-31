import { LICENSE_KEY_STORAGE_KEY } from '@/shared/constants/licensing';
import { decryptSecret, encryptSecret } from '@/background/ai-router/key-storage';

export async function storeLicenseKey(licenseKey: string): Promise<void> {
  const encrypted = await encryptSecret(licenseKey.trim());
  await chrome.storage.local.set({ [LICENSE_KEY_STORAGE_KEY]: encrypted });
}

export async function clearLicenseKey(): Promise<void> {
  await chrome.storage.local.remove(LICENSE_KEY_STORAGE_KEY);
}

export async function getLicenseKey(): Promise<string | null> {
  const stored = await chrome.storage.local.get(LICENSE_KEY_STORAGE_KEY);
  const encrypted = stored[LICENSE_KEY_STORAGE_KEY] as string | undefined;
  if (!encrypted) return null;
  try {
    return await decryptSecret(encrypted);
  } catch {
    return null;
  }
}
