import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EntitlementsService } from '../entitlements/entitlements.service';
import { ListUsersQueryDto } from './dto/admin.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlementsService: EntitlementsService,
  ) {}

  async getStats() {
    const [
      totalUsers,
      usersByPlan,
      creditsAggregates,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.userEntitlement.groupBy({
        by: ['plan'],
        _count: { plan: true },
      }),
      this.prisma.userEntitlement.aggregate({
        _sum: {
          aiCreditsTotal: true,
          aiCreditsUsed: true,
        },
      }),
    ]);

    const planCounts: Record<string, number> = {
      ACTIVE: 0,
      TRIALING: 0,
      CANCELED: 0,
      INACTIVE: 0,
    };

    for (const row of usersByPlan) {
      planCounts[row.plan] = row._count.plan;
    }

    const totalCreditsGranted = creditsAggregates._sum.aiCreditsTotal ?? 0;
    const totalCreditsUsed = creditsAggregates._sum.aiCreditsUsed ?? 0;
    const totalCreditsRemaining = totalCreditsGranted - totalCreditsUsed;

    return {
      totalUsers,
      usersByPlan: planCounts,
      totalCreditsRemaining,
      totalCreditsUsed,
      totalCreditsGranted,
    };
  }

  async listUsers(query: ListUsersQueryDto) {
    const { search, plan, page = 1, pageSize = 25 } = query;
    const skip = (page - 1) * pageSize;

    const where: Prisma.UserWhereInput = {};

    if (search) {
      where.email = { contains: search, mode: 'insensitive' };
    }

    if (plan) {
      where.entitlement = { plan: plan as any };
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          updatedAt: true,
          entitlement: {
            select: {
              plan: true,
              aiCreditsTotal: true,
              aiCreditsUsed: true,
              updatedAt: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users: users.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
        plan: u.entitlement?.plan ?? 'INACTIVE',
        aiCreditsTotal: u.entitlement?.aiCreditsTotal ?? 0,
        aiCreditsUsed: u.entitlement?.aiCreditsUsed ?? 0,
        aiCreditsRemaining: (u.entitlement?.aiCreditsTotal ?? 0) - (u.entitlement?.aiCreditsUsed ?? 0),
        entitlementUpdatedAt: u.entitlement?.updatedAt ?? null,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getUserDetails(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        wpUserId: true,
        createdAt: true,
        updatedAt: true,
        entitlement: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    const auditLogs = await (this.prisma as any).adminAuditLog.findMany({
      where: { targetUserId: userId },
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: {
        adminUser: {
          select: { id: true, email: true, name: true },
        },
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        wpUserId: user.wpUserId,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      entitlement: user.entitlement
        ? {
            plan: user.entitlement.plan,
            aiCreditsTotal: user.entitlement.aiCreditsTotal,
            aiCreditsUsed: user.entitlement.aiCreditsUsed,
            aiCreditsRemaining: user.entitlement.aiCreditsTotal - user.entitlement.aiCreditsUsed,
            trialStartedAt: user.entitlement.trialStartedAt,
            trialEndsAt: user.entitlement.trialEndsAt,
            stripeCustomerId: user.entitlement.stripeCustomerId,
            stripeSubscriptionId: user.entitlement.stripeSubscriptionId,
            creditsNextGrantAt: user.entitlement.creditsNextGrantAt,
            updatedAt: user.entitlement.updatedAt,
          }
        : null,
      auditLogs: auditLogs.map((log: any) => ({
        id: log.id,
        action: log.action,
        reason: log.reason,
        deltaCredits: log.deltaCredits,
        payload: log.payload,
        createdAt: log.createdAt,
        adminUser: log.adminUser,
      })),
    };
  }

  async addCredits(
    adminUserId: string,
    targetUserId: string,
    amount: number,
    reason: string,
    ip?: string,
    userAgent?: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      include: { entitlement: true },
    });

    if (!user) {
      throw new NotFoundException(`User ${targetUserId} not found`);
    }

    const beforeTotal = user.entitlement?.aiCreditsTotal ?? 0;
    const beforeUsed = user.entitlement?.aiCreditsUsed ?? 0;

    // Atomically add credits
    const updatedEntitlement = await this.prisma.userEntitlement.upsert({
      where: { userId: targetUserId },
      update: {
        aiCreditsTotal: { increment: amount },
      },
      create: {
        userId: targetUserId,
        plan: 'INACTIVE',
        aiCreditsTotal: amount,
        aiCreditsUsed: 0,
      },
    });

    // Write audit log
    await (this.prisma as any).adminAuditLog.create({
      data: {
        adminUserId,
        targetUserId,
        action: 'ADD_CREDITS',
        reason,
        deltaCredits: amount,
        payload: {
          before: { total: beforeTotal, used: beforeUsed },
          after: { total: updatedEntitlement.aiCreditsTotal, used: updatedEntitlement.aiCreditsUsed },
        },
        ip,
        userAgent,
      },
    });

    this.logger.log(
      `Admin ${adminUserId} added ${amount} credits to user ${targetUserId}. Reason: ${reason}`,
    );

    return {
      success: true,
      entitlement: {
        plan: updatedEntitlement.plan,
        aiCreditsTotal: updatedEntitlement.aiCreditsTotal,
        aiCreditsUsed: updatedEntitlement.aiCreditsUsed,
        aiCreditsRemaining: updatedEntitlement.aiCreditsTotal - updatedEntitlement.aiCreditsUsed,
      },
    };
  }

  async forceSyncFromWp(
    adminUserId: string,
    targetUserId: string,
    reason: string,
    ip?: string,
    userAgent?: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      include: { entitlement: true },
    });

    if (!user) {
      throw new NotFoundException(`User ${targetUserId} not found`);
    }

    const beforeSnapshot = user.entitlement
      ? {
          plan: user.entitlement.plan,
          aiCreditsTotal: user.entitlement.aiCreditsTotal,
          aiCreditsUsed: user.entitlement.aiCreditsUsed,
        }
      : null;

    // Call the existing sync service
    await this.entitlementsService.syncFromWordPressByEmail(user.email, `admin-force-sync-${targetUserId}`);

    // Fetch updated entitlement
    const updatedUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      include: { entitlement: true },
    });

    const afterSnapshot = updatedUser?.entitlement
      ? {
          plan: updatedUser.entitlement.plan,
          aiCreditsTotal: updatedUser.entitlement.aiCreditsTotal,
          aiCreditsUsed: updatedUser.entitlement.aiCreditsUsed,
        }
      : null;

    // Write audit log
    await (this.prisma as any).adminAuditLog.create({
      data: {
        adminUserId,
        targetUserId,
        action: 'FORCE_SYNC_WP',
        reason,
        payload: {
          before: beforeSnapshot,
          after: afterSnapshot,
        },
        ip,
        userAgent,
      },
    });

    this.logger.log(
      `Admin ${adminUserId} force synced user ${targetUserId} from WordPress. Reason: ${reason}`,
    );

    return {
      success: true,
      user: {
        id: updatedUser?.id,
        email: updatedUser?.email,
        name: updatedUser?.name,
      },
      entitlement: afterSnapshot,
    };
  }

  async updateEntitlementPlan(
    adminUserId: string,
    targetUserId: string,
    plan: string,
    trialEndsAt: string | undefined,
    reason: string,
    ip?: string,
    userAgent?: string,
  ) {
    const normalizedPlan = String(plan || '').trim().toUpperCase();
    const allowed = ['INACTIVE', 'TRIALING', 'ACTIVE', 'CANCELED'];
    if (!allowed.includes(normalizedPlan)) {
      throw new BadRequestException(`Invalid plan ${plan}`);
    }

    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      include: { entitlement: true },
    });

    if (!user) {
      throw new NotFoundException(`User ${targetUserId} not found`);
    }

    const beforeSnapshot = user.entitlement
      ? {
          plan: user.entitlement.plan,
          trialStartedAt: user.entitlement.trialStartedAt,
          trialEndsAt: user.entitlement.trialEndsAt,
          aiCreditsTotal: user.entitlement.aiCreditsTotal,
          aiCreditsUsed: user.entitlement.aiCreditsUsed,
        }
      : null;

    const nextTrialEndsAt = (() => {
      if (normalizedPlan !== 'TRIALING') return null;
      if (trialEndsAt) {
        const d = new Date(trialEndsAt);
        if (!Number.isNaN(d.getTime())) return d;
      }
      if (user.entitlement?.trialEndsAt) return user.entitlement.trialEndsAt;
      return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    })();

    const nextTrialStartedAt = (() => {
      if (normalizedPlan !== 'TRIALING') return null;
      return user.entitlement?.trialStartedAt ?? new Date();
    })();

    const updatedEntitlement = await this.prisma.userEntitlement.upsert({
      where: { userId: targetUserId },
      update: {
        plan: normalizedPlan as any,
        trialStartedAt: nextTrialStartedAt,
        trialEndsAt: nextTrialEndsAt,
      },
      create: {
        userId: targetUserId,
        plan: normalizedPlan as any,
        trialStartedAt: nextTrialStartedAt,
        trialEndsAt: nextTrialEndsAt,
        aiCreditsTotal: 0,
        aiCreditsUsed: 0,
      },
    });

    const afterSnapshot = {
      plan: updatedEntitlement.plan,
      trialStartedAt: updatedEntitlement.trialStartedAt,
      trialEndsAt: updatedEntitlement.trialEndsAt,
      aiCreditsTotal: updatedEntitlement.aiCreditsTotal,
      aiCreditsUsed: updatedEntitlement.aiCreditsUsed,
    };

    await (this.prisma as any).adminAuditLog.create({
      data: {
        adminUserId,
        targetUserId,
        action: 'UPDATE_USER',
        reason,
        payload: {
          type: 'ENTITLEMENT_PLAN',
          before: beforeSnapshot,
          after: afterSnapshot,
        },
        ip,
        userAgent,
      },
    });

    this.logger.log(
      `Admin ${adminUserId} updated entitlement plan for user ${targetUserId} to ${normalizedPlan}. Reason: ${reason}`,
    );

    return {
      success: true,
      entitlement: {
        plan: updatedEntitlement.plan,
        trialStartedAt: updatedEntitlement.trialStartedAt,
        trialEndsAt: updatedEntitlement.trialEndsAt,
        aiCreditsTotal: updatedEntitlement.aiCreditsTotal,
        aiCreditsUsed: updatedEntitlement.aiCreditsUsed,
        aiCreditsRemaining: updatedEntitlement.aiCreditsTotal - updatedEntitlement.aiCreditsUsed,
      },
    };
  }
}
