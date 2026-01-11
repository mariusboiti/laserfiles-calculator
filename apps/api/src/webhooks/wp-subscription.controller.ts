import { Body, Controller, Headers, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { WebhooksService } from './webhooks.service';

@ApiTags('webhooks')
@Controller('webhooks/wp')
export class WpSubscriptionController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('subscription')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'WooCommerce subscription webhook (trial/active/canceled)' })
  async subscriptionWebhook(
    @Req() req: any,
    @Body() payload: any,
    @Headers('x-wc-webhook-signature') signature?: string,
  ) {
    const result = await this.webhooksService.handleWcSubscriptionWebhook({
      payload,
      signature: signature || '',
      rawBody: req.rawBody,
    });
    return { ok: true, data: result };
  }
}
