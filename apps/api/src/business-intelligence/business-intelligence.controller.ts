import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { BusinessIntelligenceService } from './business-intelligence.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('business-intelligence')
@UseGuards(JwtAuthGuard)
export class BusinessIntelligenceController {
  constructor(private readonly service: BusinessIntelligenceService) {}

  @Get('dashboard/:userId')
  getDashboard(@Param('userId') userId: string) {
    return this.service.getDashboard(userId);
  }

  @Post('snapshot/:userId')
  generateSnapshot(
    @Param('userId') userId: string,
    @Query('period') period?: 'daily' | 'weekly' | 'monthly',
  ) {
    return this.service.generateSnapshot(userId, period || 'daily');
  }

  @Get('profitability/:userId')
  getProfitabilityReport(@Param('userId') userId: string) {
    return this.service.getProfitabilityReport(userId);
  }
}
