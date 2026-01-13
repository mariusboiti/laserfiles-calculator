import { BadRequestException, ForbiddenException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';

type Interval = 'monthly' | 'annual';

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function getYearMonthKey(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

@Injectable()
export class BillingService implements OnModuleInit {
  private readonly logger = new Logger(BillingService.name);
  private stripe: Stripe | null = null;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    const key = process.env.STRIPE_SECRET_KEY;
    if (key) {
      this.stripe = new Stripe(key, { apiVersion: '2023-10-16', typescript: true });
    }

    const enabled = Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET);
    if (enabled) {
      const every6HoursMs = 6 * 60 * 60 * 1000;
      setInterval(() => {
        this.runCreditsGrantJob().catch((e) => {
          const msg = e instanceof Error ? e.message : String(e);
          this.logger.error(`credits_grant_job_failed msg=${msg}`);
        });
      }, every6HoursMs);
    }
  }

  private getStripeOrThrow(): Stripe {
    if (!this.stripe) {
      throw new BadRequestException(
        'Stripe is not configured. Set STRIPE_SECRET_KEY to enable billing.',
      );
    }
    return this.stripe;
  }

  private getStudioBaseUrl(): string {
    return process.env.STUDIO_BASE_URL || 'https://studio.laserfilespro.com';
  }

  private getSuccessUrl(): string {
    return (
      process.env.STRIPE_CHECKOUT_SUCCESS_URL ||
      `${this.getStudioBaseUrl().replace(/\/$/, '')}/billing/success?session_id={CHECKOUT_SESSION_ID}`
    );
  }

  private getCancelUrl(): string {
    return (
      process.env.STRIPE_CHECKOUT_CANCEL_URL ||
      `${this.getStudioBaseUrl().replace(/\/$/, '')}/billing/cancel`
    );
  }

  private parseCreditsMap(): Record<string, number> {
    const raw = process.env.WC_CREDITS_MAP;
    if (!raw) return {};
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed as Record<string, number>;
      return {};
    } catch {
      return {};
    }
  }

  private resolveTopupStripePriceId(wpProductId: number): string {
    const creditsMap = this.parseCreditsMap();
    const credits = creditsMap[String(wpProductId)];
    if (!credits) {
      throw new BadRequestException('Unknown top-up product.');
    }

    if (credits === 100) return process.env.STRIPE_PRICE_TOPUP_100 || '';
    if (credits === 200) return process.env.STRIPE_PRICE_TOPUP_200 || '';
    if (credits === 500) return process.env.STRIPE_PRICE_TOPUP_500 || '';

    throw new BadRequestException('Unsupported top-up credit amount.');
  }

  private resolvePlanStripePriceId(interval: Interval): { priceId: string; wpPlanProductId: string } {
    if (interval === 'monthly') {
      const priceId = process.env.STRIPE_PRICE_PRO_MONTHLY || '';
      const wpPlanProductId = process.env.WP_PRODUCT_PRO_MONTHLY_ID || '';
      return { priceId, wpPlanProductId };
    }

    const priceId = process.env.STRIPE_PRICE_PRO_ANNUAL || '';
    const wpPlanProductId = process.env.WP_PRODUCT_PRO_ANNUAL_ID || '';
    return { priceId, wpPlanProductId };
  }

  private async ensureStripeCustomerId(userId: string): Promise<{ customerId: string; email: string }>{
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } });
    const email = user?.email || `${userId}@studio.local`;

    const ent = await (this.prisma.userEntitlement as any).upsert({
      where: { userId },
      create: {
        userId,
        plan: 'INACTIVE',
        aiCreditsTotal: 0,
        aiCreditsUsed: 0,
      },
      update: {},
      select: { id: true, stripeCustomerId: true },
    });

    const stripe = this.getStripeOrThrow();

    if (ent.stripeCustomerId) {
      return { customerId: ent.stripeCustomerId, email };
    }

    const customer = await stripe.customers.create({
      email,
      name: user?.name || undefined,
      metadata: { userId },
    });

    await (this.prisma.userEntitlement as any).update({
      where: { userId },
      data: { stripeCustomerId: customer.id },
    });

    return { customerId: customer.id, email };
  }

  async createSubscriptionCheckoutSession(params: { userId: string; interval: Interval }): Promise<{ url: string }>{
    const stripe = this.getStripeOrThrow();

    const { priceId, wpPlanProductId } = this.resolvePlanStripePriceId(params.interval);
    if (!priceId) throw new BadRequestException('Missing Stripe price for selected plan interval.');
    if (!wpPlanProductId) throw new BadRequestException('Missing WP_PRODUCT_PRO_*_ID env for selected plan interval.');

    const entitlement = await (this.prisma.userEntitlement as any).upsert({
      where: { userId: params.userId },
      create: { userId: params.userId, plan: 'INACTIVE', aiCreditsTotal: 0, aiCreditsUsed: 0 },
      update: {},
    });

    const trialEligible = !entitlement.trialCreditsGrantedAt;
    const { customerId } = await this.ensureStripeCustomerId(params.userId);

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      payment_method_types: ['card'],
      payment_method_collection: 'always',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: this.getSuccessUrl(),
      cancel_url: this.getCancelUrl(),
      subscription_data: {
        ...(trialEligible ? { trial_period_days: 7 } : {}),
        metadata: {
          userId: params.userId,
          interval: params.interval,
          wpPlanProductId: String(wpPlanProductId),
        },
      },
      metadata: {
        userId: params.userId,
        interval: params.interval,
        wpPlanProductId: String(wpPlanProductId),
      },
    });

    if (!session.url) throw new BadRequestException('Stripe did not return a checkout URL.');

    this.logger.log(`stripe_checkout_subscription_created userId=${params.userId} interval=${params.interval} session=${session.id}`);

    return { url: session.url };
  }

  async createTopupCheckoutSession(params: { userId: string; wpProductId: number }): Promise<{ url: string }>{
    const stripe = this.getStripeOrThrow();

    const creditsMap = this.parseCreditsMap();
    const credits = creditsMap[String(params.wpProductId)];
    if (!credits) throw new BadRequestException('Unknown top-up product.');

    const entitlement = await (this.prisma.userEntitlement as any).findUnique({ where: { userId: params.userId } });
    const hasPaidSubscription = Boolean(entitlement?.plan === 'ACTIVE' && entitlement?.stripeSubscriptionId);
    if (!hasPaidSubscription) {
      throw new ForbiddenException('Top-ups are only available for users with an active paid plan.');
    }

    const priceId = this.resolveTopupStripePriceId(params.wpProductId);
    if (!priceId) throw new BadRequestException('Missing Stripe price for selected top-up pack.');

    const { customerId } = await this.ensureStripeCustomerId(params.userId);

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: this.getSuccessUrl(),
      cancel_url: this.getCancelUrl(),
      metadata: {
        userId: params.userId,
        wpProductId: String(params.wpProductId),
        credits: String(credits),
      },
    });

    if (!session.url) throw new BadRequestException('Stripe did not return a checkout URL.');

    this.logger.log(`stripe_checkout_topup_created userId=${params.userId} wpProductId=${params.wpProductId} credits=${credits} session=${session.id}`);

    return { url: session.url };
  }

  async handleStripeWebhook(params: { rawBody: Buffer | undefined; signature: string }): Promise<{ received: true }>{
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) {
      throw new BadRequestException('Stripe webhook is not configured. Set STRIPE_WEBHOOK_SECRET.');
    }

    const stripe = this.getStripeOrThrow();
    if (!params.rawBody) {
      throw new BadRequestException('Missing raw request body for webhook verification.');
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(params.rawBody, params.signature, secret);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`stripe_webhook_signature_failed msg=${msg}`);
      throw new BadRequestException('Webhook signature verification failed');
    }

    await this.processStripeEvent(event);
    return { received: true };
  }

  private async processStripeEvent(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'checkout.session.completed':
        await this.onCheckoutSessionCompleted(event.data.object as any);
        return;
      case 'invoice.paid':
        await this.onInvoicePaid(event.data.object as any);
        return;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.onSubscriptionUpsert(event.data.object as any);
        return;
      case 'customer.subscription.deleted':
        await this.onSubscriptionDeleted(event.data.object as any);
        return;
      default:
        this.logger.log(`stripe_webhook_ignored type=${event.type}`);
    }
  }

  private async onCheckoutSessionCompleted(session: Stripe.Checkout.Session): Promise<void> {
    const mode = session.mode;

    if (mode === 'subscription') {
      const subscriptionId = session.subscription as string | null;
      const customerId = session.customer as string | null;
      const userId = (session.metadata?.userId || '') as string;

      if (!userId || !subscriptionId || !customerId) {
        this.logger.warn(`stripe_checkout_completed_missing_fields mode=subscription session=${session.id}`);
        return;
      }

      const stripe = this.getStripeOrThrow();
      const sub = await stripe.subscriptions.retrieve(subscriptionId);

      const status = String(sub.status);
      const trialEnd = sub.trial_end ? new Date(sub.trial_end * 1000) : null;
      const plan: 'TRIALING' | 'ACTIVE' = status === 'trialing' ? 'TRIALING' : 'ACTIVE';

      const now = new Date();

      const updated = await (this.prisma.userEntitlement as any).upsert({
        where: { userId },
        create: {
          userId,
          plan,
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscriptionId,
          trialStartedAt: plan === 'TRIALING' ? now : null,
          trialEndsAt: trialEnd,
          aiCreditsTotal: 0,
          aiCreditsUsed: 0,
          creditsNextGrantAt: plan === 'TRIALING' ? trialEnd : addMonths(now, 1),
        },
        update: {
          plan,
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscriptionId,
          trialEndsAt: trialEnd,
          trialStartedAt: plan === 'TRIALING' ? (undefined as any) : undefined,
          creditsNextGrantAt: plan === 'TRIALING' ? trialEnd : addMonths(now, 1),
        },
      });

      if (!(updated as any).trialCreditsGrantedAt) {
        await (this.prisma.userEntitlement as any).update({
          where: { userId },
          data: {
            aiCreditsTotal: { increment: 25 },
            trialCreditsGrantedAt: now,
          },
        });
      }

      this.logger.log(
        `stripe_checkout_subscription_completed userId=${userId} subscription=${subscriptionId} status=${status} plan=${plan}`,
      );
      return;
    }

    if (mode === 'payment') {
      const userId = (session.metadata?.userId || '') as string;
      const credits = Number(session.metadata?.credits || 0);
      const wpProductId = session.metadata?.wpProductId || '';

      if (!userId || !credits) {
        this.logger.warn(`stripe_checkout_completed_missing_fields mode=payment session=${session.id}`);
        return;
      }

      const now = new Date();
      await (this.prisma.userEntitlement as any).upsert({
        where: { userId },
        create: {
          userId,
          plan: 'INACTIVE',
          aiCreditsTotal: credits,
          aiCreditsUsed: 0,
          trialCreditsGrantedAt: null,
          creditsNextGrantAt: null,
          creditsLastGrantAt: null,
          trialStartedAt: null,
          trialEndsAt: null,
        },
        update: {
          aiCreditsTotal: { increment: credits },
        },
      });

      this.logger.log(`stripe_checkout_topup_completed userId=${userId} wpProductId=${wpProductId} credits=${credits}`);
    }
  }

  private async onInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
    const subscriptionId = invoice.subscription as string | null;
    if (!subscriptionId) return;

    const entitlement = await (this.prisma.userEntitlement as any).findFirst({ where: { stripeSubscriptionId: subscriptionId } });
    if (!entitlement?.userId) return;

    const stripe = this.getStripeOrThrow();
    const sub = await stripe.subscriptions.retrieve(subscriptionId);

    const interval = sub.items.data[0]?.price?.recurring?.interval;
    if (interval !== 'month') {
      return;
    }

    const now = new Date();
    const monthKey = getYearMonthKey(now);
    const lastKey = (entitlement as any).creditsLastGrantAt ? getYearMonthKey((entitlement as any).creditsLastGrantAt) : null;
    if (lastKey === monthKey) {
      return;
    }

    const amount = Number((entitlement as any).creditsGrantMonthlyAmount ?? 200);
    await (this.prisma.userEntitlement as any).update({
      where: { userId: entitlement.userId },
      data: {
        aiCreditsTotal: { increment: amount },
        creditsLastGrantAt: now,
        creditsNextGrantAt: addMonths(now, 1),
        plan: 'ACTIVE',
      },
    });

    this.logger.log(`stripe_invoice_paid_grant userId=${entitlement.userId} subscription=${subscriptionId} amount=${amount}`);
  }

  private async onSubscriptionUpsert(sub: Stripe.Subscription): Promise<void> {
    const userId = (sub.metadata?.userId || '') as string;
    const subscriptionId = sub.id;
    const customerId = String(sub.customer);
    if (!userId) {
      return;
    }

    const status = String(sub.status);
    const now = new Date();
    const trialEnd = sub.trial_end ? new Date(sub.trial_end * 1000) : null;

    let plan: 'TRIALING' | 'ACTIVE' | 'CANCELED' | 'INACTIVE' = 'INACTIVE';
    if (status === 'trialing') plan = 'TRIALING';
    else if (status === 'active') plan = 'ACTIVE';
    else if (status === 'canceled') plan = 'CANCELED';
    else if (status === 'unpaid' || status === 'past_due') plan = 'INACTIVE';

    await (this.prisma.userEntitlement as any).upsert({
      where: { userId },
      create: {
        userId,
        plan: plan as any,
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        trialStartedAt: plan === 'TRIALING' ? now : null,
        trialEndsAt: trialEnd,
        aiCreditsTotal: 0,
        aiCreditsUsed: 0,
        creditsNextGrantAt: plan === 'TRIALING' ? trialEnd : addMonths(now, 1),
      },
      update: {
        plan: plan as any,
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        trialEndsAt: trialEnd,
        creditsNextGrantAt: plan === 'TRIALING' ? trialEnd : addMonths(now, 1),
      },
    });

    this.logger.log(`stripe_subscription_sync userId=${userId} subscription=${subscriptionId} status=${status} plan=${plan}`);
  }

  private async onSubscriptionDeleted(sub: Stripe.Subscription): Promise<void> {
    const subscriptionId = sub.id;
    const entitlement = await (this.prisma.userEntitlement as any).findFirst({
      where: { stripeSubscriptionId: subscriptionId },
    });
    if (!entitlement?.userId) return;

    await (this.prisma.userEntitlement as any).update({
      where: { userId: entitlement.userId },
      data: {
        plan: 'CANCELED',
      },
    });

    this.logger.log(`stripe_subscription_deleted userId=${entitlement.userId} subscription=${subscriptionId}`);
  }

  private async runCreditsGrantJob(): Promise<void> {
    const stripe = this.stripe;
    if (!stripe) return;

    const now = new Date();

    const trialToActivate = await (this.prisma.userEntitlement as any).findMany({
      where: {
        plan: 'TRIALING',
        trialEndsAt: { not: null, lt: now },
      },
      select: { userId: true },
    });

    for (const t of trialToActivate) {
      await (this.prisma.userEntitlement as any).update({
        where: { userId: t.userId },
        data: {
          plan: 'ACTIVE',
          creditsNextGrantAt: addMonths(now, 1),
        },
      });
    }

    const due = await (this.prisma.userEntitlement as any).findMany({
      where: {
        plan: 'ACTIVE',
        stripeSubscriptionId: { not: null },
        creditsNextGrantAt: { not: null, lte: now },
      },
      select: {
        userId: true,
        stripeSubscriptionId: true,
        creditsGrantMonthlyAmount: true,
        creditsLastGrantAt: true,
      },
      take: 200,
    });

    for (const e of due) {
      const subId = e.stripeSubscriptionId as string;
      const sub = await stripe.subscriptions.retrieve(subId).catch(() => null);
      const interval = sub?.items?.data?.[0]?.price?.recurring?.interval;

      if (interval !== 'year') {
        continue;
      }

      const monthKey = getYearMonthKey(now);
      const lastKey = (e as any).creditsLastGrantAt ? getYearMonthKey((e as any).creditsLastGrantAt) : null;
      if (lastKey === monthKey) {
        await (this.prisma.userEntitlement as any).update({
          where: { userId: e.userId },
          data: { creditsNextGrantAt: addMonths(now, 1) },
        });
        continue;
      }

      const amount = Number((e as any).creditsGrantMonthlyAmount ?? 200);
      await (this.prisma.userEntitlement as any).update({
        where: { userId: e.userId },
        data: {
          aiCreditsTotal: { increment: amount },
          creditsLastGrantAt: now,
          creditsNextGrantAt: addMonths(now, 1),
        },
      });

      this.logger.log(`annual_grant userId=${e.userId} subscription=${subId} amount=${amount}`);
    }
  }
}
