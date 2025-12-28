import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsageService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Check and log export for a user
   * FREE plan: 3 exports per day per toolKey
   * PRO/BUSINESS: always allowed
   */
  async trackExport(userId: string, toolKey: string): Promise<{
    allowed: boolean;
    remaining: number;
    limit: number;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // PRO and BUSINESS plans: always allowed
    if (user.plan === 'PRO' || user.plan === 'BUSINESS') {
      // Create usage event
      await this.prisma.usageEvent.create({
        data: {
          userId,
          toolKey,
          action: 'EXPORT',
        },
      });

      return {
        allowed: true,
        remaining: 999, // Effectively unlimited
        limit: 999,
      };
    }

    // FREE plan: 3 exports per day per toolKey
    const limit = 3;
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const count = await this.prisma.usageEvent.count({
      where: {
        userId,
        toolKey,
        action: 'EXPORT',
        createdAt: {
          gte: startOfDay,
        },
      },
    });

    // Check if under limit
    if (count < limit) {
      // Create usage event
      await this.prisma.usageEvent.create({
        data: {
          userId,
          toolKey,
          action: 'EXPORT',
        },
      });

      return {
        allowed: true,
        remaining: limit - count - 1,
        limit,
      };
    }

    // Limit exceeded
    return {
      allowed: false,
      remaining: 0,
      limit,
    };
  }
}
