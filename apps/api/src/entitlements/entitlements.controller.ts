import {
  Body,
  Controller,
  Post,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
  Get,
  UseGuards,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { EntitlementsService } from './entitlements.service';
import type { WpEntitlementsChangedWebhook } from '@laser/shared/wp-plugin-contract';
import * as crypto from 'crypto';

import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

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
   * ✅ Studio UI endpoint: returns AI credits + status
   * Nginx route: /api-backend/entitlements/me -> API: GET /entitlements/me
   */
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiOperation({ summary: 'Get current user entitlements (AI credits + status) for Studio UI' })
  async me(@Req() req: any) {
    const userId = req?.user?.id ?? req?.user?.sub ?? req?.user?.userId;
    if (!userId) {
      throw new UnauthorizedException('Missing user id in token');
    }

    const data = await this.entitlementsService.getUiEntitlementsForUserId(String(userId));
    return { ok: true, data };
  }

  /**
   * Webhook endpoint to receive entitlements change notifications from WordPress.
   * Authentication: HMAC signature in X-Laserfiles-Signature header
   */
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive entitlements change webhook from WordPress' })
  async handleWebhook(
    @Body() body: EntitlementsWebhookDto,
    @Headers('x-laserfiles-signature') signature?: string,
  ): Promise<{ received: boolean; eventId: string }> {
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

    this.entitlementsService.clearCacheForWpUser(payload.wpUserId);

    if (payload.event === 'entitlements.updated') {
      this.logger.log(`User ${payload.wpUserId} plan changed: ${payload.previousPlan} -> ${payload.newPlan}`);
    } else if (payload.event === 'entitlements.expired' || payload.event === 'subscription.canceled') {
      this.logger.log(`User ${payload.wpUserId} subscription ended: ${payload.event}`);
    }

    return { received: true, eventId: payload.eventId };
  }

  private computeHmacSignature(payload: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }

  private secureCompare(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  }
}

