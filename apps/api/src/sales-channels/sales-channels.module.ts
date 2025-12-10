import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SalesChannelsConnectionsController } from './sales-channels.connections.controller';
import { SalesChannelsMappingsController } from './sales-channels.mappings.controller';
import { SalesChannelsExternalOrdersController } from './sales-channels.external-orders.controller';
import { SalesChannelsCsvController } from './sales-channels.csv.controller';
import { SalesChannelsConnectionsService } from './sales-channels.connections.service';
import { SalesChannelsMappingsService } from './sales-channels.mappings.service';
import { SalesChannelsExternalOrdersService } from './sales-channels.external-orders.service';
import { SalesChannelsStatusSyncService } from './sales-channels.status-sync.service';
import { WooCommerceConnector } from './connectors/woocommerce.connector';
import { EtsyConnector } from './connectors/etsy.connector';
import { CsvConnector } from './connectors/csv.connector';

@Module({
  imports: [PrismaModule],
  controllers: [
    SalesChannelsConnectionsController,
    SalesChannelsMappingsController,
    SalesChannelsExternalOrdersController,
    SalesChannelsCsvController,
  ],
  providers: [
    SalesChannelsConnectionsService,
    SalesChannelsMappingsService,
    SalesChannelsExternalOrdersService,
    SalesChannelsStatusSyncService,
    WooCommerceConnector,
    EtsyConnector,
    CsvConnector,
  ],
  exports: [SalesChannelsStatusSyncService],
})
export class SalesChannelsModule {}
