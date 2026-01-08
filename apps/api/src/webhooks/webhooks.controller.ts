import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { WebhooksService } from './webhooks.service';

type BillingEvent = 'order.completed' | 'subscription.renewed' | 'subscription.cancelled';

type BillingWebhookDto = {
  eventId: string;
  event: BillingEvent;
  email: string;
  wpUserId: number;
  items: Array<{ productId: number; qty: number }>;
  timestamp: number;
};

@Controller('webhooks/wp')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('billing')
  @HttpCode(HttpStatus.OK)
  async handleWpBilling(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('x-wp-signature') signature?: string,
  ): Promise<{ ok: true }> {
    if (!process.env.WP_WEBHOOK_SECRET) {
      this.logger.error('WP_WEBHOOK_SECRET not configured');
      throw new BadRequestException('Webhook not configured');
    }

    const rawBody = req.rawBody;
    if (!rawBody) {
      this.logger.error('Missing rawBody on request (body parser misconfigured)');
      throw new BadRequestException('Invalid webhook payload');
    }

    if (!signature) {
      this.logger.warn('Webhook received without X-WP-Signature');
      throw new BadRequestException('Missing signature');
    }

    let body: BillingWebhookDto;
    try {
      body = req.body as BillingWebhookDto;
    } catch {
      throw new BadRequestException('Invalid JSON body');
    }

    await this.webhooksService.processWpBillingWebhook({
      signature,
      rawBody,
      body,
    });

    return { ok: true };
  }
}
