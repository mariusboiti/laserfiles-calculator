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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const auth_service_1 = require("./auth.service");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const user_decorator_1 = require("../common/decorators/user.decorator");
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const client_1 = require("@prisma/client");
const bcrypt = __importStar(require("bcryptjs"));
const jwt = __importStar(require("jsonwebtoken"));
const entitlements_service_1 = require("../entitlements/entitlements.service");
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
const prisma = new client_1.PrismaClient();
let AuthController = class AuthController {
    constructor(authService, entitlementsService) {
        this.authService = authService;
        this.entitlementsService = entitlementsService;
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
    async me(user) {
        const userId = user?.id || user?.sub;
        if (!userId) {
            throw new common_1.UnauthorizedException('Missing user id in token');
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
        entitlements_service_1.EntitlementsService])
], AuthController);
