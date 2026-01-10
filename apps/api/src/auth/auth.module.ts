import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PrismaModule } from '../prisma/prisma.module';
import { EntitlementsModule } from '../entitlements/entitlements.module';
import { WpSsoExchangeService } from './wp-sso-exchange.service';

@Module({
  imports: [PrismaModule, EntitlementsModule],
  controllers: [AuthController],
  providers: [AuthService, WpSsoExchangeService],
})
export class AuthModule {}
