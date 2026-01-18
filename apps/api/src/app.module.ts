import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CustomersModule } from './customers/customers.module';
import { MaterialsModule } from './materials/materials.module';
import { OrdersModule } from './orders/orders.module';
import { FilesModule } from './files/files.module';
import { TimeLogsModule } from './time-logs/time-logs.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { QuotesModule } from './quotes/quotes.module';
import { PricingModule } from './pricing/pricing.module';
import { TemplateCategoriesModule } from './template-categories/template-categories.module';
import { TemplatesModule } from './templates/templates.module';
import { TemplateProductsModule } from './template-products/template-products.module';
import { SalesChannelsModule } from './sales-channels/sales-channels.module';
import { ProductionModule } from './production/production.module';
import { OffcutsModule } from './offcuts/offcuts.module';
import { UsageModule } from './usage/usage.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { BillingModule } from './billing/billing.module';
import { EmailModule } from './email/email.module';
import { FeedbackModule } from './feedback/feedback.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    CustomersModule,
    MaterialsModule,
    OrdersModule,
    FilesModule,
    TimeLogsModule,
    AnalyticsModule,
    QuotesModule,
    PricingModule,
    TemplateCategoriesModule,
    TemplatesModule,
    TemplateProductsModule,
    SalesChannelsModule,
    ProductionModule,
    OffcutsModule,
    UsageModule,
    WebhooksModule,
    BillingModule,
    EmailModule,
    FeedbackModule,
  ],
})
export class AppModule {}
