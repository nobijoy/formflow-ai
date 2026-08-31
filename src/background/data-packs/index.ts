/**
 * Module 5 — FR-5.5 Vertical data packs (add-on ownership + activation).
 */

import {
  ACTIVE_DATA_PACKS_KEY,
  DATA_PACKS,
  DATA_PACKS_STORAGE_KEY,
  DEV_DATA_PACK_KEYS,
} from '@/shared/constants/data-packs';
import type { DataPackId } from '@/shared/types/data-packs';

export async function getOwnedDataPacks(): Promise<DataPackId[]> {
  const stored = await chrome.storage.local.get(DATA_PACKS_STORAGE_KEY);
  return (stored[DATA_PACKS_STORAGE_KEY] as DataPackId[] | undefined) ?? [];
}

export async function getActiveDataPacks(): Promise<DataPackId[]> {
  const stored = await chrome.storage.local.get(ACTIVE_DATA_PACKS_KEY);
  const active = (stored[ACTIVE_DATA_PACKS_KEY] as DataPackId[] | undefined) ?? [];
  const owned = await getOwnedDataPacks();
  return active.filter((id) => owned.includes(id));
}

export async function setActiveDataPacks(packIds: DataPackId[]): Promise<DataPackId[]> {
  const owned = await getOwnedDataPacks();
  const valid = packIds.filter((id) => owned.includes(id));
  await chrome.storage.local.set({ [ACTIVE_DATA_PACKS_KEY]: valid });
  return valid;
}

async function persistOwned(packs: DataPackId[]): Promise<void> {
  await chrome.storage.local.set({ [DATA_PACKS_STORAGE_KEY]: packs });
}

export async function activateDataPackKey(key: string): Promise<DataPackId[]> {
  const normalized = key.trim().toUpperCase();
  const packId = DEV_DATA_PACK_KEYS[normalized];
  if (!packId) {
    throw new Error('Invalid data pack key.');
  }

  const owned = await getOwnedDataPacks();
  if (!owned.includes(packId)) {
    owned.push(packId);
    await persistOwned(owned);
  }

  const active = await getActiveDataPacks();
  if (!active.includes(packId)) {
    await setActiveDataPacks([...active, packId]);
  }

  return owned;
}

export function listDataPackCatalog() {
  return Object.values(DATA_PACKS).map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    priceLabel: p.priceLabel,
  }));
}
