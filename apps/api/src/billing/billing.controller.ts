import { Body, Controller, ForbiddenException, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsIn, IsInt, Min } from 'class-validator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { BillingService } from './billing.service';

class CheckoutSubscriptionDto {
  @IsIn(['monthly', 'annual'])
  interval!: 'monthly' | 'annual';
}

class CheckoutTopupDto {
  @IsInt()
  @Min(1)
  wpProductId!: number;
}

@ApiTags('billing')
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Post('checkout/subscription')
  @ApiOperation({ summary: 'Create Stripe Checkout Session for subscription (monthly/annual)' })
  async checkoutSubscription(@Req() req: any, @Body() dto: CheckoutSubscriptionDto) {
    const userId = req?.user?.id ?? req?.user?.sub ?? req?.user?.userId;
    const result = await this.billingService.createSubscriptionCheckoutSession({
      userId: String(userId),
      interval: dto.interval,
    });
    return { ok: true, data: result };
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Post('checkout/topup')
  @ApiOperation({ summary: 'Create Stripe Checkout Session for credits top-up (requires active paid plan)' })
  async checkoutTopup(@Req() req: any, @Body() dto: CheckoutTopupDto) {
    const userId = req?.user?.id ?? req?.user?.sub ?? req?.user?.userId;
    if (!userId) throw new ForbiddenException('Unauthorized');

    const result = await this.billingService.createTopupCheckoutSession({
      userId: String(userId),
      wpProductId: dto.wpProductId,
    });
    return { ok: true, data: result };
  }
}
