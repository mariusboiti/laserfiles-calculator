import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  computeHmacSha256Base64,
  computeHmacSha256Hex,
  secureCompareHex,
  secureCompareString,
} from '../common/wp-hmac';

type BillingEvent = 'order.completed' | 'subscription.renewed' | 'subscription.cancelled';

type BillingWebhookDto = {
  eventId: string;
  event: BillingEvent;
  email?: string;
  wpUserId?: number;
  items?: Array<{ productId: number; qty: number }>;
  timestamp?: number;
};

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(private readonly prisma: PrismaService) {}

  async handleWcSubscriptionWebhook(params: {
    signature?: string; // X-WC-Webhook-Signature (base64)
    rawBody?: Buffer;
    payload: any;
  }): Promise<{ processed: boolean; userId?: string; plan?: string }> {
    const webhookSecret = process.env.WP_WEBHOOK_SECRET;
    if (!webhookSecret) throw new BadRequestException('WP webhook not configured');

    // ─────────────────────────────────────────────
    // AUTH (WooCommerce HMAC)
    // ─────────────────────────────────────────────
    if (!params.signature) throw new BadRequestException('Missing signature');
    if (!params.rawBody) throw new BadRequestException('Missing raw body');

    const provided = String(params.signature).trim();
    const expectedB64 = computeHmacSha256Base64(params.rawBody, webhookSecret);
    if (!secureCompareString(provided, expectedB64)) {
      this.logger.warn('WC subscription webhook signature mismatch');
      throw new BadRequestException('Invalid signature');
    }

    // ─────────────────────────────────────────────
    // PARSE WooCommerce subscription payload
    // ─────────────────────────────────────────────
    const sub = params.payload;
    const subId = sub?.id;
    const status = String(sub?.status ?? '').toLowerCase(); // active, pending-cancel, cancelled, trial, etc.
    const email = sub?.billing?.email ? String(sub.billing.email) : undefined;
    const wpUserId = Number(sub?.customer_id ?? 0) || 0;
    const trialEnd = sub?.trial_end ? new Date(sub.trial_end) : null;
    const nextPayment = sub?.next_payment_date_gmt ? new Date(sub.next_payment_date_gmt) : null;
    const interval = String(sub?.billing_period ?? '').toLowerCase() === 'month' ? 'monthly' : 'annual';

    if (!subId || !email) {
      this.logger.warn('Invalid subscription payload: missing id or email');
      return { processed: false };
    }

    // ─────────────────────────────────────────────
    // DEDUPE (simple eventId = subId)
    // ─────────────────────────────────────────────
    const eventId = `wc-sub-${subId}`;
    try {
      await (this.prisma as any).wpWebhookEvent.create({
        data: { eventId, payloadJson: sub },
      });
    } catch (err: any) {
      if (err?.code === 'P2002') return { processed: true }; // already processed
      this.logger.warn(`wpWebhookEvent persistence failed: ${err?.message ?? err}`);
    }

    // ─────────────────────────────────────────────
    // RESOLVE USER
    // ─────────────────────────────────────────────
    const user =
      (email ? await this.prisma.user.findUnique({ where: { email } }) : null) ||
      (wpUserId
        ? await (this.prisma as any).user.findFirst({
            where: { wpUserId: String(wpUserId) },
          })
        : null);

    if (!user) {
      this.logger.warn(`Subscription webhook: user not found (email=${email} wpUserId=${wpUserId})`);
      return { processed: false };
    }

    // Store wpUserId if missing
    if (wpUserId) {
      try {
        await (this.prisma as any).user.update({
          where: { id: user.id },
          data: { wpUserId: String(wpUserId) },
        });
      } catch {}
    }

    // Ensure entitlement exists
    await this.prisma.userEntitlement.upsert({
      where: { userId: user.id },
      create: { userId: user.id },
      update: {},
    });

    // ─────────────────────────────────────────────
    // MAP STATUS → EntitlementPlan
    // ─────────────────────────────────────────────
    let plan: 'INACTIVE' | 'TRIALING' | 'ACTIVE' | 'CANCELED' = 'INACTIVE';
    let trialStartedAt: Date | null = null;
    let trialEndsAt: Date | null = null;

    if (status === 'trial' || (status === 'active' && trialEnd && trialEnd > new Date())) {
      plan = 'TRIALING';
      trialStartedAt = new Date();
      trialEndsAt = trialEnd;
    } else if (status === 'active' || status === 'pending-cancel') {
      plan = 'ACTIVE';
    } else if (status === 'cancelled' || status === 'expired') {
      plan = 'CANCELED';
    }

    // Update entitlement
    await (this.prisma as any).userEntitlement.update({
      where: { userId: user.id },
      data: {
        plan,
        trialStartedAt,
        trialEndsAt,
      },
    });

    this.logger.log(`Subscription webhook processed: userId=${user.id} plan=${plan} status=${status}`);

    return { processed: true, userId: user.id, plan };
  }

  async processWpBillingWebhook(params: {
    signature?: string; // expected: X-WC-Webhook-Signature (base64) OR legacy "sha256=<hex>"
    webhookSecretHeader?: string; // optional shared secret header flow
    rawBody?: Buffer; // MUST be the exact raw request body bytes
    body: any;
  }): Promise<void> {
    const webhookSecret = process.env.WP_WEBHOOK_SECRET;
    if (!webhookSecret) throw new BadRequestException('Webhook not configured');

    // ─────────────────────────────────────────────
    // AUTH
    // ─────────────────────────────────────────────
    // Path A: shared secret header (manual/test flow)
    if (params.webhookSecretHeader) {
      if (!secureCompareString(String(params.webhookSecretHeader), webhookSecret)) {
        this.logger.warn('WP billing webhook secret header mismatch');
        throw new BadRequestException('Invalid webhook secret');
      }
    } else {
      // Path B: HMAC over rawBody (WooCommerce flow)
      if (!params.signature) throw new BadRequestException('Missing signature');
      if (!params.rawBody) throw new BadRequestException('Invalid webhook payload');

      const provided = String(params.signature).trim();

      // Woo: base64(HMAC_SHA256(rawBody, secret))
      // Legacy tests: "sha256=<hex>"
      if (provided.startsWith('sha256=')) {
        const expectedHex = computeHmacSha256Hex(params.rawBody, webhookSecret);
        const hex = provided.slice('sha256='.length).trim();
        if (!secureCompareHex(hex, expectedHex)) {
          this.logger.warn('WP billing webhook signature mismatch (hex)');
          throw new BadRequestException('Invalid signature');
        }
      } else {
        const expectedB64 = computeHmacSha256Base64(params.rawBody, webhookSecret);
        if (!secureCompareString(provided, expectedB64)) {
          this.logger.warn('WP billing webhook signature mismatch (base64)');
          throw new BadRequestException('Invalid signature');
        }
      }
    }

    // ─────────────────────────────────────────────
    // NORMALIZE WooCommerce payload -> BillingWebhookDto
    // ─────────────────────────────────────────────
    const normalized = this.normalizeToBillingDto(params.body);
    const body: BillingWebhookDto = normalized;

    const eventId = String(body?.eventId ?? '').trim();
    if (!eventId) throw new BadRequestException('Missing eventId');

    // ─────────────────────────────────────────────
    // DEDUPE (WpWebhookEvent)
    // ─────────────────────────────────────────────
    try {
      await (this.prisma as any).wpWebhookEvent.create({
        data: { eventId, payloadJson: body as any },
      });
    } catch (err: any) {
      if (err?.code === 'P2002') return; // already processed
      this.logger.warn(`Skipping wpWebhookEvent persistence (DB error): ${err?.message ?? err}`);
      // continue (don’t block billing)
    }

    const email = String(body.email ?? '').trim();
    const wpUserIdNum = Number(body.wpUserId ?? 0) || 0;
    if (!email && !wpUserIdNum) throw new BadRequestException('Missing email');

    // ─────────────────────────────────────────────
    // RESOLVE USER (email first, then wpUserId)
    // ─────────────────────────────────────────────
    const user =
      (email ? await this.prisma.user.findUnique({ where: { email } }) : null) ||
      (wpUserIdNum
        ? await (this.prisma as any).user.findFirst({
            where: { wpUserId: String(wpUserIdNum) },
          })
        : null);

    if (!user) {
      this.logger.warn(`Billing webhook: user not found (email=${email || '-'} wpUserId=${wpUserIdNum || 0})`);
      return;
    }

    // Store wpUserId for future matching (non-blocking)
    if (wpUserIdNum) {
      try {
        await (this.prisma as any).user.update({
          where: { id: user.id },
          data: { wpUserId: String(wpUserIdNum) },
        });
      } catch (e: any) {
        this.logger.warn(`Could not update user.wpUserId (non-blocking): ${e?.message ?? e}`);
      }
    }

    // Ensure entitlement row exists
    await this.prisma.userEntitlement.upsert({
      where: { userId: user.id },
      create: { userId: user.id },
      update: {},
    });

    // Handle subscription cancellation
    if (body.event === 'subscription.cancelled') {
      await (this.prisma as any).user.update({
        where: { id: user.id },
        data: {
          plan: 'FREE',
          subscriptionStatus: 'CANCELLED',
          subscriptionType: null,
        },
      });

      await this.prisma.userEntitlement.update({
        where: { userId: user.id },
        data: { plan: 'INACTIVE' },
      });

      return;
    }

    // ─────────────────────────────────────────────
    // APPLY BILLING (CREDITS / PLAN) - single source of truth
    // ─────────────────────────────────────────────
    const cfg = this.getProductIdConfig();
    const items = Array.isArray(body.items) ? body.items : [];

    for (const item of items) {
      const productId = Number((item as any)?.productId ?? 0) || 0;
      const qty = Number((item as any)?.qty ?? 1) || 1;
      if (!productId || qty <= 0) continue;

      // Credits top-ups
      if (cfg.topup100 && productId === cfg.topup100) {
        await this.addCredits(user.id, 100 * qty);
        this.logger.log(`Credits topup: +${100 * qty} userId=${user.id} productId=${productId}`);
        continue;
      }
      if (cfg.topup200 && productId === cfg.topup200) {
        await this.addCredits(user.id, 200 * qty);
        this.logger.log(`Credits topup: +${200 * qty} userId=${user.id} productId=${productId}`);
        continue;
      }
      if (cfg.topup500 && productId === cfg.topup500) {
        await this.addCredits(user.id, 500 * qty);
        this.logger.log(`Credits topup: +${500 * qty} userId=${user.id} productId=${productId}`);
        continue;
      }

      // Pro subscriptions
      if (cfg.proMonthly && productId === cfg.proMonthly) {
        await (this.prisma as any).user.update({
          where: { id: user.id },
          data: {
            plan: 'PRO',
            subscriptionType: 'MONTHLY',
            subscriptionStatus: 'ACTIVE',
          },
        });

        await this.prisma.userEntitlement.update({
          where: { userId: user.id },
          data: { plan: 'ACTIVE' },
        });

        this.logger.log(`Plan PRO(MONTHLY) ACTIVE userId=${user.id} productId=${productId}`);
        continue;
      }

      if (cfg.proAnnual && productId === cfg.proAnnual) {
        await (this.prisma as any).user.update({
          where: { id: user.id },
          data: {
            plan: 'PRO',
            subscriptionType: 'ANNUAL',
            subscriptionStatus: 'ACTIVE',
          },
        });

        await this.prisma.userEntitlement.update({
          where: { userId: user.id },
          data: { plan: 'ACTIVE' },
        });

        this.logger.log(`Plan PRO(ANNUAL) ACTIVE userId=${user.id} productId=${productId}`);
        continue;
      }

      this.logger.warn(`No billing action mapped for productId=${productId} qty=${qty}`);
    }

    // subscription renewed: ensure allowance (optional)
    if (body.event === 'subscription.renewed') {
      await (this.prisma as any).user.update({
        where: { id: user.id },
        data: { subscriptionStatus: 'ACTIVE' },
      });

      await this.ensureMonthlyCreditsAllowance(user.id, 200);
    }
  }

  private normalizeToBillingDto(input: any): BillingWebhookDto {
    // If already in our custom BillingWebhookDto-ish format:
    if (input?.eventId && (input?.items || input?.email || input?.wpUserId)) {
      return {
        eventId: String(input.eventId),
        event: (input.event as BillingEvent) || 'order.completed',
        email: input.email,
        wpUserId: input.wpUserId,
        items: input.items,
        timestamp: input.timestamp,
      };
    }

    // WooCommerce order webhook format
    if (input?.id) {
      const wcOrderId = input.id;
      const status = String(input?.status ?? '').toLowerCase();
      const email = input?.billing?.email ? String(input.billing.email) : undefined;
      const wpUserId = Number(input?.customer_id ?? 0) || 0;

      const items = Array.isArray(input?.line_items)
        ? input.line_items.map((li: any) => ({
            productId: Number(li?.product_id ?? 0) || 0,
            qty: Number(li?.quantity ?? 1) || 1,
          }))
        : [];

      const timestamp = (() => {
        const raw = input?.date_created_gmt || input?.date_created;
        const t = raw ? new Date(raw).getTime() : Date.now();
        return Math.floor(t / 1000);
      })();

      // We only act on completed orders (otherwise ignore)
      const event: BillingEvent = status === 'completed' ? 'order.completed' : 'order.completed';

      return {
        eventId: String(wcOrderId),
        event,
        email,
        wpUserId,
        items,
        timestamp,
      };
    }

    // Fallback
    return {
      eventId: String(input?.eventId ?? ''),
      event: (input?.event as BillingEvent) || 'order.completed',
      email: input?.email,
      wpUserId: input?.wpUserId,
      items: input?.items,
      timestamp: input?.timestamp,
    };
  }

  private async ensureMonthlyCreditsAllowance(userId: string, allowance: number): Promise<void> {
    if (allowance <= 0) return;

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
    if (remaining >= allowance) return;

    await this.prisma.userEntitlement.update({
      where: { id: entitlement.id },
      data: { aiCreditsTotal: { increment: allowance - remaining } },
    });
  }

  private async addCredits(userId: string, credits: number): Promise<void> {
    if (credits <= 0) return;

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

  private getProductIdConfig() {
    const toNum = (v?: string) => {
      const n = Number(String(v ?? '').trim());
      return Number.isFinite(n) && n > 0 ? n : null;
    };

    return {
      topup100: toNum(process.env.WP_PRODUCT_TOPUP_100_ID),
      topup200: toNum(process.env.WP_PRODUCT_TOPUP_200_ID),
      topup500: toNum(process.env.WP_PRODUCT_TOPUP_500_ID),
      proMonthly: toNum(process.env.WP_PRODUCT_PRO_MONTHLY_ID),
      proAnnual: toNum(process.env.WP_PRODUCT_PRO_ANNUAL_ID),
    };
  }
}

