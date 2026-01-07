import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { computeHmacSha256Hex, secureCompareHex } from '../common/wp-hmac';

type BillingEvent = 'order.completed' | 'subscription.renewed' | 'subscription.cancelled';

type BillingWebhookDto = {
  eventId: string;
  event: BillingEvent;
  email: string;
  wpUserId: number;
  items: Array<{ productId: number; qty: number }>;
  timestamp: number;
};

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(private readonly prisma: PrismaService) {}

  async processWpBillingWebhook(params: {
    signature: string;
    rawBody: Buffer;
    body: BillingWebhookDto;
  }): Promise<void> {
    const webhookSecret = process.env.WP_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new BadRequestException('Webhook not configured');
    }

    const expected = computeHmacSha256Hex(params.rawBody, webhookSecret);
    const provided = params.signature.startsWith('sha256=')
      ? params.signature.slice('sha256='.length)
      : params.signature;
    if (!secureCompareHex(provided, expected)) {
      this.logger.warn('WP billing webhook signature mismatch');
      throw new BadRequestException('Invalid signature');
    }

    const eventId = params.body?.eventId;
    if (!eventId || typeof eventId !== 'string') {
      throw new BadRequestException('Missing eventId');
    }

    try {
      await (this.prisma as any).wpWebhookEvent.create({
        data: {
          eventId,
          payloadJson: params.body as any,
        },
      });
    } catch (err: any) {
      if (err?.code === 'P2002') {
        return;
      }
      this.logger.error('Failed to persist webhook event', err);
      throw new BadRequestException('Webhook processing failed');
    }

    const email = params.body.email;
    if (!email) {
      throw new BadRequestException('Missing email');
    }

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      this.logger.warn(`Webhook for unknown email: ${email}`);
      return;
    }

    await (this.prisma as any).user.update({
      where: { id: user.id },
      data: {
        wpUserId: String(params.body.wpUserId),
      },
    });

    if (params.body.event === 'subscription.cancelled') {
      await (this.prisma as any).user.update({
        where: { id: user.id },
        data: {
          plan: 'FREE',
          subscriptionStatus: 'CANCELLED',
          subscriptionType: null,
        },
      });
      return;
    }

    const productIds = this.getProductIdConfig();

    for (const item of params.body.items || []) {
      const productId = item.productId;
      const qty = item.qty ?? 1;

      if (productIds.topup100 && productId === productIds.topup100) {
        await this.addCredits(user.id, 100 * qty);
      } else if (productIds.topup200 && productId === productIds.topup200) {
        await this.addCredits(user.id, 200 * qty);
      } else if (productIds.topup500 && productId === productIds.topup500) {
        await this.addCredits(user.id, 500 * qty);
      } else if (productIds.proMonthly && productId === productIds.proMonthly) {
        await (this.prisma as any).user.update({
          where: { id: user.id },
          data: {
            plan: 'PRO',
            subscriptionType: 'MONTHLY',
            subscriptionStatus: 'ACTIVE',
          },
        });
      } else if (productIds.proAnnual && productId === productIds.proAnnual) {
        await (this.prisma as any).user.update({
          where: { id: user.id },
          data: {
            plan: 'PRO',
            subscriptionType: 'ANNUAL',
            subscriptionStatus: 'ACTIVE',
          },
        });
      }
    }

    if (params.body.event === 'subscription.renewed') {
      await (this.prisma as any).user.update({
        where: { id: user.id },
        data: { subscriptionStatus: 'ACTIVE' },
      });

      await this.ensureMonthlyCreditsAllowance(user.id, 200);
    }
  }

  private async ensureMonthlyCreditsAllowance(userId: string, allowance: number): Promise<void> {
    if (allowance <= 0) {
      return;
    }

    const entitlement = await this.prisma.userEntitlement.upsert({
      where: { userId },
      update: {},
      create: {
        userId,
        plan: 'ACTIVE',
        aiCreditsTotal: allowance,
        aiCreditsUsed: 0,
      },
    });

    const remaining = entitlement.aiCreditsTotal - entitlement.aiCreditsUsed;
    if (remaining >= allowance) {
      return;
    }

    await this.prisma.userEntitlement.update({
      where: { id: entitlement.id },
      data: {
        aiCreditsTotal: { increment: allowance - remaining },
      },
    });
  }

  private async addCredits(userId: string, credits: number): Promise<void> {
    if (credits <= 0) {
      return;
    }

    await this.prisma.userEntitlement.upsert({
      where: { userId },
      update: {
        aiCreditsTotal: { increment: credits },
        plan: 'ACTIVE',
      },
      create: {
        userId,
        plan: 'ACTIVE',
        aiCreditsTotal: credits,
        aiCreditsUsed: 0,
      },
    });
  }

  private parseOptionalInt(value: string | undefined): number | null {
    if (!value) {
      return null;
    }
    const n = Number(value);
    if (!Number.isFinite(n)) {
      return null;
    }
    return n;
  }

  private getProductIdConfig(): {
    proMonthly: number | null;
    proAnnual: number | null;
    topup100: number | null;
    topup200: number | null;
    topup500: number | null;
  } {
    return {
      proMonthly: this.parseOptionalInt(process.env.WP_PRODUCT_PRO_MONTHLY_ID),
      proAnnual: this.parseOptionalInt(process.env.WP_PRODUCT_PRO_ANNUAL_ID),
      topup100: this.parseOptionalInt(process.env.WP_PRODUCT_TOPUP_100_ID),
      topup200: this.parseOptionalInt(process.env.WP_PRODUCT_TOPUP_200_ID),
      topup500: this.parseOptionalInt(process.env.WP_PRODUCT_TOPUP_500_ID),
    };
  }
}
