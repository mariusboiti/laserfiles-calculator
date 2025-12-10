import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { PrismaModule } from '../prisma/prisma.module';
import { SalesChannelsModule } from '../sales-channels/sales-channels.module';

@Module({
  imports: [PrismaModule, SalesChannelsModule],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
