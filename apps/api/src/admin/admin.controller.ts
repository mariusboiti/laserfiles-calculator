import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { User } from '../common/decorators/user.decorator';
import { AddCreditsDto, ForceSyncDto, ListUsersQueryDto } from './dto/admin.dto';
import type { Request } from 'express';

@ApiTags('admin')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get admin dashboard statistics' })
  async getStats() {
    return this.adminService.getStats();
  }

  @Get('users')
  @ApiOperation({ summary: 'List users with pagination and filters' })
  async listUsers(@Query() query: ListUsersQueryDto) {
    return this.adminService.listUsers(query);
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get user details with entitlement and audit logs' })
  async getUserDetails(@Param('id') id: string) {
    return this.adminService.getUserDetails(id);
  }

  @Post('users/:id/credits/add')
  @ApiOperation({ summary: 'Add credits to a user' })
  async addCredits(
    @Param('id') id: string,
    @Body() body: AddCreditsDto,
    @User() user: any,
    @Req() req: Request,
  ) {
    const ip = (req.headers['x-forwarded-for'] as string) || req.ip || '';
    const userAgent = req.headers['user-agent'] || '';
    return this.adminService.addCredits(
      user.sub,
      id,
      body.amount,
      body.reason,
      ip,
      userAgent,
    );
  }

  @Post('users/:id/sync-from-wp')
  @ApiOperation({ summary: 'Force sync user entitlements from WordPress' })
  async forceSyncFromWp(
    @Param('id') id: string,
    @Body() body: ForceSyncDto,
    @User() user: any,
    @Req() req: Request,
  ) {
    const ip = (req.headers['x-forwarded-for'] as string) || req.ip || '';
    const userAgent = req.headers['user-agent'] || '';
    return this.adminService.forceSyncFromWp(
      user.sub,
      id,
      body.reason,
      ip,
      userAgent,
    );
  }
}
