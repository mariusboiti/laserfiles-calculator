import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import type { IdentityEntitlements } from '@laser/shared/entitlements';

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  wpUserId?: string;
  plan?: string;
  entitlementsVersion?: string;
}

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureUserEntitlement(userId: string) {
    const existing = await this.prisma.userEntitlement.findUnique({
      where: { userId },
    });
    if (existing) {
      return existing;
    }

    return this.prisma.userEntitlement.create({
      data: {
        userId,
        plan: 'INACTIVE',
        aiCreditsTotal: 0,
        aiCreditsUsed: 0,
        trialStartedAt: null,
        trialEndsAt: null,
      },
    });
  }

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }

  private signTokens(user: { id: string; email: string; role: string }) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = (jwt as any).sign(
      payload,
      process.env.JWT_ACCESS_SECRET || 'dev-access-secret',
      { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m' },
    );

    const refreshToken = (jwt as any).sign(
      payload,
      process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' },
    );

    return { accessToken, refreshToken };
  }

  async login(email: string, password: string) {
    const user = await this.validateUser(email, password);
    const tokens = this.signTokens(user);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      ...tokens,
    };
  }

  async loginWithWp(entitlements: IdentityEntitlements) {
    const { wpUserId, email, displayName, plan, entitlementsVersion, features, limits, validUntil } = entitlements;

    const adminAllowlist = (process.env.ADMIN_EMAIL_ALLOWLIST || 'contact@laserfilespro.com')
      .split(',')
      .map((v) => v.trim().toLowerCase())
      .filter(Boolean);
    const isAllowedAdmin = adminAllowlist.includes(String(email).toLowerCase());

    // Find or create user
    let user = await this.prisma.user.findFirst({ where: { email } });
    if (!user) {
      const randomPassword = Math.random().toString(36).slice(2);
      const hashed = await bcrypt.hash(randomPassword, 10);

      user = await this.prisma.user.create({
        data: {
          email,
          name: displayName,
          role: isAllowedAdmin ? 'ADMIN' : 'WORKER',
          password: hashed,
        },
      });
    } else {
      const desiredRole = isAllowedAdmin ? 'ADMIN' : user.role === 'ADMIN' ? 'WORKER' : user.role;
      if (desiredRole !== user.role) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { role: desiredRole },
        });
      }
    }

    await this.ensureUserEntitlement(user.id);

    // Upsert UserIdentityLink to link this user to the WordPress identity
    await this.prisma.userIdentityLink.upsert({
      where: {
        provider_externalUserId: {
          provider: 'WORDPRESS',
          externalUserId: wpUserId,
        },
      },
      update: {
        userId: user.id,
        externalEmail: email,
        displayName,
        updatedAt: new Date(),
      },
      create: {
        userId: user.id,
        provider: 'WORDPRESS',
        externalUserId: wpUserId,
        externalEmail: email,
        displayName,
      },
    });

    // Save a WorkspacePlanSnapshot for audit and offline validation
    await this.prisma.workspacePlanSnapshot.create({
      data: {
        wpUserId,
        plan: plan as any, // PlanName enum
        entitlementsVersion,
        featuresJson: features as any,
        limitsJson: limits as any,
        validUntil: validUntil ? new Date(validUntil) : null,
        fetchedAt: new Date(),
      },
    });

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      wpUserId,
      plan,
      entitlementsVersion,
    };

    const accessToken = (jwt as any).sign(
      payload,
      process.env.JWT_ACCESS_SECRET || 'dev-access-secret',
      { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m' },
    );

    const refreshToken = (jwt as any).sign(
      payload,
      process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' },
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      entitlements,
      accessToken,
      refreshToken,
    };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
      ) as JwtPayload;

      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user) {
        throw new UnauthorizedException('Invalid token user');
      }

      const tokens = this.signTokens(user);
      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        ...tokens,
      };
    } catch (e) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}
