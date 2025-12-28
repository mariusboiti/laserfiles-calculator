/**
 * Default values and presets for Product Label & SKU Generator
 */

export const DEFAULTS = {
  w: 60,
  h: 30,
  border: true,
  rounded: true,
  cornerR: 3,
  padding: 3,
  productName: 'Handmade Product',
  sku: 'SKU-0001',
  price: '',
  qrEnabled: true,
  qrText: 'https://laserfilespro.com',
  qrSize: 16,
  qrMargin: 2,
  autoFit: true,
  fontMin: 2.5,
  fontMaxName: 5,
  fontMaxSku: 6,
  fontMaxPrice: 4,
};

export interface LabelPresetConfig {
  name: string;
  description: string;
  widthMm: number;
  heightMm: number;
  qrSize: number;
}

export const LABEL_PRESETS: LabelPresetConfig[] = [
  {
    name: 'Small Label',
    description: 'Compact product label',
    widthMm: 50,
    heightMm: 25,
    qrSize: 14,
  },
  {
    name: 'Standard Label',
    description: 'Standard size label',
    widthMm: 60,
    heightMm: 30,
    qrSize: 16,
  },
  {
    name: 'Large Label',
    description: 'Large product label',
    widthMm: 80,
    heightMm: 40,
    qrSize: 20,
  },
];

export function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value) || !Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

export function sanitizeDimensions(w: number, h: number) {
  return {
    w: clamp(w, 20, 200),
    h: clamp(h, 20, 200),
  };
}

export function sanitizeCornerRadius(cornerR: number): number {
  return clamp(cornerR, 0, 15);
}

export function sanitizePadding(padding: number): number {
  return clamp(padding, 0, 10);
}

export function sanitizeQR(qrSize: number, qrMargin: number) {
  return {
    qrSize: clamp(qrSize, 8, 40),
    qrMargin: clamp(qrMargin, 0, 10),
  };
}

export function sanitizeFontSizes(fontMin: number, fontMaxName: number, fontMaxSku: number, fontMaxPrice: number) {
  const min = clamp(fontMin, 1, 20);
  return {
    fontMin: min,
    fontMaxName: Math.max(min, clamp(fontMaxName, 1, 20)),
    fontMaxSku: Math.max(min, clamp(fontMaxSku, 1, 20)),
    fontMaxPrice: Math.max(min, clamp(fontMaxPrice, 1, 20)),
  };
}
