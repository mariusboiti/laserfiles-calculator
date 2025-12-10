import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { OffcutsController } from './offcuts.controller';
import { OffcutsBatchSuggestionsController } from './offcuts.batches.controller';
import { OffcutsService } from './offcuts.service';

@Module({
  imports: [PrismaModule],
  controllers: [OffcutsController, OffcutsBatchSuggestionsController],
  providers: [OffcutsService],
  exports: [OffcutsService],
})
export class OffcutsModule {}
