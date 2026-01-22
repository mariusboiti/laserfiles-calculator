import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { EntitlementsService } from '../entitlements/entitlements.service';
import { WpEntitlementWebhookGuard } from '../common/guards/wp-entitlement-webhook.guard';

@Controller('webhooks')
export class WpEntitlementWebhookController {
  constructor(private readonly entitlementsService: EntitlementsService) {}

  @Post('wp-entitlement')
  @HttpCode(HttpStatus.OK)
  @UseGuards(WpEntitlementWebhookGuard)
  async handleWpEntitlementWebhook(@Body() payload: any) {
    await this.entitlementsService.applyWpEntitlementPayload(payload);
    return { ok: true };
  }
}
