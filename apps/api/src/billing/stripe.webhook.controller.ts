import { Body, Controller, Headers, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { BillingService } from './billing.service';

@ApiTags('billing')
@Controller('billing/stripe')
export class StripeWebhookController {
  constructor(private readonly billingService: BillingService) {}

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stripe webhook (raw body signature verification)' })
  async webhook(
    @Req() req: any,
    @Body() _body: any,
    @Headers('stripe-signature') signature?: string,
  ) {
    const rawBody: Buffer | undefined = req?.rawBody;
    const result = await this.billingService.handleStripeWebhook({
      rawBody,
      signature: signature || '',
    });
    return { ok: true, data: result };
  }
}
