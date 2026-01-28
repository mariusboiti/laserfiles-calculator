import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AdminInvitesService } from './admin-invites.service';
import { CreateAdminInviteDto, RedeemInviteDto } from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { User } from '../common/decorators/user.decorator';

@ApiTags('admin-invites')
@Controller()
export class AdminInvitesController {
  constructor(private readonly adminInvitesService: AdminInvitesService) {}

  // ─────────────────────────────────────────────────────────────────────────────
  // Admin-only endpoints (require ADMIN role)
  // ─────────────────────────────────────────────────────────────────────────────

  @Post('admin/invites')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new Admin Edition invite' })
  async createInvite(
    @Body() dto: CreateAdminInviteDto,
    @User() user: { sub: string },
  ) {
    return this.adminInvitesService.createInvite(dto, user.sub);
  }

  @Get('admin/invites')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all Admin Edition invites' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status (PENDING, REDEEMED, REVOKED, EXPIRED)' })
  @ApiQuery({ name: 'q', required: false, description: 'Search by email or note' })
  async listInvites(
    @Query('status') status?: string,
    @Query('q') q?: string,
  ) {
    return this.adminInvitesService.listInvites({ status, q });
  }

  @Post('admin/invites/:id/revoke')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke an Admin Edition invite' })
  async revokeInvite(@Param('id') id: string) {
    return this.adminInvitesService.revokeInvite(id);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Public invite endpoints (require logged-in user)
  // ─────────────────────────────────────────────────────────────────────────────

  @Post('invites/redeem')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Redeem an Admin Edition invite' })
  async redeemInvite(
    @Body() dto: RedeemInviteDto,
    @User() user: { sub: string; email: string },
  ) {
    return this.adminInvitesService.redeemInvite(dto, user.sub, user.email);
  }

  @Get('invites/check')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check invite status before redeeming' })
  @ApiQuery({ name: 'token', required: true, description: 'The invite token' })
  async checkInvite(@Query('token') token: string) {
    return this.adminInvitesService.checkInviteByToken(token);
  }
}
