import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TemplateCategoriesController } from './template-categories.controller';
import { TemplateCategoriesService } from './template-categories.service';

@Module({
  imports: [PrismaModule],
  controllers: [TemplateCategoriesController],
  providers: [TemplateCategoriesService],
})
export class TemplateCategoriesModule {}
