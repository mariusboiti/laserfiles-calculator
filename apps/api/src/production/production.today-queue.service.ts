import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BatchPriority, BatchStatus, TodayQueueEntityType, OrderStatus, OrderPriority } from '@prisma/client';

@Injectable()
export class TodayQueueService {
  constructor(private readonly prisma: PrismaService) {}

  async getTodayQueue() {
    const now = new Date();

    const pins = await this.prisma.todayQueuePin.findMany({
      orderBy: { createdAt: 'asc' },
      include: {
        batch: {
          include: {
            season: true,
            _count: { select: { items: true } },
          },
        },
        orderItem: {
          include: {
            order: true,
            template: true,
            templateVariant: true,
          },
        },
      },
    });

    const pinnedBatchIds = new Set<string>();
    const pinnedBatches = pins
      .filter((p) => p.entityType === TodayQueueEntityType.BATCH && p.batch)
      .map((p) => {
        pinnedBatchIds.add(p.batch!.id);
        return this.toQueueBatch(p.batch!);
      });

    const pinnedItemIds = new Set<string>();
    const pinnedItems = pins
      .filter((p) => p.entityType === TodayQueueEntityType.ORDER_ITEM && p.orderItem)
      .map((p) => {
        pinnedItemIds.add(p.orderItem!.id);
        return this.toQueueItem(p.orderItem!);
      });

    const batchesInProgressRaw = await this.prisma.productionBatch.findMany({
      where: { status: BatchStatus.IN_PROGRESS },
      include: {
        season: true,
        _count: { select: { items: true } },
      },
      orderBy: [
        { targetDate: 'asc' },
        { priority: 'desc' },
        { createdAt: 'asc' },
      ],
    });

    const batchesReadyRaw = await this.prisma.productionBatch.findMany({
      where: { status: BatchStatus.READY },
      include: {
        season: true,
        _count: { select: { items: true } },
      },
      orderBy: [
        { targetDate: 'asc' },
        { priority: 'desc' },
        { createdAt: 'asc' },
      ],
    });

    const [batchesInProgress, batchesReady] = await Promise.all([
      this.addBatchEstimates(batchesInProgressRaw),
      this.addBatchEstimates(batchesReadyRaw),
    ]);

    const filteredInProgress = batchesInProgress.filter((b) => !pinnedBatchIds.has(b.id));
    const filteredReady = batchesReady.filter((b) => !pinnedBatchIds.has(b.id));

    const urgentItemsRaw = await this.prisma.orderItem.findMany({
      where: {
        batchLinks: { none: {} },
        order: {
          priority: OrderPriority.URGENT,
          status: {
            in: [
              OrderStatus.NEW,
              OrderStatus.IN_PROGRESS,
              OrderStatus.WAITING_MATERIALS,
              OrderStatus.READY,
            ],
          },
        },
      },
      include: {
        order: true,
        template: true,
        templateVariant: true,
      },
      orderBy: [{ createdAt: 'asc' }],
      take: 500,
    });

    const urgentItems = urgentItemsRaw
      .map((it) => this.toQueueItem(it))
      .filter((it) => !pinnedItemIds.has(it.id));

    return {
      generatedAt: now.toISOString(),
      pinned: {
        batches: pinnedBatches,
        items: pinnedItems,
      },
      batchesInProgress: filteredInProgress,
      batchesReady: filteredReady,
      urgentItems,
    };
  }

  async pin(entityType: TodayQueueEntityType, id: string) {
    if (entityType === TodayQueueEntityType.BATCH) {
      const batch = await this.prisma.productionBatch.findUnique({ where: { id } });
      if (!batch) return null;
      const existing = await this.prisma.todayQueuePin.findFirst({
        where: { entityType, batchId: id },
      });
      if (existing) return existing;
      return this.prisma.todayQueuePin.create({
        data: {
          entityType,
          batchId: id,
        },
      });
    }

    if (entityType === TodayQueueEntityType.ORDER_ITEM) {
      const item = await this.prisma.orderItem.findUnique({ where: { id } });
      if (!item) return null;
      const existing = await this.prisma.todayQueuePin.findFirst({
        where: { entityType, orderItemId: id },
      });
      if (existing) return existing;
      return this.prisma.todayQueuePin.create({
        data: {
          entityType,
          orderItemId: id,
        },
      });
    }

    return null;
  }

  async unpin(entityType: TodayQueueEntityType, id: string) {
    if (entityType === TodayQueueEntityType.BATCH) {
      await this.prisma.todayQueuePin.deleteMany({
        where: { entityType, batchId: id },
      });
      return { entityType, id };
    }

    if (entityType === TodayQueueEntityType.ORDER_ITEM) {
      await this.prisma.todayQueuePin.deleteMany({
        where: { entityType, orderItemId: id },
      });
      return { entityType, id };
    }

    return { entityType, id };
  }

  private async addBatchEstimates(batches: any[]) {
    const results: any[] = [];
    for (const b of batches) {
      const links = await this.prisma.batchItemLink.findMany({
        where: { batchId: b.id },
        select: { orderItemId: true },
      });
      const ids = links.map((l) => l.orderItemId);
      let totalEstimated = 0;
      if (ids.length > 0) {
        const items = await this.prisma.orderItem.findMany({
          where: { id: { in: ids } },
          select: { estimatedMinutes: true },
        });
        totalEstimated = items.reduce(
          (sum, it) => sum + (it.estimatedMinutes ?? 0),
          0,
        );
      }
      results.push(this.toQueueBatch(b, totalEstimated));
    }
    return results;
  }

  private toQueueBatch(batch: any, estimatedMinutesTotal?: number) {
    return {
      id: batch.id,
      name: batch.name,
      status: batch.status as BatchStatus,
      priority: batch.priority as BatchPriority,
      targetDate: batch.targetDate,
      season: batch.season
        ? {
            id: batch.season.id,
            name: batch.season.name,
          }
        : null,
      itemsCount: batch._count?.items ?? 0,
      estimatedMinutesTotal: typeof estimatedMinutesTotal === 'number'
        ? estimatedMinutesTotal
        : undefined,
    };
  }

  private toQueueItem(orderItem: any) {
    return {
      id: orderItem.id,
      title: orderItem.title,
      quantity: orderItem.quantity,
      estimatedMinutes: orderItem.estimatedMinutes ?? null,
      order: orderItem.order
        ? {
            id: orderItem.order.id,
            status: orderItem.order.status as OrderStatus,
            priority: orderItem.order.priority as OrderPriority,
            createdAt: orderItem.order.createdAt,
          }
        : null,
      template: orderItem.template
        ? { id: orderItem.template.id, name: orderItem.template.name }
        : null,
      templateVariant: orderItem.templateVariant
        ? { id: orderItem.templateVariant.id, name: orderItem.templateVariant.name }
        : null,
    };
  }
}
