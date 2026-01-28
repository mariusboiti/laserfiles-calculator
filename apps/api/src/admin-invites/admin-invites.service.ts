import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAdminInviteDto, RedeemInviteDto } from './dto';
import * as crypto from 'crypto';

const DEFAULT_CREDITS_GRANT = 200;
const DEFAULT_DURATION_DAYS = 30;
const DEFAULT_INVITE_VALIDITY_DAYS = 14;

@Injectable()
export class AdminInvitesService {
  private readonly logger = new Logger(AdminInvitesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate a secure random token
   */
  private generateToken(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  /**
   * Hash a token using SHA256
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Get last 4 characters of token for display
   */
  private getTokenLast4(token: string): string {
    return token.slice(-4);
  }

  /**
   * Create a new admin invite
   */
  async createInvite(
    dto: CreateAdminInviteDto,
    createdByUserId: string,
  ): Promise<{
    inviteId: string;
    redeemUrl: string;
    rawTokenShownOnce: boolean;
    email: string;
    creditsGrant: number;
    durationDays: number;
    expiresAt: string;
  }> {
    const email = dto.email.toLowerCase().trim();
    const creditsGrant = dto.creditsGrant ?? DEFAULT_CREDITS_GRANT;
    const durationDays = dto.durationDays ?? DEFAULT_DURATION_DAYS;
    const inviteValidityDays = dto.inviteValidityDays ?? DEFAULT_INVITE_VALIDITY_DAYS;

    // Generate token
    const rawToken = this.generateToken();
    const tokenHash = this.hashToken(rawToken);
    const tokenLast4 = this.getTokenLast4(rawToken);

    // Calculate expiry
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + inviteValidityDays);

    // Create invite
    const invite = await this.prisma.adminInvite.create({
      data: {
        email,
        tokenHash,
        tokenLast4,
        creditsGrant,
        durationDays,
        expiresAt,
        createdByUserId,
        note: dto.note,
      },
    });

    // Build redeem URL
    const studioBaseUrl = process.env.STUDIO_BASE_URL || 'https://studio.laserfilespro.com';
    const redeemUrl = `${studioBaseUrl}/admin-edition?token=${rawToken}`;

    this.logger.log(`Admin invite created for ${email} by ${createdByUserId}`);

    return {
      inviteId: invite.id,
      redeemUrl,
      rawTokenShownOnce: true,
      email,
      creditsGrant,
      durationDays,
      expiresAt: expiresAt.toISOString(),
    };
  }

  /**
   * List invites with optional filters
   */
  async listInvites(filters?: { status?: string; q?: string }) {
    const where: any = {};

    if (filters?.status) {
      where.status = filters.status.toUpperCase();
    }

    if (filters?.q) {
      where.OR = [
        { email: { contains: filters.q, mode: 'insensitive' } },
        { note: { contains: filters.q, mode: 'insensitive' } },
      ];
    }

    const invites = await this.prisma.adminInvite.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        status: true,
        note: true,
        creditsGrant: true,
        durationDays: true,
        tokenLast4: true,
        expiresAt: true,
        redeemedAt: true,
        createdAt: true,
        createdByUserId: true,
      },
    });

    return invites;
  }

  /**
   * Revoke an invite
   */
  async revokeInvite(inviteId: string): Promise<{ success: boolean }> {
    const invite = await this.prisma.adminInvite.findUnique({
      where: { id: inviteId },
    });

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    if (invite.status !== 'PENDING') {
      throw new BadRequestException(`Cannot revoke invite with status ${invite.status}`);
    }

    await this.prisma.adminInvite.update({
      where: { id: inviteId },
      data: { status: 'REVOKED' },
    });

    this.logger.log(`Admin invite ${inviteId} revoked`);

    return { success: true };
  }

  /**
   * Redeem an invite
   */
  async redeemInvite(
    dto: RedeemInviteDto,
    userId: string,
    userEmail: string,
  ): Promise<{
    success: boolean;
    message: string;
    proAccessUntil: string;
    creditsAdded: number;
    badgeEnabled: boolean;
    effectiveAccess: {
      allowed: boolean;
      reason: 'PAID_SUBSCRIPTION' | 'ADMIN_EDITION' | 'INACTIVE';
    };
  }> {
    const tokenHash = this.hashToken(dto.token);

    // Find invite by token hash
    const invite = await this.prisma.adminInvite.findUnique({
      where: { tokenHash },
    });

    if (!invite) {
      throw new NotFoundException('Invalid or expired invite token');
    }

    // Validate status
    if (invite.status === 'REDEEMED') {
      throw new BadRequestException('This invite has already been redeemed');
    }

    if (invite.status === 'REVOKED') {
      throw new BadRequestException('This invite has been revoked');
    }

    if (invite.status === 'EXPIRED') {
      throw new BadRequestException('This invite has expired');
    }

    // Check if invite is expired
    const now = new Date();
    if (now > invite.expiresAt) {
      // Update status to expired
      await this.prisma.adminInvite.update({
        where: { id: invite.id },
        data: { status: 'EXPIRED' },
      });
      throw new BadRequestException('This invite has expired');
    }

    // Validate email match (case-insensitive)
    const normalizedUserEmail = userEmail.toLowerCase().trim();
    if (invite.email !== normalizedUserEmail) {
      throw new ForbiddenException(
        `This invite was created for a different email address. Please log in with ${invite.email}`,
      );
    }

    // Get or create user entitlement
    let entitlement = await this.prisma.userEntitlement.findUnique({
      where: { userId },
    });

    if (!entitlement) {
      entitlement = await this.prisma.userEntitlement.create({
        data: { userId },
      });
    }

    // Check if user already has active Admin Edition
    if (
      entitlement.communityBadge === 'ADMIN_EDITION' &&
      entitlement.communityBadgeExpiresAt &&
      entitlement.communityBadgeExpiresAt > now
    ) {
      throw new ConflictException(
        'Admin Edition is already active on your account. Please wait until it expires before redeeming a new invite.',
      );
    }

    // Calculate badge expiry
    const badgeExpiresAt = new Date();
    badgeExpiresAt.setDate(badgeExpiresAt.getDate() + invite.durationDays);

    // Determine if user has active paid subscription
    const hasPaidSubscription = entitlement.plan === 'ACTIVE';

    // Apply grants
    await this.prisma.$transaction([
      // Update entitlement with badge and credits
      this.prisma.userEntitlement.update({
        where: { userId },
        data: {
          communityBadge: 'ADMIN_EDITION',
          communityBadgeExpiresAt: badgeExpiresAt,
          aiCreditsTotal: {
            increment: invite.creditsGrant,
          },
        },
      }),
      // Mark invite as redeemed
      this.prisma.adminInvite.update({
        where: { id: invite.id },
        data: {
          status: 'REDEEMED',
          redeemedAt: now,
          redeemedByUserId: userId,
        },
      }),
    ]);

    this.logger.log(`Admin invite ${invite.id} redeemed by user ${userId}`);

    return {
      success: true,
      message: 'Admin Edition activated successfully!',
      proAccessUntil: badgeExpiresAt.toISOString(),
      creditsAdded: invite.creditsGrant,
      badgeEnabled: true,
      effectiveAccess: {
        allowed: true,
        reason: hasPaidSubscription ? 'PAID_SUBSCRIPTION' : 'ADMIN_EDITION',
      },
    };
  }

  /**
   * Check invite status by token (for preview before redeem)
   */
  async checkInviteByToken(token: string): Promise<{
    valid: boolean;
    email?: string;
    creditsGrant?: number;
    durationDays?: number;
    status?: string;
    expiresAt?: string;
    error?: string;
  }> {
    const tokenHash = this.hashToken(token);

    const invite = await this.prisma.adminInvite.findUnique({
      where: { tokenHash },
      select: {
        email: true,
        creditsGrant: true,
        durationDays: true,
        status: true,
        expiresAt: true,
      },
    });

    if (!invite) {
      return { valid: false, error: 'Invalid invite token' };
    }

    const now = new Date();
    if (invite.status !== 'PENDING') {
      return {
        valid: false,
        status: invite.status,
        error: `Invite is ${invite.status.toLowerCase()}`,
      };
    }

    if (now > invite.expiresAt) {
      return { valid: false, status: 'EXPIRED', error: 'Invite has expired' };
    }

    return {
      valid: true,
      email: invite.email,
      creditsGrant: invite.creditsGrant,
      durationDays: invite.durationDays,
      status: invite.status,
      expiresAt: invite.expiresAt.toISOString(),
    };
  }
}
