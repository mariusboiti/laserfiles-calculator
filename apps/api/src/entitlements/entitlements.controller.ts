import { Body, Controller, Post, Headers, HttpCode, HttpStatus, Logger, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { EntitlementsService } from './entitlements.service';
import type { WpEntitlementsChangedWebhook } from '@laser/shared/wp-plugin-contract';
import * as crypto from 'crypto';

class EntitlementsWebhookDto {
  event!: string;
  wpUserId!: string;
  newPlan?: string;
  previousPlan?: string;
  occurredAt!: string;
  eventId!: string;
}

@ApiTags('entitlements')
@Controller('entitlements')
export class EntitlementsController {
  private readonly logger = new Logger(EntitlementsController.name);

  constructor(private readonly entitlementsService: EntitlementsService) {}

  /**
   * Webhook endpoint to receive entitlements change notifications from WordPress.
   * WordPress calls this when a user's plan changes (upgrade, downgrade, cancellation, etc.)
   *
   * Authentication: HMAC signature in X-Laserfiles-Signature header
   */
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive entitlements change webhook from WordPress' })
  async handleWebhook(
    @Body() body: EntitlementsWebhookDto,
    @Headers('x-laserfiles-signature') signature?: string,
  ): Promise<{ received: boolean; eventId: string }> {
    // Verify webhook signature if secret is configured
    const webhookSecret = process.env.WP_PLUGIN_WEBHOOK_SECRET;
    if (webhookSecret) {
      if (!signature) {
        this.logger.warn('Webhook received without signature');
        throw new BadRequestException('Missing webhook signature');
      }

      const expectedSignature = this.computeHmacSignature(JSON.stringify(body), webhookSecret);
      if (!this.secureCompare(signature, expectedSignature)) {
        this.logger.warn('Webhook signature mismatch');
        throw new BadRequestException('Invalid webhook signature');
      }
    }

    const payload = body as WpEntitlementsChangedWebhook;

    this.logger.log(
      `Received entitlements webhook: event=${payload.event} wpUserId=${payload.wpUserId} eventId=${payload.eventId}`,
    );

    // Invalidate cached entitlements for this user
    this.entitlementsService.clearCacheForWpUser(payload.wpUserId);

    // Log the event for debugging
    if (payload.event === 'entitlements.updated') {
      this.logger.log(
        `User ${payload.wpUserId} plan changed: ${payload.previousPlan} -> ${payload.newPlan}`,
      );
    } else if (payload.event === 'entitlements.expired' || payload.event === 'subscription.canceled') {
      this.logger.log(`User ${payload.wpUserId} subscription ended: ${payload.event}`);
    }

    return {
      received: true,
      eventId: payload.eventId,
    };
  }

  /**
   * Compute HMAC-SHA256 signature for webhook verification
   */
  private computeHmacSignature(payload: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }

  /**
   * Constant-time string comparison to prevent timing attacks
   */
  private secureCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  }
}
