import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BusinessIntelligenceService {
  constructor(private prisma: PrismaService) {}

  // ═══════════════════════════════════════════════════════════════
  // ANALYTICS SNAPSHOT GENERATION
  // ═══════════════════════════════════════════════════════════════

  async generateSnapshot(userId: string, periodType: 'daily' | 'weekly' | 'monthly') {
    const now = new Date();
    let periodStart: Date;
    let periodEnd: Date = now;

    switch (periodType) {
      case 'daily':
        periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'weekly':
        periodStart = new Date(now);
        periodStart.setDate(now.getDate() - 7);
        break;
      case 'monthly':
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }

    // Production metrics
    const [jobsCompleted, jobsFailed, totalMachineTime, listings, orders] = await Promise.all([
      this.prisma.laserJob.count({
        where: { userId, status: 'COMPLETED', completedAt: { gte: periodStart, lte: periodEnd } },
      }),
      this.prisma.laserJob.count({
        where: { userId, status: 'FAILED', updatedAt: { gte: periodStart, lte: periodEnd } },
      }),
      this.prisma.laserJob.aggregate({
        where: { userId, status: 'COMPLETED', completedAt: { gte: periodStart, lte: periodEnd } },
        _sum: { actualTimeSec: true },
        _avg: { actualTimeSec: true },
      }),
      this.prisma.marketplaceListing.count({
        where: { userId, status: 'PUBLISHED' },
      }),
      this.prisma.laserJob.aggregate({
        where: { userId, status: 'COMPLETED', completedAt: { gte: periodStart, lte: periodEnd } },
        _sum: { totalCost: true, materialCost: true, machineCost: true },
      }),
    ]);

    // Machine utilization (hours active / hours in period)
    const periodHours = (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60);
    const machineHours = (totalMachineTime._sum.actualTimeSec || 0) / 3600;
    const utilization = periodHours > 0 ? Math.min(1, machineHours / (periodHours * 0.5)) : 0; // assume 50% max uptime

    // Top products
    const topProducts = await this.prisma.laserJob.groupBy({
      by: ['productType'],
      where: { userId, status: 'COMPLETED', completedAt: { gte: periodStart, lte: periodEnd }, productType: { not: null } },
      _count: true,
      _sum: { totalCost: true },
      orderBy: { _count: { productType: 'desc' } },
      take: 5,
    });

    // Top materials
    const topMaterials = await this.prisma.laserJob.groupBy({
      by: ['materialLabel'],
      where: { userId, status: 'COMPLETED', completedAt: { gte: periodStart, lte: periodEnd }, materialLabel: { not: null } },
      _count: true,
      _sum: { materialCost: true },
      orderBy: { _count: { materialLabel: 'desc' } },
      take: 5,
    });

    // Bottleneck detection
    const bottlenecks = await this.detectBottlenecks(userId, periodStart, periodEnd);

    // Cost data
    const totalCosts = Number(orders._sum.totalCost || 0);
    const estimatedRevenue = totalCosts * 2.2; // assume 2.2x markup
    const totalProfit = estimatedRevenue - totalCosts;

    return this.prisma.businessAnalyticsSnapshot.upsert({
      where: {
        userId_periodType_periodStart: { userId, periodType, periodStart },
      },
      create: {
        userId,
        periodStart,
        periodEnd,
        periodType,
        totalJobsCompleted: jobsCompleted,
        totalJobsFailed: jobsFailed,
        totalMachineTimeSec: totalMachineTime._sum.actualTimeSec || 0,
        machineUtilization: Math.round(utilization * 1000) / 1000,
        totalRevenue: estimatedRevenue,
        totalCosts: totalCosts,
        totalProfit: totalProfit,
        avgProfitMargin: totalCosts > 0 ? Math.round((totalProfit / estimatedRevenue) * 1000) / 10 : 0,
        topProductsJson: topProducts.map(p => ({
          productType: p.productType,
          count: p._count,
          cost: Number(p._sum.totalCost || 0),
        })),
        topMaterialsJson: topMaterials.map(m => ({
          material: m.materialLabel,
          count: m._count,
          cost: Number(m._sum.materialCost || 0),
        })),
        totalListingsActive: listings,
        avgJobTimeSec: Math.round(totalMachineTime._avg.actualTimeSec || 0),
        bottlenecksJson: bottlenecks,
      },
      update: {
        periodEnd,
        totalJobsCompleted: jobsCompleted,
        totalJobsFailed: jobsFailed,
        totalMachineTimeSec: totalMachineTime._sum.actualTimeSec || 0,
        machineUtilization: Math.round(utilization * 1000) / 1000,
        totalRevenue: estimatedRevenue,
        totalCosts: totalCosts,
        totalProfit: totalProfit,
        avgProfitMargin: totalCosts > 0 ? Math.round((totalProfit / estimatedRevenue) * 1000) / 10 : 0,
        topProductsJson: topProducts.map(p => ({
          productType: p.productType,
          count: p._count,
          cost: Number(p._sum.totalCost || 0),
        })),
        topMaterialsJson: topMaterials.map(m => ({
          material: m.materialLabel,
          count: m._count,
          cost: Number(m._sum.materialCost || 0),
        })),
        totalListingsActive: listings,
        avgJobTimeSec: Math.round(totalMachineTime._avg.actualTimeSec || 0),
        bottlenecksJson: bottlenecks,
      },
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // DASHBOARD DATA
  // ═══════════════════════════════════════════════════════════════

  async getDashboard(userId: string) {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);

    const [
      machines,
      activeJobs,
      recentJobs,
      listings,
      recentSnapshots,
    ] = await Promise.all([
      // Machine status overview
      this.prisma.machine.findMany({
        where: { OR: [{ userId }, { isShared: true }] },
        select: { id: true, name: true, machineType: true, connectionStatus: true, lastJobAt: true },
      }),
      // Active jobs count
      this.prisma.laserJob.count({
        where: { userId, status: { in: ['QUEUED', 'SENDING', 'CUTTING', 'ENGRAVING'] } },
      }),
      // Recent 10 jobs
      this.prisma.laserJob.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true, jobName: true, status: true, productType: true,
          progressPct: true, estimatedTimeSec: true, createdAt: true,
          machine: { select: { name: true } },
        },
      }),
      // Listing stats
      this.prisma.marketplaceListing.groupBy({
        by: ['status'],
        where: { userId },
        _count: true,
      }),
      // Monthly snapshots for chart
      this.prisma.businessAnalyticsSnapshot.findMany({
        where: { userId, periodType: 'daily', periodStart: { gte: thirtyDaysAgo } },
        orderBy: { periodStart: 'asc' },
        select: {
          periodStart: true, totalJobsCompleted: true, totalJobsFailed: true,
          totalRevenue: true, totalProfit: true, machineUtilization: true,
        },
      }),
    ]);

    return {
      machines: {
        total: machines.length,
        online: machines.filter(m => m.connectionStatus === 'ONLINE').length,
        busy: machines.filter(m => m.connectionStatus === 'BUSY').length,
        list: machines,
      },
      production: {
        activeJobs,
        recentJobs,
      },
      marketplace: {
        listings: listings.reduce((acc, l) => {
          acc[l.status.toLowerCase()] = l._count;
          return acc;
        }, {} as Record<string, number>),
      },
      trends: recentSnapshots,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // PROFITABILITY ANALYSIS
  // ═══════════════════════════════════════════════════════════════

  async getProfitabilityReport(userId: string) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const jobs = await this.prisma.laserJob.findMany({
      where: { userId, status: 'COMPLETED', completedAt: { gte: thirtyDaysAgo } },
      select: {
        productType: true, materialLabel: true,
        materialCost: true, machineCost: true, totalCost: true,
        actualTimeSec: true, jobWidthMm: true, jobHeightMm: true,
      },
    });

    // Group by product type
    const byProduct: Record<string, { count: number; totalCost: number; avgTime: number; totalArea: number }> = {};
    for (const job of jobs) {
      const key = job.productType || 'unknown';
      if (!byProduct[key]) byProduct[key] = { count: 0, totalCost: 0, avgTime: 0, totalArea: 0 };
      byProduct[key].count++;
      byProduct[key].totalCost += Number(job.totalCost || 0);
      byProduct[key].avgTime += (job.actualTimeSec || 0);
      byProduct[key].totalArea += (job.jobWidthMm || 0) * (job.jobHeightMm || 0) / 1e6;
    }
    for (const key of Object.keys(byProduct)) {
      byProduct[key].avgTime = Math.round(byProduct[key].avgTime / byProduct[key].count);
    }

    // Group by material
    const byMaterial: Record<string, { count: number; totalCost: number }> = {};
    for (const job of jobs) {
      const key = job.materialLabel || 'unknown';
      if (!byMaterial[key]) byMaterial[key] = { count: 0, totalCost: 0 };
      byMaterial[key].count++;
      byMaterial[key].totalCost += Number(job.materialCost || 0);
    }

    return {
      period: '30 days',
      totalJobs: jobs.length,
      totalCost: jobs.reduce((s, j) => s + Number(j.totalCost || 0), 0),
      byProduct: Object.entries(byProduct)
        .map(([type, data]) => ({ type, ...data }))
        .sort((a, b) => b.count - a.count),
      byMaterial: Object.entries(byMaterial)
        .map(([material, data]) => ({ material, ...data }))
        .sort((a, b) => b.count - a.count),
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // BOTTLENECK DETECTION
  // ═══════════════════════════════════════════════════════════════

  private async detectBottlenecks(userId: string, from: Date, to: Date) {
    const bottlenecks: { type: string; description: string; severity: 'low' | 'medium' | 'high' }[] = [];

    // High failure rate
    const [completed, failed] = await Promise.all([
      this.prisma.laserJob.count({ where: { userId, status: 'COMPLETED', completedAt: { gte: from, lte: to } } }),
      this.prisma.laserJob.count({ where: { userId, status: 'FAILED', updatedAt: { gte: from, lte: to } } }),
    ]);
    if (completed + failed > 0) {
      const failRate = failed / (completed + failed);
      if (failRate > 0.2) {
        bottlenecks.push({
          type: 'high-failure-rate',
          description: `${Math.round(failRate * 100)}% job failure rate. Check machine calibration and material settings.`,
          severity: failRate > 0.4 ? 'high' : 'medium',
        });
      }
    }

    // Machine offline
    const offlineMachines = await this.prisma.machine.count({
      where: { userId, connectionStatus: 'OFFLINE' },
    });
    if (offlineMachines > 0) {
      bottlenecks.push({
        type: 'machines-offline',
        description: `${offlineMachines} machine(s) offline. Check connections.`,
        severity: 'medium',
      });
    }

    // Queue backlog
    const queuedJobs = await this.prisma.laserJob.count({
      where: { userId, status: 'QUEUED' },
    });
    if (queuedJobs > 5) {
      bottlenecks.push({
        type: 'queue-backlog',
        description: `${queuedJobs} jobs queued. Consider adding machines or optimizing batch sizes.`,
        severity: queuedJobs > 15 ? 'high' : 'medium',
      });
    }

    // Low material stock
    const lowStock = await this.prisma.material.count({
      where: { stockQty: { lte: this.prisma.material.fields.lowStockThreshold as any } },
    }).catch(() => 0);
    // Simplified: just check for any zero-stock materials
    const zeroStock = await this.prisma.material.count({ where: { stockQty: 0 } });
    if (zeroStock > 0) {
      bottlenecks.push({
        type: 'material-shortage',
        description: `${zeroStock} material(s) out of stock. Reorder to prevent production delays.`,
        severity: 'high',
      });
    }

    // Unpublished listings
    const draftListings = await this.prisma.marketplaceListing.count({
      where: { userId, status: 'DRAFT' },
    });
    if (draftListings > 3) {
      bottlenecks.push({
        type: 'unpublished-listings',
        description: `${draftListings} draft listings not published. Publish to start generating revenue.`,
        severity: 'low',
      });
    }

    return bottlenecks;
  }
}
