import { Body, Controller, Get, Post, UseGuards, UnauthorizedException, BadRequestException, Res, Query, BadGatewayException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { User } from '../common/decorators/user.decorator';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { EntitlementsService } from '../entitlements/entitlements.service';
import { computeWpSsoSignatureHex, secureCompareHex } from '../common/wp-hmac';
import type { Response } from 'express';
import { WpExchangeDto } from './dto/wp-exchange.dto';
import { WpSsoExchangeService } from './wp-sso-exchange.service';
import { Public } from '../common/decorators/public.decorator';

class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;
}

class RefreshDto {
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}

class WpSsoDto {
  @IsString()
  @IsNotEmpty()
  wpToken!: string;
}

class WpHmacSsoDto {
  wpUserId!: number;
  @IsEmail()
  email!: string;
  @IsString()
  name!: string;
  iat!: number;
  @IsString()
  signature!: string;
}

const prisma = new PrismaClient();

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly entitlementsService: EntitlementsService,
    private readonly wpSsoExchangeService: WpSsoExchangeService,
  ) {}

  @Public()
  @Get('wp/start')
  async wpStart(
    @Query('returnUrl') returnUrl: string | undefined,
    @Res({ passthrough: false }) res: Response,
  ) {
    if (!returnUrl) {
      throw new BadRequestException('Missing returnUrl');
    }

    const baseUrl = process.env.WP_PLUGIN_BASE_URL;
    const apiKey = process.env.WP_PLUGIN_API_KEY;
    if (!baseUrl || !apiKey) {
      const isProd = process.env.NODE_ENV === 'production';
      if (!isProd) {
        const glue = returnUrl.includes('?') ? '&' : '?';
        return res.redirect(`${returnUrl}${glue}code=dev-sso`);
      }
      throw new BadRequestException('WP integration not configured');
    }

    const url = `${baseUrl.replace(/\/$/, '')}/wp-json/laserfiles/v1/sso/start?returnUrl=${encodeURIComponent(
      returnUrl,
    )}`;

    const response = await axios.get(url, {
      headers: {
        'x-api-key': apiKey,
      },
      maxRedirects: 0,
      validateStatus: () => true,
    });

    const location = (response.headers as any)?.location as string | undefined;
    if (location) {
      return res.redirect(location);
    }

    const data: any = response.data;
    const redirectUrl =
      (typeof data === 'string' ? undefined : data?.redirectUrl) ??
      (typeof data === 'string' ? undefined : data?.url);

    if (redirectUrl && typeof redirectUrl === 'string') {
      return res.redirect(redirectUrl);
    }

    throw new BadGatewayException('WP start did not return a redirect');
  }

  @Public()
  @Get('wp/debug-config')
  async wpDebugConfig() {
    const baseUrl = process.env.WP_PLUGIN_BASE_URL || '';
    const apiKey = process.env.WP_PLUGIN_API_KEY || '';
    const maxSkewSeconds = process.env.WP_SSO_MAX_SKEW_SECONDS
      ? Number(process.env.WP_SSO_MAX_SKEW_SECONDS)
      : 120;

    const normalizedBaseUrl = baseUrl.replace(/\/$/, '');
    const exchangeEndpoint = normalizedBaseUrl
      ? `${normalizedBaseUrl}/wp-json/laserfiles/v1/sso/exchange`
      : '/wp-json/laserfiles/v1/sso/exchange';

    const redactedBaseUrl = normalizedBaseUrl
      ? normalizedBaseUrl.replace(/^https?:\/\//, 'https://')
      : '';

    return {
      baseUrl: redactedBaseUrl,
      hasApiKey: Boolean(apiKey),
      exchangeEndpoint,
      maxSkewSeconds,
    };
  }

  @Post('wp/sso')
  async wpHmacSso(@Body() body: WpHmacSsoDto) {
    const secret = process.env.WP_SSO_SECRET;
    if (!secret) {
      throw new BadRequestException('WP SSO not configured');
    }

    const maxSkewSeconds = process.env.WP_SSO_MAX_SKEW_SECONDS
      ? Number(process.env.WP_SSO_MAX_SKEW_SECONDS)
      : 120;
    const nowSeconds = Math.floor(Date.now() / 1000);
    const skew = Math.abs(nowSeconds - Number(body.iat));
    if (!Number.isFinite(skew) || skew > maxSkewSeconds) {
      throw new UnauthorizedException('SSO token expired');
    }

    const expected = computeWpSsoSignatureHex({
      wpUserId: body.wpUserId,
      email: body.email,
      iat: body.iat,
      secret,
    });
    if (!secureCompareHex(body.signature, expected)) {
      throw new UnauthorizedException('Invalid SSO signature');
    }

    let user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user) {
      const randomPassword = Math.random().toString(36).slice(2);
      const hashed = await bcrypt.hash(randomPassword, 10);
      user = await prisma.user.create({
        data: {
          email: body.email,
          name: body.name,
          role: 'WORKER',
          password: hashed,
        },
      });
    }

    await (prisma as any).user.update({
      where: { id: user.id },
      data: { wpUserId: String(body.wpUserId) },
    });

    const accessToken = (jwt as any).sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        wpUserId: String(body.wpUserId),
      },
      process.env.JWT_ACCESS_SECRET || 'dev-access-secret',
      { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m' },
    );

    return { token: accessToken };
  }

  @Post('login')
  async login(@Body() body: LoginDto) {
    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await bcrypt.compare(body.password, user.password);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.entitlementsService.fetchAndApplyEntitlementsByEmail(user.email);

    const tokens = this.signTokens({
      id: user.id,
      email: user.email,
      role: user.role as any,
    });

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

  @Post('refresh')
  async refresh(@Body() body: RefreshDto) {
    try {
      const payload = jwt.verify(
        body.refreshToken,
        process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
      ) as { sub: string; email: string; role: string };

      const user = await prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user) {
        throw new UnauthorizedException('Invalid token user');
      }

      const tokens = this.signTokens({
        id: user.id,
        email: user.email,
        role: user.role as any,
      });

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

  @Post('wp-sso')
  async wpSso(@Body() body: WpSsoDto) {
    // For now, in dev mode, we treat wpToken as a wpUserId and rely on EntitlementsService
    // to return a mocked PRO entitlements object. Later this will call the real
    // WordPress SSO plugin endpoints.
    const wpUserId = body.wpToken;
    const entitlements = await this.entitlementsService.getEntitlementsForWpUser(wpUserId);
    return this.authService.loginWithWp(entitlements);
  }

  @Public()
  @Post('wp/exchange')
  async wpExchange(@Body() dto: WpExchangeDto, @Res({ passthrough: true }) res: Response) {
    // curl -i -X POST http://127.0.0.1:4000/auth/wp/exchange -H "Content-Type: application/json" -d '{"code":"..."}'
    const isProd = process.env.NODE_ENV === 'production';
    const isDevSso = !isProd && dto.code === 'dev-sso';

    const exchangeResult =
      isDevSso
        ? {
            wpUserId: 'dev-sso',
            email: 'dev@local.test',
            displayName: 'Dev User',
            name: 'Dev User',
            entitlements: {
              plan: 'PRO',
              entitlementsVersion: 'dev',
              features: {},
              limits: {},
              validUntil: null,
            },
          }
        : await this.wpSsoExchangeService.exchangeCode(dto.code);

    const { wpUserId, email, displayName, name, entitlements } = exchangeResult;

    let loginResult: any;

    if (isDevSso) {
      // Local dev fallback: perform a minimal login without relying on AuthService
      // to avoid DI issues in watch mode.
      let user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        const randomPassword = Math.random().toString(36).slice(2);
        const hashed = await bcrypt.hash(randomPassword, 10);

        user = await prisma.user.create({
          data: {
            email,
            name: displayName ?? name ?? email,
            role: 'ADMIN',
            password: hashed,
          },
        });
      }

      const tokens = this.signTokens({
        id: user.id,
        email: user.email,
        role: user.role,
      });

      loginResult = {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        entitlements,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      };
    } else {
      // Proactively sync entitlements from WP to ensure DB is up to date.
      await this.entitlementsService?.syncFromWordPressByEmail?.(email, `exchange-${wpUserId}`);

      loginResult = await this.authService.loginWithWp({
        wpUserId: String(wpUserId),
        email,
        displayName: displayName ?? name ?? email,
        plan: (entitlements as any)?.plan ?? 'PRO',
        entitlementsVersion: (entitlements as any)?.entitlementsVersion ?? 'unknown',
        features: (entitlements as any)?.features ?? {},
        limits: (entitlements as any)?.limits ?? {},
        validUntil: (entitlements as any)?.validUntil ?? null,
      } as any);
    }

    const cookieDomain = process.env.COOKIE_DOMAIN || undefined;
    const cookieOptions = {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax' as const,
      path: '/',
      ...(cookieDomain ? { domain: cookieDomain } : {}),
    };

    res.cookie('lf_access_token', loginResult.accessToken, cookieOptions);
    res.cookie('lf_refresh_token', loginResult.refreshToken, cookieOptions);

    if (isDevSso) {
      // Only create entitlement if it doesn't exist - don't overwrite existing plans
      const existingEntitlement = await prisma.userEntitlement.findUnique({
        where: { userId: loginResult.user.id },
      });
      if (!existingEntitlement) {
        const now = new Date();
        const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await prisma.userEntitlement.create({
          data: {
            userId: loginResult.user.id,
            plan: 'TRIALING',
            trialStartedAt: now,
            trialEndsAt,
            aiCreditsTotal: 15,
            aiCreditsUsed: 0,
          },
        });
      }
    }

    return {
      ok: true,
      user: loginResult.user,
      entitlements: loginResult.entitlements ?? null,
      accessToken: loginResult.accessToken,
      refreshToken: loginResult.refreshToken,
    };
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@User() user: any) {
    const userId = user?.id || user?.sub;
    if (!userId) {
      throw new UnauthorizedException('Missing user id in token');
    }

    const userIdStr = String(userId);
    const baseUser = await prisma.user.findUnique({
      where: { id: userIdStr },
      select: {
        email: true,
        entitlement: {
          select: {
            plan: true,
            aiCreditsTotal: true,
            updatedAt: true,
          },
        },
      },
    });

    if (baseUser?.email) {
      const now = new Date();
      const ent = baseUser.entitlement;
      const updatedAt = ent?.updatedAt ? new Date(ent.updatedAt) : null;
      const stale = !updatedAt || now.getTime() - updatedAt.getTime() > 60000;
      const inactiveWithCredits = ent?.plan === 'INACTIVE' && (ent?.aiCreditsTotal ?? 0) > 0;

      if (!ent || stale || inactiveWithCredits) {
        await this.entitlementsService.syncFromWordPressByEmail(baseUser.email, `me-sync-${userIdStr.slice(-4)}`);
      }
    }

    const fullUser = await prisma.user.findUnique({
      where: { id: userIdStr },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        plan: true,
        subscriptionType: true,
        subscriptionStatus: true,
        entitlement: {
          select: {
            plan: true,
            trialEndsAt: true,
            aiCreditsTotal: true,
            aiCreditsUsed: true,
          },
        },
      },
    });

    const entPlanRaw = String((fullUser as any)?.entitlement?.plan ?? 'INACTIVE').toUpperCase();
    const trialEndsAtValue = (fullUser as any)?.entitlement?.trialEndsAt ?? null;
    const now = new Date();

    const plan = (() => {
      if (entPlanRaw === 'TRIALING') return 'TRIAL';
      if (entPlanRaw === 'ACTIVE') return 'ACTIVE';
      if (entPlanRaw === 'CANCELED') return 'CANCELED';
      return 'NONE'; // Mapping INACTIVE to NONE
    })();

    const interval = (() => {
      const cycle = String((fullUser as any)?.subscriptionType ?? '').toUpperCase();
      if (cycle === 'ANNUAL') return 'annual';
      if (cycle === 'MONTHLY') return 'monthly';
      return null;
    })();

    const trialEndsAt = trialEndsAtValue ? new Date(trialEndsAtValue) : null;

    const aiCreditsTotal = Number((fullUser as any)?.entitlement?.aiCreditsTotal ?? 0) || 0;
    const aiCreditsUsed = Number((fullUser as any)?.entitlement?.aiCreditsUsed ?? 0) || 0;

    // Access gating logic as requested
    const canAccessStudio =
      plan === 'ACTIVE' ||
      (plan === 'TRIAL' && (trialEndsAt === null || now.getTime() < trialEndsAt.getTime()));

    const canUseAI = canAccessStudio && aiCreditsUsed < aiCreditsTotal;

    return {
      user: {
        ...(fullUser as any),
        plan,
        interval,
        trialEndsAt: trialEndsAt ? trialEndsAt.toISOString() : null,
        aiCreditsTotal,
        aiCreditsUsed,
        creditsRemaining: Math.max(0, aiCreditsTotal - aiCreditsUsed),
        canAccessStudio,
        canUseAI,
      },
    };
  }

  private signTokens(user: { id: string; email: string; role: string }) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = (jwt as any).sign(
      payload,
      process.env.JWT_ACCESS_SECRET || 'dev-access-secret',
      { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '365d' },
    );

    const refreshToken = (jwt as any).sign(
      payload,
      process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '365d' },
    );

    return { accessToken, refreshToken };
  }
}
