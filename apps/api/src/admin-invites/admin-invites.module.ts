import { Module } from '@nestjs/common';
import { AdminInvitesController } from './admin-invites.controller';
import { AdminInvitesService } from './admin-invites.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AdminInvitesController],
  providers: [AdminInvitesService],
  exports: [AdminInvitesService],
})
export class AdminInvitesModule {}
