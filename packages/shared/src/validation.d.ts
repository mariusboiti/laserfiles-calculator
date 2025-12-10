import { z } from 'zod';
export declare const paginationSchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    pageSize: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    page: number;
    pageSize: number;
}, {
    page?: number | undefined;
    pageSize?: number | undefined;
}>;
export declare const loginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}>;
export declare const createCustomerSchema: z.ZodObject<{
    name: z.ZodString;
    email: z.ZodEffects<z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>, string | undefined, string | undefined>;
    phone: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    email?: string | undefined;
    phone?: string | undefined;
    notes?: string | undefined;
}, {
    name: string;
    email?: string | undefined;
    phone?: string | undefined;
    notes?: string | undefined;
}>;
export declare const createMaterialSchema: z.ZodObject<{
    name: z.ZodString;
    category: z.ZodString;
    thicknessMm: z.ZodNumber;
    unitType: z.ZodEnum<["SHEET", "M2"]>;
    costPerSheet: z.ZodOptional<z.ZodNumber>;
    costPerM2: z.ZodOptional<z.ZodNumber>;
    sheetWidthMm: z.ZodOptional<z.ZodNumber>;
    sheetHeightMm: z.ZodOptional<z.ZodNumber>;
    stockQty: z.ZodDefault<z.ZodNumber>;
    lowStockThreshold: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    name: string;
    category: string;
    thicknessMm: number;
    unitType: "SHEET" | "M2";
    stockQty: number;
    lowStockThreshold: number;
    costPerSheet?: number | undefined;
    costPerM2?: number | undefined;
    sheetWidthMm?: number | undefined;
    sheetHeightMm?: number | undefined;
}, {
    name: string;
    category: string;
    thicknessMm: number;
    unitType: "SHEET" | "M2";
    costPerSheet?: number | undefined;
    costPerM2?: number | undefined;
    sheetWidthMm?: number | undefined;
    sheetHeightMm?: number | undefined;
    stockQty?: number | undefined;
    lowStockThreshold?: number | undefined;
}>;
export declare const createOrderSchema: z.ZodObject<{
    customerId: z.ZodString;
    notes: z.ZodOptional<z.ZodString>;
    priority: z.ZodDefault<z.ZodEnum<["NORMAL", "URGENT"]>>;
}, "strip", z.ZodTypeAny, {
    customerId: string;
    priority: "NORMAL" | "URGENT";
    notes?: string | undefined;
}, {
    customerId: string;
    notes?: string | undefined;
    priority?: "NORMAL" | "URGENT" | undefined;
}>;
export declare const createOrderItemSchema: z.ZodObject<{
    orderId: z.ZodString;
    title: z.ZodString;
    materialId: z.ZodOptional<z.ZodString>;
    quantity: z.ZodNumber;
    widthMm: z.ZodOptional<z.ZodNumber>;
    heightMm: z.ZodOptional<z.ZodNumber>;
    customizationText: z.ZodOptional<z.ZodString>;
    estimatedMinutes: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    orderId: string;
    title: string;
    quantity: number;
    materialId?: string | undefined;
    widthMm?: number | undefined;
    heightMm?: number | undefined;
    customizationText?: string | undefined;
    estimatedMinutes?: number | undefined;
}, {
    orderId: string;
    title: string;
    quantity: number;
    materialId?: string | undefined;
    widthMm?: number | undefined;
    heightMm?: number | undefined;
    customizationText?: string | undefined;
    estimatedMinutes?: number | undefined;
}>;
export declare const priceCalculationInputSchema: z.ZodObject<{
    materialId: z.ZodString;
    quantity: z.ZodNumber;
    widthMm: z.ZodNumber;
    heightMm: z.ZodNumber;
    wastePercent: z.ZodDefault<z.ZodNumber>;
    machineMinutes: z.ZodDefault<z.ZodNumber>;
    machineHourlyCost: z.ZodDefault<z.ZodNumber>;
    addOnIds: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    targetMarginPercent: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    materialId: string;
    quantity: number;
    widthMm: number;
    heightMm: number;
    wastePercent: number;
    machineMinutes: number;
    machineHourlyCost: number;
    addOnIds: string[];
    targetMarginPercent: number;
}, {
    materialId: string;
    quantity: number;
    widthMm: number;
    heightMm: number;
    wastePercent?: number | undefined;
    machineMinutes?: number | undefined;
    machineHourlyCost?: number | undefined;
    addOnIds?: string[] | undefined;
    targetMarginPercent?: number | undefined;
}>;
