import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard() {
    const now = new Date();
    const startDate = this.getStartOfWeek(now);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    let ordersThisWeek = 0;
    let revenueEstimateThisWeek = 0;
    let topMaterialsByUsage: {
      materialId: string | null;
      materialName: string;
      count: number;
    }[] = [];
    let averageProductionMinutesPerItem = 0;

    let salesChannelsOverview = {
      totalConnections: 0,
      connectionsWithErrors: 0,
      externalOrdersImportedLast7Days: 0,
      externalOrdersNeedsReview: 0,
      externalOrdersIgnored: 0,
    };

    try {
      const ordersCount = await this.prisma.order.count({
        where: {
          createdAt: { gte: startDate },
        },
      });

      const [topMaterials, avgProduction] = await this.prisma.$transaction([
        // Top materials by usage: count of order items per material
        this.prisma.orderItem.groupBy({
          by: ['materialId'],
          _count: { _all: true },
          where: { materialId: { not: null } },
          orderBy: { _count: { _all: 'desc' } },
          take: 5,
        } as any),
        // Average production time per item: from TimeLog
        this.prisma.timeLog.aggregate({
          _avg: {
            durationMinutes: true,
          },
        }),
      ]);

      ordersThisWeek = ordersCount;

      // For revenue, we approximate by summing priceSnapshotJson.recommendedPrice in JS.
      const orderItems = await this.prisma.orderItem.findMany({
        where: { createdAt: { gte: startDate } },
        select: { priceSnapshotJson: true },
      });

      revenueEstimateThisWeek = orderItems.reduce((sum, item) => {
        const price =
          item.priceSnapshotJson &&
          typeof (item.priceSnapshotJson as any).recommendedPrice === 'number'
            ? (item.priceSnapshotJson as any).recommendedPrice
            : 0;
        return sum + price;
      }, 0);

      const materials = await this.prisma.material.findMany({
        where: {
          id: { in: topMaterials.map((m) => m.materialId!).filter(Boolean) },
        },
      });

      topMaterialsByUsage = topMaterials.map((m: any) => ({
        materialId: m.materialId,
        materialName:
          materials.find((mat) => mat.id === m.materialId)?.name || 'Unknown',
        count: m._count?._all ?? 0,
      }));

      averageProductionMinutesPerItem =
        avgProduction._avg.durationMinutes ?? 0;

      const [
        totalConnections,
        connectionsWithErrors,
        externalOrdersImportedLast7Days,
        externalOrdersNeedsReview,
        externalOrdersIgnored,
      ] = await this.prisma.$transaction([
        this.prisma.storeConnection.count(),
        this.prisma.storeConnection.count({ where: { status: 'ERROR' } }),
        this.prisma.externalOrder.count({
          where: {
            importedAt: {
              gte: sevenDaysAgo,
            },
          },
        }),
        this.prisma.externalOrder.count({
          where: {
            processedState: 'NEEDS_REVIEW' as any,
          },
        }),
        this.prisma.externalOrder.count({
          where: {
            processedState: 'IGNORED' as any,
          },
        }),
      ]);

      salesChannelsOverview = {
        totalConnections,
        connectionsWithErrors,
        externalOrdersImportedLast7Days,
        externalOrdersNeedsReview,
        externalOrdersIgnored,
      };
    } catch (err) {
      console.error('Error in AnalyticsService.dashboard', err);
    }

    return {
      ordersThisWeek,
      revenueEstimateThisWeek,
      topMaterialsByUsage,
      averageProductionMinutesPerItem,
      salesChannels: salesChannelsOverview,
    };
  }

  private getStartOfWeek(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday as first day
    const start = new Date(d.setDate(diff));
    start.setHours(0, 0, 0, 0);
    return start;
  }
}
