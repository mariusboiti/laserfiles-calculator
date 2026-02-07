import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { LaserMachinesController } from './laser-machines.controller';
import { LaserMachinesService } from './laser-machines.service';

@Module({
  imports: [PrismaModule],
  controllers: [LaserMachinesController],
  providers: [LaserMachinesService],
  exports: [LaserMachinesService],
})
export class LaserMachinesModule {}
