import type { DataPackDefinition, DataPackId } from '@/shared/types/data-packs';

export const DATA_PACKS_STORAGE_KEY = 'formflow.dataPacks.owned';
export const ACTIVE_DATA_PACKS_KEY = 'formflow.dataPacks.active';

/** Dev add-on keys — unlock packs locally without billing. */
export const DEV_DATA_PACK_KEYS: Record<string, DataPackId> = {
  'FFAI-PACK-FINTECH-DEV': 'fintech',
  'FFAI-PACK-HEALTH-DEV': 'healthcare',
  'FFAI-PACK-ECOM-DEV': 'ecommerce',
};

export const DATA_PACK_CHECKOUT_URL = 'https://formflow.ai/data-packs';

export const DATA_PACKS: Record<DataPackId, DataPackDefinition> = {
  fintech: {
    id: 'fintech',
    name: 'Fintech Pack',
    description: 'IBAN, routing numbers, card test PANs, trading symbols.',
    priceLabel: '$9',
    heuristics: [
      { pattern: 'iban|bank[\\s_-]?account', value: 'GB82WEST12345698765432' },
      { pattern: 'routing|sort[\\s_-]?code|aba', value: '021000021' },
      { pattern: 'card|credit[\\s_-]?card|pan', value: '4111111111111111' },
      { pattern: 'cvv|cvc|security[\\s_-]?code', value: '123' },
      { pattern: 'ticker|symbol|stock', value: 'AAPL' },
      { pattern: 'swift|bic', value: 'BOFAUS3N' },
    ],
  },
  healthcare: {
    id: 'healthcare',
    name: 'Healthcare Pack',
    description: 'MRN, NPI, ICD-10, HIPAA-safe synthetic patient fields.',
    priceLabel: '$12',
    heuristics: [
      { pattern: 'mrn|medical[\\s_-]?record', value: 'MRN-00482173' },
      { pattern: 'npi|provider[\\s_-]?id', value: '1234567890' },
      { pattern: 'icd|diagnosis[\\s_-]?code', value: 'J06.9' },
      { pattern: 'patient[\\s_-]?id', value: 'PT-928471' },
      { pattern: 'insurance[\\s_-]?id|member[\\s_-]?id|policy', value: 'INS-4482910' },
      { pattern: 'dob|date[\\s_-]?of[\\s_-]?birth|birth', value: '1985-03-22' },
    ],
  },
  ecommerce: {
    id: 'ecommerce',
    name: 'E-commerce Pack',
    description: 'SKUs, order IDs, promo codes, shipping tracking numbers.',
    priceLabel: '$9',
    heuristics: [
      { pattern: 'sku|product[\\s_-]?code|item[\\s_-]?number', value: 'SKU-ACME-8842' },
      { pattern: 'order[\\s_-]?id|order[\\s_-]?number|transaction', value: 'ORD-2026-004821' },
      { pattern: 'promo|coupon|discount[\\s_-]?code', value: 'QA-SAVE15' },
      { pattern: 'tracking|shipment|parcel', value: '1Z999AA10123456784' },
      { pattern: 'quantity|qty', value: '2' },
      { pattern: 'gift[\\s_-]?message', value: 'Happy testing!' },
    ],
  },
};
