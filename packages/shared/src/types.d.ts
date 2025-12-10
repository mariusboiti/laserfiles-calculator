export type UserRole = 'ADMIN' | 'WORKER';
export type OrderStatus = 'NEW' | 'IN_PROGRESS' | 'WAITING_MATERIALS' | 'READY' | 'SHIPPED' | 'COMPLETED' | 'CANCELED';
export type OrderPriority = 'NORMAL' | 'URGENT';
export interface CustomerDTO {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    notes?: string | null;
}
export interface MaterialDTO {
    id: string;
    name: string;
    category: string;
    thicknessMm: number;
    unitType: 'SHEET' | 'M2';
    costPerSheet?: number | null;
    costPerM2?: number | null;
    sheetWidthMm?: number | null;
    sheetHeightMm?: number | null;
    stockQty: number;
    lowStockThreshold: number;
}
export interface OrderItemPriceBreakdown {
    materialCost: number;
    machineCost: number;
    laborCost: number;
    addOns: {
        id: string;
        name: string;
        cost: number;
    }[];
    marginPercent: number;
    totalCost: number;
    recommendedPrice: number;
    templateLines?: {
        ruleId?: string;
        label: string;
        amount: number;
    }[];
    templateBasePrice?: number;
}
export interface OrderItemDTO {
    id: string;
    orderId: string;
    title: string;
    materialId?: string | null;
    quantity: number;
    widthMm?: number | null;
    heightMm?: number | null;
    customizationText?: string | null;
    estimatedMinutes?: number | null;
    priceSnapshotJson?: OrderItemPriceBreakdown | null;
}
export interface OrderDTO {
    id: string;
    customerId: string;
    status: OrderStatus;
    priority: OrderPriority;
    notes?: string | null;
    createdAt: string;
}
export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    pageSize: number;
}
