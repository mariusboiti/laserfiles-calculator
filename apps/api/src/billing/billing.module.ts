import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { BillingController } from './billing.controller';
import { StripeWebhookController } from './stripe.webhook.controller';
import { BillingService } from './billing.service';

@Module({
  imports: [PrismaModule],
  controllers: [BillingController, StripeWebhookController],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}
