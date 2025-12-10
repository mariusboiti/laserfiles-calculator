"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.priceCalculationInputSchema = exports.createOrderItemSchema = exports.createOrderSchema = exports.createMaterialSchema = exports.createCustomerSchema = exports.loginSchema = exports.paginationSchema = void 0;
const zod_1 = require("zod");
exports.paginationSchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).default(1),
    pageSize: zod_1.z.coerce.number().int().min(1).max(100).default(20),
});
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6),
});
exports.createCustomerSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    email: zod_1.z
        .string()
        .email()
        .optional()
        .or(zod_1.z.literal(''))
        .transform((v) => (v === '' ? undefined : v)),
    phone: zod_1.z.string().optional(),
    notes: zod_1.z.string().optional(),
});
exports.createMaterialSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    category: zod_1.z.string().min(1),
    thicknessMm: zod_1.z.coerce.number().int().min(1),
    unitType: zod_1.z.enum(['SHEET', 'M2']),
    costPerSheet: zod_1.z.coerce.number().nonnegative().optional(),
    costPerM2: zod_1.z.coerce.number().nonnegative().optional(),
    sheetWidthMm: zod_1.z.coerce.number().int().positive().optional(),
    sheetHeightMm: zod_1.z.coerce.number().int().positive().optional(),
    stockQty: zod_1.z.coerce.number().int().nonnegative().default(0),
    lowStockThreshold: zod_1.z.coerce.number().int().nonnegative().default(0),
});
exports.createOrderSchema = zod_1.z.object({
    customerId: zod_1.z.string().min(1),
    notes: zod_1.z.string().optional(),
    priority: zod_1.z.enum(['NORMAL', 'URGENT']).default('NORMAL'),
});
exports.createOrderItemSchema = zod_1.z.object({
    orderId: zod_1.z.string().min(1),
    title: zod_1.z.string().min(1),
    materialId: zod_1.z.string().optional(),
    quantity: zod_1.z.coerce.number().int().min(1),
    widthMm: zod_1.z.coerce.number().int().positive().optional(),
    heightMm: zod_1.z.coerce.number().int().positive().optional(),
    customizationText: zod_1.z.string().optional(),
    estimatedMinutes: zod_1.z.coerce.number().int().positive().optional(),
});
exports.priceCalculationInputSchema = zod_1.z.object({
    materialId: zod_1.z.string(),
    quantity: zod_1.z.number().int().min(1),
    widthMm: zod_1.z.number().positive(),
    heightMm: zod_1.z.number().positive(),
    wastePercent: zod_1.z.number().min(0).max(100).default(15),
    machineMinutes: zod_1.z.number().nonnegative().default(0),
    machineHourlyCost: zod_1.z.number().nonnegative().default(0),
    addOnIds: zod_1.z.array(zod_1.z.string()).default([]),
    targetMarginPercent: zod_1.z.number().min(0).max(95).default(40),
});
