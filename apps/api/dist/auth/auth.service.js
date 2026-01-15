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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const bcrypt = __importStar(require("bcryptjs"));
const jwt = __importStar(require("jsonwebtoken"));
let AuthService = class AuthService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    normalizePlanName(input) {
        const raw = String(input ?? '').trim().toUpperCase();
        if (raw === 'GUEST')
            return 'GUEST';
        if (raw === 'FREE')
            return 'FREE';
        if (raw === 'STARTER')
            return 'STARTER';
        if (raw === 'LIFETIME')
            return 'LIFETIME';
        // Default to PRO to avoid blocking SSO if upstream sends a different plan label
        return 'PRO';
    }
    async ensureUserEntitlement(userId) {
        // Race-safe: concurrent logins should not fail with unique constraint errors.
        return this.prisma.userEntitlement.upsert({
            where: { userId },
            update: {},
            create: {
                userId,
                plan: 'INACTIVE',
                aiCreditsTotal: 0,
                aiCreditsUsed: 0,
                trialStartedAt: null,
                trialEndsAt: null,
            },
        });
    }
    async validateUser(email, password) {
        const user = await this.prisma.user.findUnique({ where: { email } });
        if (!user) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        return user;
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
    async login(email, password) {
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
    async loginWithWp(entitlements) {
        const { wpUserId, email, displayName, plan, entitlementsVersion, features, limits, validUntil } = entitlements;
        const adminAllowlist = (process.env.ADMIN_EMAIL_ALLOWLIST || 'contact@laserfilespro.com')
            .split(',')
            .map((v) => v.trim().toLowerCase())
            .filter(Boolean);
        const isAllowedAdmin = adminAllowlist.includes(String(email).toLowerCase());
        // Find or create user
        let user = await this.prisma.user.findUnique({ where: { email } });
        if (!user) {
            const randomPassword = Math.random().toString(36).slice(2);
            const hashed = await bcrypt.hash(randomPassword, 10);
            try {
                user = await this.prisma.user.create({
                    data: {
                        email,
                        name: displayName,
                        role: isAllowedAdmin ? 'ADMIN' : 'WORKER',
                        password: hashed,
                    },
                });
            }
            catch (e) {
                // If another request created the user concurrently, recover by fetching it.
                user = await this.prisma.user.findUnique({ where: { email } });
                if (!user)
                    throw e;
            }
        }
        const desiredRole = isAllowedAdmin ? 'ADMIN' : user.role === 'ADMIN' ? 'WORKER' : user.role;
        if (desiredRole !== user.role) {
            user = await this.prisma.user.update({
                where: { id: user.id },
                data: { role: desiredRole },
            });
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
        const normalizedPlan = this.normalizePlanName(plan);
        try {
            await this.prisma.workspacePlanSnapshot.create({
                data: {
                    wpUserId,
                    plan: normalizedPlan,
                    entitlementsVersion,
                    featuresJson: features,
                    limitsJson: limits,
                    validUntil: validUntil ? new Date(validUntil) : null,
                    fetchedAt: new Date(),
                },
            });
        }
        catch {
            // Snapshot is best-effort; do not block SSO login if persistence fails.
        }
        const payload = {
            sub: user.id,
            email: user.email,
            role: user.role,
            wpUserId,
            plan: normalizedPlan,
            entitlementsVersion,
        };
        const accessToken = jwt.sign(payload, process.env.JWT_ACCESS_SECRET || 'dev-access-secret', { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m' });
        const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret', { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' });
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
    async refresh(refreshToken) {
        try {
            const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret');
            const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
            if (!user) {
                throw new common_1.UnauthorizedException('Invalid token user');
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
        }
        catch (e) {
            throw new common_1.UnauthorizedException('Invalid refresh token');
        }
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AuthService);
