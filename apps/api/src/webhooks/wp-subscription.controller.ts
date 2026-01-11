import { Body, Controller, Get, Headers, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { WebhooksService } from './webhooks.service';

@ApiTags('webhooks')
@Controller('webhooks/wp')
export class WpSubscriptionController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Get('subscription')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Health check for WooCommerce webhook Delivery URL validation' })
  async subscriptionWebhookHealth() {
    return { ok: true };
  }

  @Post('subscription')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'WooCommerce subscription webhook (trial/active/canceled)' })
  async subscriptionWebhook(
    @Req() req: any,
    @Body() payload: any,
    @Headers('x-wc-webhook-signature') signature?: string,
  ) {
    // WooCommerce validates Delivery URL on save and may send a POST without signature.
    // Treat it as a health check; real webhooks will always include the signature header.
    if (!signature) {
      return { ok: true, data: { processed: false } };
    }

    const result = await this.webhooksService.handleWcSubscriptionWebhook({
      payload,
      signature: signature || '',
      rawBody: req.rawBody,
    });
    return { ok: true, data: result };
  }
}
