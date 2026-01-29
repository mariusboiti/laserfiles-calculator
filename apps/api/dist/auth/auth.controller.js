"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const auth_service_1 = require("./auth.service");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const user_decorator_1 = require("../common/decorators/user.decorator");
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const client_1 = require("@prisma/client");
const axios_1 = __importDefault(require("axios"));
const bcrypt = __importStar(require("bcryptjs"));
const jwt = __importStar(require("jsonwebtoken"));
const entitlements_service_1 = require("../entitlements/entitlements.service");
const wp_hmac_1 = require("../common/wp-hmac");
const wp_exchange_dto_1 = require("./dto/wp-exchange.dto");
const wp_sso_exchange_service_1 = require("./wp-sso-exchange.service");
const public_decorator_1 = require("../common/decorators/public.decorator");
class LoginDto {
}
__decorate([
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], LoginDto.prototype, "email", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(6),
    __metadata("design:type", String)
], LoginDto.prototype, "password", void 0);
class RefreshDto {
}
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], RefreshDto.prototype, "refreshToken", void 0);
class WpSsoDto {
}
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], WpSsoDto.prototype, "wpToken", void 0);
class WpHmacSsoDto {
}
__decorate([
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], WpHmacSsoDto.prototype, "email", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], WpHmacSsoDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], WpHmacSsoDto.prototype, "signature", void 0);
const prisma = new client_1.PrismaClient();
let AuthController = class AuthController {
    constructor(authService, entitlementsService, wpSsoExchangeService) {
        this.authService = authService;
        this.entitlementsService = entitlementsService;
        this.wpSsoExchangeService = wpSsoExchangeService;
    }
    async wpStart(returnUrl, res) {
        if (!returnUrl) {
            throw new common_1.BadRequestException('Missing returnUrl');
        }
        const baseUrl = process.env.WP_PLUGIN_BASE_URL;
        const apiKey = process.env.WP_PLUGIN_API_KEY;
        if (!baseUrl || !apiKey) {
            const isProd = process.env.NODE_ENV === 'production';
            if (!isProd) {
                const glue = returnUrl.includes('?') ? '&' : '?';
                return res.redirect(`${returnUrl}${glue}code=dev-sso`);
            }
            throw new common_1.BadRequestException('WP integration not configured');
        }
        const url = `${baseUrl.replace(/\/$/, '')}/wp-json/laserfiles/v1/sso/start?returnUrl=${encodeURIComponent(returnUrl)}`;
        const response = await axios_1.default.get(url, {
            headers: {
                'x-api-key': apiKey,
            },
            maxRedirects: 0,
            validateStatus: () => true,
        });
        const location = response.headers?.location;
        if (location) {
            return res.redirect(location);
        }
        const data = response.data;
        const redirectUrl = (typeof data === 'string' ? undefined : data?.redirectUrl) ??
            (typeof data === 'string' ? undefined : data?.url);
        if (redirectUrl && typeof redirectUrl === 'string') {
            return res.redirect(redirectUrl);
        }
        throw new common_1.BadGatewayException('WP start did not return a redirect');
    }
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
    async wpHmacSso(body) {
        const secret = process.env.WP_SSO_SECRET;
        if (!secret) {
            throw new common_1.BadRequestException('WP SSO not configured');
        }
        const maxSkewSeconds = process.env.WP_SSO_MAX_SKEW_SECONDS
            ? Number(process.env.WP_SSO_MAX_SKEW_SECONDS)
            : 120;
        const nowSeconds = Math.floor(Date.now() / 1000);
        const skew = Math.abs(nowSeconds - Number(body.iat));
        if (!Number.isFinite(skew) || skew > maxSkewSeconds) {
            throw new common_1.UnauthorizedException('SSO token expired');
        }
        const expected = (0, wp_hmac_1.computeWpSsoSignatureHex)({
            wpUserId: body.wpUserId,
            email: body.email,
            iat: body.iat,
            secret,
        });
        if (!(0, wp_hmac_1.secureCompareHex)(body.signature, expected)) {
            throw new common_1.UnauthorizedException('Invalid SSO signature');
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
        await prisma.user.update({
            where: { id: user.id },
            data: { wpUserId: String(body.wpUserId) },
        });
        const accessToken = jwt.sign({
            sub: user.id,
            email: user.email,
            role: user.role,
            wpUserId: String(body.wpUserId),
        }, process.env.JWT_ACCESS_SECRET || 'dev-access-secret', { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m' });
        return { token: accessToken };
    }
    async login(body) {
        const user = await prisma.user.findUnique({ where: { email: body.email } });
        if (!user) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const isValid = await bcrypt.compare(body.password, user.password);
        if (!isValid) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        await this.entitlementsService.fetchAndApplyEntitlementsByEmail(user.email);
        const tokens = this.signTokens({
            id: user.id,
            email: user.email,
            role: user.role,
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
    async refresh(body) {
        try {
            const payload = jwt.verify(body.refreshToken, process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret');
            const user = await prisma.user.findUnique({ where: { id: payload.sub } });
            if (!user) {
                throw new common_1.UnauthorizedException('Invalid token user');
            }
            const tokens = this.signTokens({
                id: user.id,
                email: user.email,
                role: user.role,
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
        catch (e) {
            throw new common_1.UnauthorizedException('Invalid refresh token');
        }
    }
    async wpSso(body) {
        // For now, in dev mode, we treat wpToken as a wpUserId and rely on EntitlementsService
        // to return a mocked PRO entitlements object. Later this will call the real
        // WordPress SSO plugin endpoints.
        const wpUserId = body.wpToken;
        const entitlements = await this.entitlementsService.getEntitlementsForWpUser(wpUserId);
        return this.authService.loginWithWp(entitlements);
    }
    async wpExchange(dto, res) {
        // curl -i -X POST http://127.0.0.1:4000/auth/wp/exchange -H "Content-Type: application/json" -d '{"code":"..."}'
        const isProd = process.env.NODE_ENV === 'production';
        const isDevSso = !isProd && dto.code === 'dev-sso';
        const { wpUserId, email, displayName, name, entitlements } = isDevSso
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
        // Proactively sync entitlements from WP to ensure DB is up to date.
        // In dev-sso mode, skip WP sync entirely.
        if (!isDevSso) {
            await this.entitlementsService?.syncFromWordPressByEmail?.(email, `exchange-${wpUserId}`);
        }
        const loginResult = await this.authService.loginWithWp({
            wpUserId: String(wpUserId),
            email,
            displayName: displayName ?? name ?? email,
            plan: entitlements?.plan ?? 'PRO',
            entitlementsVersion: entitlements?.entitlementsVersion ?? 'unknown',
            features: entitlements?.features ?? {},
            limits: entitlements?.limits ?? {},
            validUntil: entitlements?.validUntil ?? null,
        });
        const cookieDomain = process.env.COOKIE_DOMAIN || undefined;
        const cookieOptions = {
            httpOnly: true,
            secure: isProd,
            sameSite: 'lax',
            path: '/',
            ...(cookieDomain ? { domain: cookieDomain } : {}),
        };
        res.cookie('lf_access_token', loginResult.accessToken, cookieOptions);
        res.cookie('lf_refresh_token', loginResult.refreshToken, cookieOptions);
        if (isDevSso) {
            const now = new Date();
            const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
            await prisma.userEntitlement.upsert({
                where: { userId: loginResult.user.id },
                update: {
                    plan: 'TRIALING',
                    trialStartedAt: now,
                    trialEndsAt,
                    aiCreditsTotal: 25,
                    aiCreditsUsed: 0,
                },
                create: {
                    userId: loginResult.user.id,
                    plan: 'TRIALING',
                    trialStartedAt: now,
                    trialEndsAt,
                    aiCreditsTotal: 25,
                    aiCreditsUsed: 0,
                },
            });
        }
        return {
            ok: true,
            user: loginResult.user,
            entitlements: loginResult.entitlements ?? null,
            accessToken: loginResult.accessToken,
            refreshToken: loginResult.refreshToken,
        };
    }
    async me(user) {
        const userId = user?.id || user?.sub;
        if (!userId) {
            throw new common_1.UnauthorizedException('Missing user id in token');
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
        const entPlanRaw = String(fullUser?.entitlement?.plan ?? 'INACTIVE').toUpperCase();
        const trialEndsAtValue = fullUser?.entitlement?.trialEndsAt ?? null;
        const now = new Date();
        const plan = (() => {
            if (entPlanRaw === 'TRIALING')
                return 'TRIAL';
            if (entPlanRaw === 'ACTIVE')
                return 'ACTIVE';
            if (entPlanRaw === 'CANCELED')
                return 'CANCELED';
            return 'NONE'; // Mapping INACTIVE to NONE
        })();
        const interval = (() => {
            const cycle = String(fullUser?.subscriptionType ?? '').toUpperCase();
            if (cycle === 'ANNUAL')
                return 'annual';
            if (cycle === 'MONTHLY')
                return 'monthly';
            return null;
        })();
        const trialEndsAt = trialEndsAtValue ? new Date(trialEndsAtValue) : null;
        const aiCreditsTotal = Number(fullUser?.entitlement?.aiCreditsTotal ?? 0) || 0;
        const aiCreditsUsed = Number(fullUser?.entitlement?.aiCreditsUsed ?? 0) || 0;
        // Access gating logic as requested
        const canAccessStudio = plan === 'ACTIVE' ||
            (plan === 'TRIAL' && (trialEndsAt === null || now.getTime() < trialEndsAt.getTime()));
        const canUseAI = canAccessStudio && aiCreditsUsed < aiCreditsTotal;
        return {
            user: {
                ...fullUser,
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
    signTokens(user) {
        const payload = {
            sub: user.id,
            email: user.email,
            role: user.role,
        };
        const accessToken = jwt.sign(payload, process.env.JWT_ACCESS_SECRET || 'dev-access-secret', { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m' });
        const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret', { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' });
        return { accessToken, refreshToken };
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('wp/start'),
    __param(0, (0, common_1.Query)('returnUrl')),
    __param(1, (0, common_1.Res)({ passthrough: false })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "wpStart", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('wp/debug-config'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "wpDebugConfig", null);
__decorate([
    (0, common_1.Post)('wp/sso'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [WpHmacSsoDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "wpHmacSso", null);
__decorate([
    (0, common_1.Post)('login'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [LoginDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, common_1.Post)('refresh'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [RefreshDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "refresh", null);
__decorate([
    (0, common_1.Post)('wp-sso'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [WpSsoDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "wpSso", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('wp/exchange'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [wp_exchange_dto_1.WpExchangeDto, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "wpExchange", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('me'),
    __param(0, (0, user_decorator_1.User)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "me", null);
exports.AuthController = AuthController = __decorate([
    (0, swagger_1.ApiTags)('auth'),
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService,
        entitlements_service_1.EntitlementsService,
        wp_sso_exchange_service_1.WpSsoExchangeService])
], AuthController);
