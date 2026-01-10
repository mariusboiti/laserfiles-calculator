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
    const { wpUserId, email, displayName, name, entitlements } =
      await this.wpSsoExchangeService.exchangeCode(dto.code);

    const loginResult = await this.authService.loginWithWp({
      wpUserId: String(wpUserId),
      email,
      displayName: displayName ?? name ?? email,
      plan: (entitlements as any)?.plan ?? 'PRO',
      entitlementsVersion: (entitlements as any)?.entitlementsVersion ?? 'unknown',
      features: (entitlements as any)?.features ?? {},
      limits: (entitlements as any)?.limits ?? {},
      validUntil: (entitlements as any)?.validUntil ?? null,
    } as any);

    const cookieDomain = process.env.COOKIE_DOMAIN || undefined;
    const cookieOptions = {
      httpOnly: true,
      secure: true,
      sameSite: 'lax' as const,
      path: '/',
      ...(cookieDomain ? { domain: cookieDomain } : {}),
    };

    res.cookie('lf_access_token', loginResult.accessToken, cookieOptions);
    res.cookie('lf_refresh_token', loginResult.refreshToken, cookieOptions);

    return {
      ok: true,
      user: loginResult.user,
      entitlements: loginResult.entitlements ?? null,
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

    const fullUser = await prisma.user.findUnique({
      where: { id: String(userId) },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        plan: true,
      },
    });
    return { user: fullUser };
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
      { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m' },
    );

    const refreshToken = (jwt as any).sign(
      payload,
      process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' },
    );

    return { accessToken, refreshToken };
  }
}
