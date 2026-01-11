import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { WpSubscriptionController } from './wp-subscription.controller';
import { WebhooksService } from './webhooks.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [WebhooksController, WpSubscriptionController],
  providers: [WebhooksService],
})
export class WebhooksModule {}
