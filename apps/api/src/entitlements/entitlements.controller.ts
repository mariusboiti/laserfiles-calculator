import {
  Body,
  Controller,
  Post,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
  Get,
  UseGuards,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { EntitlementsService } from './entitlements.service';
import type { WpEntitlementsChangedWebhook } from '@laser/shared/wp-plugin-contract';
import * as crypto from 'crypto';
import { IsEmail, IsInt, IsOptional, IsString, Min } from 'class-validator';

import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

class EntitlementsWebhookDto {
  event!: string;
  wpUserId!: string;
  newPlan?: string;
  previousPlan?: string;
  occurredAt!: string;
  eventId!: string;
}

class AdminAdjustCreditsDto {
  @IsOptional()
  @IsString()
  targetUserId?: string;

  @IsOptional()
  @IsEmail()
  targetEmail?: string;

  @IsOptional()
  @IsInt()
  addCredits?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  setTotal?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  setUsed?: number;

  @IsOptional()
  @IsString()
  reason?: string;
}

class ConsumeAiCreditDto {
  @IsString()
  toolSlug!: string;

  @IsString()
  actionType!: string;

  @IsString()
  provider!: string;

  @IsOptional()
  metadata?: Record<string, unknown>;
}

@ApiTags('entitlements')
@Controller('entitlements')
export class EntitlementsController {
  private readonly logger = new Logger(EntitlementsController.name);

  constructor(private readonly entitlementsService: EntitlementsService) {}

  /**
   * ✅ Studio UI endpoint: returns AI credits + status
   * Nginx route: /api-backend/entitlements/me -> API: GET /entitlements/me
   */
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiOperation({ summary: 'Get current user entitlements (AI credits + status) for Studio UI' })
  async me(@Req() req: any) {
    const userId = req?.user?.id ?? req?.user?.sub ?? req?.user?.userId;
    if (!userId) {
      throw new UnauthorizedException('Missing user id in token');
    }

    const data = await this.entitlementsService.getUiEntitlementsForUserId(String(userId), req);
    return { ok: true, data };
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Post('consume-ai-credit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Consume 1 AI credit for the current user (authoritative backend)' })
  async consumeAiCredit(@Req() req: any, @Body() dto: ConsumeAiCreditDto) {
    const userId = req?.user?.id ?? req?.user?.sub ?? req?.user?.userId;
    if (!userId) {
      throw new UnauthorizedException('Missing user id in token');
    }

    const { toolSlug, actionType, provider, metadata } = dto;
    if (!toolSlug || !actionType || !provider) {
      throw new BadRequestException('Missing toolSlug/actionType/provider');
    }

    const data = await this.entitlementsService.consumeAiCredit({
      userId: String(userId),
      toolSlug: String(toolSlug),
      actionType: String(actionType),
      provider: String(provider),
      metadata: (metadata || undefined) as any,
    });

    return { ok: true, data };
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post('admin/credits')
  @ApiOperation({ summary: 'Admin: adjust AI credits for a user (manual top-up / contests)' })
  async adminAdjustCredits(@Req() req: any, @Body() dto: AdminAdjustCreditsDto) {
    const actorUserId = req?.user?.id ?? req?.user?.sub ?? req?.user?.userId;
    if (!actorUserId) {
      throw new UnauthorizedException('Missing user id in token');
    }

    if (!dto.targetUserId && !dto.targetEmail) {
      throw new BadRequestException('Provide targetUserId or targetEmail');
    }

    if (
      dto.addCredits === undefined &&
      dto.setTotal === undefined &&
      dto.setUsed === undefined
    ) {
      throw new BadRequestException('Provide addCredits or setTotal or setUsed');
    }

    try {
      const data = await this.entitlementsService.adminAdjustAiCredits({
        actorUserId: String(actorUserId),
        targetUserId: dto.targetUserId,
        targetEmail: dto.targetEmail,
        addCredits: dto.addCredits,
        setTotal: dto.setTotal,
        setUsed: dto.setUsed,
        reason: dto.reason,
      });
      return { ok: true, data };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to adjust credits';
      throw new BadRequestException(msg);
    }
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive entitlements change webhook from WordPress' })
  async handleWebhook(
    @Req() req: any,
    @Body() body: any,
    @Headers('x-wc-webhook-signature') signature?: string,
    @Headers('x-laserfiles-signature') legacySignature?: string,
  ): Promise<{ received: boolean; eventId: string }> {
    const activeSignature = (signature || legacySignature || '').trim();
    const webhookSecret = process.env.WP_WEBHOOK_SECRET || process.env.WP_PLUGIN_WEBHOOK_SECRET || process.env.LASERFILES_API_KEY;
    
    if (webhookSecret && activeSignature) {
      const rawBody = req.rawBody;
      let isValid = false;

      if (rawBody) {
        // Try Base64 (WooCommerce standard)
        const expectedB64 = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('base64');
        if (this.secureCompare(activeSignature, expectedB64)) {
          isValid = true;
        } else {
          // Try Hex
          const expectedHex = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
          if (this.secureCompare(activeSignature, expectedHex)) {
            isValid = true;
          }
        }
      }

      // Fallback to JSON.stringify if rawBody missing or signature still invalid
      if (!isValid) {
        const payloadStr = JSON.stringify(body);
        const expectedHexFallback = crypto.createHmac('sha256', webhookSecret).update(payloadStr).digest('hex');
        if (this.secureCompare(activeSignature, expectedHexFallback)) {
          isValid = true;
        }
      }

      if (!isValid) {
        this.logger.warn(`Webhook signature mismatch for email=${body?.email}`);
        throw new BadRequestException('Invalid webhook signature');
      }
    } else if (webhookSecret && !activeSignature) {
      this.logger.warn('Webhook received without signature');
      throw new BadRequestException('Missing webhook signature');
    }

    const payload = body as any;
    const eventId = payload.eventId || `webhook-${Date.now()}`;
    const email = payload.email;

    this.logger.log(
      `Received entitlements webhook: event=${payload.event} email=${email} wpUserId=${payload.wpUserId} eventId=${eventId}`,
    );

    if (email) {
      // Authoritative sync from WP based on the webhook notification
      await this.entitlementsService.syncFromWordPressByEmail(email, `webhook-${eventId}`);
    } else if (payload.wpUserId) {
      this.entitlementsService.clearCacheForWpUser(payload.wpUserId);
    }

    return { received: true, eventId };
  }

  private computeHmacSignature(payload: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }

  private secureCompare(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  }
}

