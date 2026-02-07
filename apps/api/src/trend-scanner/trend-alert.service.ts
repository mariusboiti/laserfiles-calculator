import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TrendAlertService {
  private readonly logger = new Logger(TrendAlertService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Subscriptions ────────────────────────────────────────────────────────

  async getSubscription(userId: string) {
    return this.prisma.trendSubscription.findFirst({
      where: { userId, isActive: true },
      include: { alerts: { orderBy: { createdAt: 'desc' }, take: 20 } },
    });
  }

  async upsertSubscription(userId: string, data: {
    watchCategories?: string[];
    watchKeywords?: string[];
    minTrendStrength?: number;
    notifyInApp?: boolean;
    notifyEmail?: boolean;
  }) {
    const existing = await this.prisma.trendSubscription.findFirst({
      where: { userId, isActive: true },
    });

    if (existing) {
      return this.prisma.trendSubscription.update({
        where: { id: existing.id },
        data: {
          watchCategories: data.watchCategories as any[] ?? existing.watchCategories,
          watchKeywords: data.watchKeywords ?? existing.watchKeywords,
          minTrendStrength: data.minTrendStrength ?? existing.minTrendStrength,
          notifyInApp: data.notifyInApp ?? existing.notifyInApp,
          notifyEmail: data.notifyEmail ?? existing.notifyEmail,
        },
      });
    }

    return this.prisma.trendSubscription.create({
      data: {
        userId,
        watchCategories: (data.watchCategories ?? ['PRODUCT_TYPE', 'SEASONAL', 'NICHE']) as any[],
        watchKeywords: data.watchKeywords ?? [],
        minTrendStrength: data.minTrendStrength ?? 60,
        notifyInApp: data.notifyInApp ?? true,
        notifyEmail: data.notifyEmail ?? false,
      },
    });
  }

  async deactivateSubscription(userId: string) {
    const sub = await this.prisma.trendSubscription.findFirst({
      where: { userId, isActive: true },
    });
    if (!sub) return null;
    return this.prisma.trendSubscription.update({
      where: { id: sub.id },
      data: { isActive: false },
    });
  }

  // ─── Alerts ───────────────────────────────────────────────────────────────

  async getAlerts(userId: string, unreadOnly = false, take = 30) {
    return this.prisma.trendAlert.findMany({
      where: {
        userId,
        ...(unreadOnly ? { isRead: false } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take,
    });
  }

  async markAlertRead(alertId: string, userId: string) {
    return this.prisma.trendAlert.updateMany({
      where: { id: alertId, userId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllRead(userId: string) {
    return this.prisma.trendAlert.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.trendAlert.count({
      where: { userId, isRead: false },
    });
  }

  // ─── Generate alerts from a completed scan ───────────────────────────────

  async generateAlertsFromScan(userId: string, scanId: string) {
    const sub = await this.prisma.trendSubscription.findFirst({
      where: { userId, isActive: true },
    });
    if (!sub) return [];

    const opportunities = await this.prisma.trendOpportunity.findMany({
      where: { scanId, trendStrength: { gte: sub.minTrendStrength } },
      orderBy: { overallScore: 'desc' },
      take: 10,
    });

    const alerts: any[] = [];

    for (const opp of opportunities) {
      // Check category match
      const catMatch = sub.watchCategories.length === 0 ||
        sub.watchCategories.includes(opp.category);
      // Check keyword match
      const kwMatch = sub.watchKeywords.length === 0 ||
        sub.watchKeywords.some((k: string) => opp.keywords.some((ok: string) => ok.toLowerCase().includes(k.toLowerCase())));

      if (!catMatch && !kwMatch) continue;

      let alertType = 'NEW_TREND';
      if (opp.isGapOpportunity) alertType = 'GAP_FOUND';
      else if (opp.category === 'SEASONAL') alertType = 'SEASONAL_SPIKE';
      else if (opp.category === 'DESIGN_THEME' || opp.category === 'ENGRAVING_STYLE') alertType = 'EMERGING_STYLE';

      const alert = await this.prisma.trendAlert.create({
        data: {
          subscriptionId: sub.id,
          userId,
          alertType,
          title: opp.title,
          summary: `${opp.title} — Trend strength: ${opp.trendStrength}/100, Growth: ${opp.growthVelocity}%, Overall score: ${opp.overallScore}/100. ${opp.isGapOpportunity ? 'Market gap detected!' : ''}`,
          trendData: {
            opportunityId: opp.id,
            trendStrength: opp.trendStrength,
            growthVelocity: opp.growthVelocity,
            competitionDensity: opp.competitionDensity,
            profitPotential: opp.profitPotential,
            overallScore: opp.overallScore,
            category: opp.category,
            sources: opp.sources,
          },
        },
      });

      alerts.push(alert);
    }

    this.logger.log(`Generated ${alerts.length} alerts for user ${userId} from scan ${scanId}`);
    return alerts;
  }
}
