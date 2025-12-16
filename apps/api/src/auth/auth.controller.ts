import { Body, Controller, Get, Post, UseGuards, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { User } from '../common/decorators/user.decorator';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { EntitlementsService } from '../entitlements/entitlements.service';

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

const prisma = new PrismaClient();

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly entitlementsService: EntitlementsService,
  ) {}

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

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@User() user: any) {
    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
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
