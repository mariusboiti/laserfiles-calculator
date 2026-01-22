import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { WpSubscriptionController } from './wp-subscription.controller';
import { WpEntitlementWebhookController } from './wp-entitlement.controller';
import { WebhooksService } from './webhooks.service';
import { PrismaModule } from '../prisma/prisma.module';
import { EntitlementsModule } from '../entitlements/entitlements.module';

@Module({
  imports: [PrismaModule, EntitlementsModule],
  controllers: [WebhooksController, WpSubscriptionController, WpEntitlementWebhookController],
  providers: [WebhooksService],
})
export class WebhooksModule {}
