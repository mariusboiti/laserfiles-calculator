import { Controller, Get, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('analytics')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Roles('ADMIN')
  @Get('dashboard')
  async dashboard() {
    if (!this.analyticsService) {
      return {
        ordersThisWeek: 0,
        revenueEstimateThisWeek: 0,
        topMaterialsByUsage: [],
        averageProductionMinutesPerItem: 0,
        salesChannels: {
          totalConnections: 0,
          connectionsWithErrors: 0,
          externalOrdersImportedLast7Days: 0,
          externalOrdersNeedsReview: 0,
          externalOrdersIgnored: 0,
        },
      };
    }

    return this.analyticsService.dashboard();
  }
}
