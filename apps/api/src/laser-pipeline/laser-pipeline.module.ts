import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { LaserMachinesModule } from '../laser-machines/laser-machines.module';
import { MarketplaceModule } from '../marketplace/marketplace.module';
import { LaserPipelineController } from './laser-pipeline.controller';
import { LaserPipelineService } from './laser-pipeline.service';

@Module({
  imports: [PrismaModule, LaserMachinesModule, MarketplaceModule],
  controllers: [LaserPipelineController],
  providers: [LaserPipelineService],
  exports: [LaserPipelineService],
})
export class LaserPipelineModule {}
