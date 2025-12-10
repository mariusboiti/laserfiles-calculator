import { Injectable } from '@nestjs/common';
import {
  ExternalOrderPayload,
  ExternalProductPayload,
  SalesChannelCode,
  SalesChannelConnector,
} from './base.connector';

@Injectable()
export class CsvConnector implements SalesChannelConnector {
  readonly channel: SalesChannelCode = 'CSV';

  async testConnection(_connectionConfig: any): Promise<{ ok: boolean; message?: string }> {
    // CSV is a local/manual channel, nothing to test remotely.
    return { ok: true, message: 'CSV connector ready.' };
  }

  async fetchNewOrders(_connectionConfig: any, _since?: Date): Promise<ExternalOrderPayload[]> {
    // CSV imports are handled via dedicated endpoint, not pull-based.
    return [];
  }

  async listProducts(_connectionConfig: any): Promise<ExternalProductPayload[]> {
    // CSV does not expose products; mappings are driven by IDs in the CSV.
    return [];
  }

  async updateOrderStatus(
    _connectionConfig: any,
    _externalOrderId: string,
    _status: string,
  ): Promise<{ ok: boolean; message?: string }> {
    // CSV is offline/manual, so there is nothing to push. Treat as a no-op success.
    return { ok: true, message: 'CSV channel does not support remote status updates.' };
  }
}
