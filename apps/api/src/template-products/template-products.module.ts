import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TemplateProductsService } from './template-products.service';
import { TemplateProductsController } from './template-products.controller';

@Module({
  imports: [PrismaModule],
  controllers: [TemplateProductsController],
  providers: [TemplateProductsService],
})
export class TemplateProductsModule {}
