import { z } from 'zod';

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const createCustomerSchema = z.object({
  name: z.string().min(1),
  email: z
    .string()
    .email()
    .optional()
    .or(z.literal(''))
    .transform((v: string | undefined) => (v === '' ? undefined : v)),
  phone: z.string().optional(),
  notes: z.string().optional(),
});

export const createMaterialSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  thicknessMm: z.coerce.number().int().min(1),
  unitType: z.enum(['SHEET', 'M2']),
  costPerSheet: z.coerce.number().nonnegative().optional(),
  costPerM2: z.coerce.number().nonnegative().optional(),
  sheetWidthMm: z.coerce.number().int().positive().optional(),
  sheetHeightMm: z.coerce.number().int().positive().optional(),
  stockQty: z.coerce.number().int().nonnegative().default(0),
  lowStockThreshold: z.coerce.number().int().nonnegative().default(0),
});

export const createOrderSchema = z.object({
  customerId: z.string().min(1),
  notes: z.string().optional(),
  priority: z.enum(['NORMAL', 'URGENT']).default('NORMAL'),
});

export const createOrderItemSchema = z.object({
  orderId: z.string().min(1),
  title: z.string().min(1),
  materialId: z.string().optional(),
  quantity: z.coerce.number().int().min(1),
  widthMm: z.coerce.number().int().positive().optional(),
  heightMm: z.coerce.number().int().positive().optional(),
  customizationText: z.string().optional(),
  estimatedMinutes: z.coerce.number().int().positive().optional(),
});

export const priceCalculationInputSchema = z.object({
  materialId: z.string(),
  quantity: z.number().int().min(1),
  widthMm: z.number().positive(),
  heightMm: z.number().positive(),
  wastePercent: z.number().min(0).max(100).default(15),
  machineMinutes: z.number().nonnegative().default(0),
  machineHourlyCost: z.number().nonnegative().default(0),
  addOnIds: z.array(z.string()).default([]),
  targetMarginPercent: z.number().min(0).max(95).default(40),
});
