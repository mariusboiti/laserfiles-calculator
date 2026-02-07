import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, Req } from '@nestjs/common';
import { LaserTrendIntelligenceService } from './trend-intelligence.service';
import { TrendAlertService } from './trend-alert.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('trend-scanner')
@UseGuards(JwtAuthGuard)
export class TrendScannerController {
  constructor(
    private readonly intelligence: LaserTrendIntelligenceService,
    private readonly alerts: TrendAlertService,
  ) {}

  // ─── Scans ────────────────────────────────────────────────────────────────

  @Post('scan')
  async runScan(@Req() req: any, @Body() body: { scanType?: string }) {
    const userId = req.user?.id || req.user?.sub;
    return this.intelligence.runFullScan(userId, body.scanType || 'full');
  }

  @Get('scan/latest')
  async getLatestScan(@Req() req: any) {
    const userId = req.user?.id || req.user?.sub;
    return this.intelligence.getLatestScan(userId);
  }

  @Get('scan/history')
  async getScanHistory(@Req() req: any, @Query('take') take?: string) {
    const userId = req.user?.id || req.user?.sub;
    return this.intelligence.getScanHistory(userId, take ? parseInt(take) : 10);
  }

  // ─── Subscriptions ────────────────────────────────────────────────────────

  @Get('subscription')
  async getSubscription(@Req() req: any) {
    const userId = req.user?.id || req.user?.sub;
    return this.alerts.getSubscription(userId);
  }

  @Post('subscription')
  async upsertSubscription(@Req() req: any, @Body() body: any) {
    const userId = req.user?.id || req.user?.sub;
    return this.alerts.upsertSubscription(userId, body);
  }

  @Patch('subscription/deactivate')
  async deactivateSubscription(@Req() req: any) {
    const userId = req.user?.id || req.user?.sub;
    return this.alerts.deactivateSubscription(userId);
  }

  // ─── Alerts ───────────────────────────────────────────────────────────────

  @Get('alerts')
  async getAlerts(@Req() req: any, @Query('unreadOnly') unreadOnly?: string) {
    const userId = req.user?.id || req.user?.sub;
    return this.alerts.getAlerts(userId, unreadOnly === 'true');
  }

  @Get('alerts/unread-count')
  async getUnreadCount(@Req() req: any) {
    const userId = req.user?.id || req.user?.sub;
    return { count: await this.alerts.getUnreadCount(userId) };
  }

  @Patch('alerts/:id/read')
  async markAlertRead(@Req() req: any, @Param('id') id: string) {
    const userId = req.user?.id || req.user?.sub;
    return this.alerts.markAlertRead(id, userId);
  }

  @Patch('alerts/read-all')
  async markAllRead(@Req() req: any) {
    const userId = req.user?.id || req.user?.sub;
    return this.alerts.markAllRead(userId);
  }
}
