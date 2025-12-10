import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CsvConnector } from './connectors/csv.connector';
import { EtsyConnector } from './connectors/etsy.connector';
import { WooCommerceConnector } from './connectors/woocommerce.connector';
import { SalesChannelConnector, SalesChannelCode } from './connectors/base.connector';
import { SalesChannelsExternalOrdersService } from './sales-channels.external-orders.service';

interface CreateConnectionInput {
  name: string;
  channel: SalesChannelCode;
  credentialsJson?: any;
  settingsJson?: any;
}

interface UpdateConnectionInput {
  name?: string;
  credentialsJson?: any;
  settingsJson?: any;
}

@Injectable()
export class SalesChannelsConnectionsService {
  private connectorMap: Record<SalesChannelCode, SalesChannelConnector>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly externalOrders: SalesChannelsExternalOrdersService,
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

  async list() {
    const connections = await this.prisma.storeConnection.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const externalAgg = await this.prisma.externalOrder.groupBy({
      by: ['connectionId', 'processedState'],
      _count: { _all: true },
    } as any);

    const statsByConnection = new Map<
      string,
      { total: number; needsReview: number; ignored: number; error: number }
    >();

    for (const row of externalAgg as any[]) {
      const connectionId = row.connectionId as string;
      const state = row.processedState as string;
      const count = row._count?._all ?? 0;

      let stats = statsByConnection.get(connectionId);
      if (!stats) {
        stats = { total: 0, needsReview: 0, ignored: 0, error: 0 };
      }

      stats.total += count;
      if (state === 'NEEDS_REVIEW') {
        stats.needsReview += count;
      } else if (state === 'IGNORED') {
        stats.ignored += count;
      } else if (state === 'ERROR') {
        stats.error += count;
      }

      statsByConnection.set(connectionId, stats);
    }

    const now = new Date();

    return connections.map((conn) => {
      const stats =
        statsByConnection.get(conn.id) ??
        ({ total: 0, needsReview: 0, ignored: 0, error: 0 } as const);

      const lastSyncAt = conn.lastSyncAt ? new Date(conn.lastSyncAt as any) : null;

      let importHealth: 'NO_DATA' | 'OK' | 'STALE' | 'ERROR' = 'NO_DATA';

      if (stats.total === 0 && !lastSyncAt) {
        importHealth = 'NO_DATA';
      } else if (stats.error > 0) {
        importHealth = 'ERROR';
      } else if (!lastSyncAt) {
        importHealth = 'STALE';
      } else {
        const diffHours = (now.getTime() - lastSyncAt.getTime()) / (1000 * 60 * 60);
        importHealth = diffHours <= 24 ? 'OK' : 'STALE';
      }

      return {
        ...conn,
        importHealth,
        externalOrderStats: stats,
      };
    });
  }

  async get(id: string) {
    const conn = await this.prisma.storeConnection.findUnique({ where: { id } });
    if (!conn) {
      throw new NotFoundException('Connection not found');
    }
    return conn;
  }

  async create(input: CreateConnectionInput) {
    return this.prisma.storeConnection.create({
      data: {
        name: input.name,
        channel: input.channel as any,
        credentialsJson: input.credentialsJson ?? {},
        settingsJson: input.settingsJson ?? {},
      },
    });
  }

  async update(id: string, input: UpdateConnectionInput) {
    await this.get(id);
    return this.prisma.storeConnection.update({
      where: { id },
      data: {
        name: input.name,
        credentialsJson:
          typeof input.credentialsJson !== 'undefined' ? input.credentialsJson : undefined,
        settingsJson:
          typeof input.settingsJson !== 'undefined' ? input.settingsJson : undefined,
      },
    });
  }

  async test(id: string) {
    const conn = await this.get(id);
    const connector = this.connectorMap[conn.channel as SalesChannelCode];
    if (!connector) {
      return { ok: false, message: 'No connector registered for this channel.' };
    }

    const credentials = conn.credentialsJson ?? {};
    const result = await connector.testConnection(credentials);

    await this.prisma.storeConnection.update({
      where: { id },
      data: {
        status: result.ok ? 'CONNECTED' : 'ERROR',
      },
    });

    return {
      ok: result.ok,
      message: result.message ?? null,
      status: result.ok ? 'CONNECTED' : 'ERROR',
    };
  }

  async syncNow(id: string) {
    const conn = await this.get(id);
    const connector = this.connectorMap[conn.channel as SalesChannelCode];

    if (!connector) {
      return {
        connectionId: conn.id,
        channel: conn.channel,
        imported: 0,
        message: 'No connector registered for this channel.',
      };
    }

    const credentials = conn.credentialsJson ?? {};
    const since = conn.lastSyncAt ? new Date(conn.lastSyncAt as any) : undefined;

    const payloads = await connector.fetchNewOrders(credentials, since);
    const ingestResult = await this.externalOrders.ingestExternalOrders(conn.id, payloads);

    const now = new Date();
    await this.prisma.storeConnection.update({
      where: { id: conn.id },
      data: { lastSyncAt: now },
    });

    return {
      connectionId: conn.id,
      channel: conn.channel,
      imported: ingestResult.imported,
      lastSyncAt: now.toISOString(),
    };
  }
}
