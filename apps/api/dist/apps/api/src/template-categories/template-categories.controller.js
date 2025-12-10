"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplateCategoriesController = void 0;
const common_1 = require("@nestjs/common");
const template_categories_service_1 = require("./template-categories.service");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const prisma_service_1 = require("../prisma/prisma.service");
const prisma = new prisma_service_1.PrismaService();
const fallbackTemplateCategoriesService = new template_categories_service_1.TemplateCategoriesService(prisma);
class CreateTemplateCategoryDto {
}
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTemplateCategoryDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTemplateCategoryDto.prototype, "slug", void 0);
class UpdateTemplateCategoryDto {
}
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateTemplateCategoryDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateTemplateCategoryDto.prototype, "slug", void 0);
let TemplateCategoriesController = class TemplateCategoriesController {
    constructor(categoriesService) {
        this.categoriesService = categoriesService;
    }
    getService() {
        return this.categoriesService ?? fallbackTemplateCategoriesService;
    }
    async list() {
        return this.getService().list();
    }
    async get(id) {
        return this.getService().findOne(id);
    }
    async create(body) {
        return this.getService().create(body);
    }
    async update(id, body) {
        return this.getService().update(id, body);
    }
};
exports.TemplateCategoriesController = TemplateCategoriesController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TemplateCategoriesController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], TemplateCategoriesController.prototype, "get", null);
__decorate([
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreateTemplateCategoryDto]),
    __metadata("design:returntype", Promise)
], TemplateCategoriesController.prototype, "create", null);
__decorate([
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, UpdateTemplateCategoryDto]),
    __metadata("design:returntype", Promise)
], TemplateCategoriesController.prototype, "update", null);
exports.TemplateCategoriesController = TemplateCategoriesController = __decorate([
    (0, swagger_1.ApiTags)('template-categories'),
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('template-categories'),
    __metadata("design:paramtypes", [template_categories_service_1.TemplateCategoriesService])
], TemplateCategoriesController);
