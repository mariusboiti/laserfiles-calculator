import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WooCommerceConnector } from './connectors/woocommerce.connector';
import { EtsyConnector } from './connectors/etsy.connector';
import { CsvConnector } from './connectors/csv.connector';
import { SalesChannelCode, SalesChannelConnector } from './connectors/base.connector';

interface StatusPushResult {
  connectionId: string;
  externalOrderId: string;
  channel: SalesChannelCode;
  status: 'SUCCESS' | 'FAILED';
  message?: string | null;
}

@Injectable()
export class SalesChannelsStatusSyncService {
  private connectorMap: Record<SalesChannelCode, SalesChannelConnector>;

  constructor(
    private readonly prisma: PrismaService,
    woo: WooCommerceConnector,
    etsy: EtsyConnector,
    csv: CsvConnector,
  ) {
    this.connectorMap = {
      WOOCOMMERCE: woo,
      ETSY: etsy,
      CSV: csv,
    };
  }

  private get prismaClient() {
    return this.prisma as any;
  }

  async pushShippedStatusForOrder(
    orderId: string,
    options?: { force?: boolean },
  ): Promise<{
    attempts: number;
    successes: number;
    failures: number;
    results: StatusPushResult[];
  }> {
    const order = await this.prismaClient.order.findUnique({
      where: { id: orderId },
      include: {
        externalLinks: {
          include: {
            connection: true,
            externalOrder: true,
          },
        },
      },
    });

    if (!order || !order.externalLinks || order.externalLinks.length === 0) {
      return { attempts: 0, successes: 0, failures: 0, results: [] };
    }

    if (!options?.force && order.status !== 'SHIPPED') {
      return { attempts: 0, successes: 0, failures: 0, results: [] };
    }

    const results: StatusPushResult[] = [];
    let attempts = 0;
    let successes = 0;
    let failures = 0;

    for (const link of order.externalLinks as any[]) {
      const connection = link.connection as any;
      const externalOrder = link.externalOrder as any;
      if (!connection || !externalOrder) continue;

      const settings = (connection.settingsJson ?? {}) as any;
      if (!settings.enable_status_push) {
        continue;
      }

      const channel = connection.channel as SalesChannelCode;
      const connector = this.connectorMap[channel];
      if (!connector || !externalOrder.externalOrderId) {
        continue;
      }

      const shippedStatusValue: string =
        typeof settings.shipped_status_value === 'string' &&
        settings.shipped_status_value.trim()
          ? settings.shipped_status_value
          : channel === 'WOOCOMMERCE'
          ? 'completed'
          : channel === 'ETSY'
          ? 'shipped'
          : 'SHIPPED';

      attempts += 1;

      let ok = false;
      let message: string | null = null;

      try {
        const res = await connector.updateOrderStatus(
          connection.credentialsJson ?? {},
          externalOrder.externalOrderId,
          shippedStatusValue,
        );
        ok = !!res?.ok;
        message = res?.message ?? null;
      } catch (err: any) {
        ok = false;
        message =
          err?.message && typeof err.message === 'string'
            ? err.message.substring(0, 500)
            : 'Status push failed with unexpected error.';
      }

      await this.prismaClient.externalSyncLog.create({
        data: {
          connectionId: connection.id,
          externalOrderId: externalOrder.id,
          action: 'STATUS_PUSH',
          status: ok ? 'SUCCESS' : 'FAILED',
          errorMessage: ok ? null : message,
        },
      });

      if (ok) {
        successes += 1;
      } else {
        failures += 1;
      }

      results.push({
        connectionId: connection.id,
        externalOrderId: externalOrder.id,
        channel,
        status: ok ? 'SUCCESS' : 'FAILED',
        message,
      });
    }

    return { attempts, successes, failures, results };
  }

  async getStatusForOrder(orderId: string) {
    const order = await this.prismaClient.order.findUnique({
      where: { id: orderId },
      include: {
        externalLinks: {
          include: {
            connection: true,
            externalOrder: {
              include: {
                syncLogs: {
                  orderBy: { createdAt: 'desc' },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });

    if (!order || !order.externalLinks || order.externalLinks.length === 0) {
      return { links: [] };
    }

    const links = (order.externalLinks as any[]).map((link) => {
      const externalOrder = link.externalOrder as any;
      const lastLog = externalOrder?.syncLogs?.[0] ?? null;

      return {
        connectionId: link.connectionId,
        connectionName: link.connection?.name ?? '',
        channel: (link.connection?.channel ?? link.channel) as SalesChannelCode,
        externalOrderId: externalOrder?.id ?? null,
        externalOrderNumber: externalOrder?.externalOrderNumber ?? null,
        lastSync: lastLog
          ? {
              status: lastLog.status as 'SUCCESS' | 'FAILED',
              errorMessage: lastLog.errorMessage as string | null,
              createdAt: lastLog.createdAt as Date,
            }
          : null,
      };
    });

    return { links };
  }
}
