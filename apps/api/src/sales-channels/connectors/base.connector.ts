export interface ExternalProductPayload {
  externalProductId: string;
  name: string;
  raw: any;
}

export interface ExternalOrderPayload {
  externalOrderId: string;
  orderNumber: string;
  status?: string;
  currency?: string;
  totals?: any;
  customer?: any;
  items: {
    externalProductId?: string;
    title: string;
    quantity: number;
    unitPrice?: number;
    options?: any;
    raw?: any;
  }[];
  raw: any;
}

export interface SalesChannelConnector {
  readonly channel: SalesChannelCode;

  testConnection(connectionConfig: any): Promise<{ ok: boolean; message?: string }>;

  fetchNewOrders(connectionConfig: any, since?: Date): Promise<ExternalOrderPayload[]>;

  listProducts(connectionConfig: any): Promise<ExternalProductPayload[]>;

  updateOrderStatus(
    connectionConfig: any,
    externalOrderId: string,
    status: string,
  ): Promise<{ ok: boolean; message?: string }>;
}

export type SalesChannelCode = 'WOOCOMMERCE' | 'ETSY' | 'CSV';
