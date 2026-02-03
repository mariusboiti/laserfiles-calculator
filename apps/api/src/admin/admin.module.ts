import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PrismaService } from '../prisma/prisma.service';
import { EntitlementsService } from '../entitlements/entitlements.service';

@Module({
  controllers: [AdminController],
  providers: [AdminService, PrismaService, EntitlementsService],
  exports: [AdminService],
})
export class AdminModule {}
