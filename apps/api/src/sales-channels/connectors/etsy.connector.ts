import { Injectable } from '@nestjs/common';
import {
  ExternalOrderPayload,
  ExternalProductPayload,
  SalesChannelCode,
  SalesChannelConnector,
} from './base.connector';

/**
 * Minimal stub implementation for Etsy connector.
 * In this pack we keep it simple and return empty results, ready for
 * OAuth-based integration in a later iteration.
 */
@Injectable()
export class EtsyConnector implements SalesChannelConnector {
  readonly channel: SalesChannelCode = 'ETSY';

  async testConnection(connectionConfig: any): Promise<{ ok: boolean; message?: string }> {
    // TODO: Implement real Etsy API ping using token/shop info
    if (!connectionConfig || !connectionConfig.token) {
      return { ok: false, message: 'Missing token in connection credentials.' };
    }
    return { ok: true, message: 'Etsy connector stubbed: connection looks valid.' };
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
    // Stub: Etsy status API is not integrated yet; we log the intent but do not call Etsy.
    return { ok: true, message: 'Etsy status push stubbed (no real API call).' };
  }
}
