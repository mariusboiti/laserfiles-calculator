import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { BusinessIntelligenceController } from './business-intelligence.controller';
import { BusinessIntelligenceService } from './business-intelligence.service';

@Module({
  imports: [PrismaModule],
  controllers: [BusinessIntelligenceController],
  providers: [BusinessIntelligenceService],
  exports: [BusinessIntelligenceService],
})
export class BusinessIntelligenceModule {}
