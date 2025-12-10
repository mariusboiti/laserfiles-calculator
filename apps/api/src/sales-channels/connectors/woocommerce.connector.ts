import { Injectable } from '@nestjs/common';
import {
  ExternalOrderPayload,
  ExternalProductPayload,
  SalesChannelCode,
  SalesChannelConnector,
} from './base.connector';

/**
 * Minimal stub implementation for WooCommerce connector.
 * In this pack we keep it simple and return empty results, but
 * the structure is ready for real HTTP integration in a later iteration.
 */
@Injectable()
export class WooCommerceConnector implements SalesChannelConnector {
  readonly channel: SalesChannelCode = 'WOOCOMMERCE';

  async testConnection(connectionConfig: any): Promise<{ ok: boolean; message?: string }> {
    // TODO: Implement real WooCommerce API ping using store URL + API keys
    if (!connectionConfig || !connectionConfig.storeUrl) {
      return { ok: false, message: 'Missing storeUrl in connection credentials.' };
    }
    return { ok: true, message: 'WooCommerce connector stubbed: connection looks valid.' };
  }

  async fetchNewOrders(_connectionConfig: any, _since?: Date): Promise<ExternalOrderPayload[]> {
    // Stub: no automatic remote fetch in this pack.
    return [];
  }

  async listProducts(_connectionConfig: any): Promise<ExternalProductPayload[]> {
    // Stub: no automatic remote fetch in this pack.
    return [];
  }

  async updateOrderStatus(
    _connectionConfig: any,
    _externalOrderId: string,
    _status: string,
  ): Promise<{ ok: boolean; message?: string }> {
    // Stub: outbound status push not implemented yet, but we report success so that
    // the pipeline and logs work without making real HTTP calls.
    return { ok: true, message: 'WooCommerce status push stubbed (no real API call).' };
  }
}
