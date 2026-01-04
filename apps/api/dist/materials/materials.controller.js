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
exports.MaterialsController = void 0;
const common_1 = require("@nestjs/common");
const materials_service_1 = require("./materials.service");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const prisma = new prisma_service_1.PrismaService();
const fallbackMaterialsService = new materials_service_1.MaterialsService(prisma);
class PaginationQuery {
}
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], PaginationQuery.prototype, "page", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], PaginationQuery.prototype, "pageSize", void 0);
class CreateMaterialDto {
}
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateMaterialDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(client_1.MaterialCategory),
    __metadata("design:type", String)
], CreateMaterialDto.prototype, "category", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], CreateMaterialDto.prototype, "thicknessMm", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(['SHEET', 'M2']),
    __metadata("design:type", String)
], CreateMaterialDto.prototype, "unitType", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateMaterialDto.prototype, "costPerSheet", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateMaterialDto.prototype, "costPerM2", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], CreateMaterialDto.prototype, "sheetWidthMm", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], CreateMaterialDto.prototype, "sheetHeightMm", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateMaterialDto.prototype, "stockQty", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateMaterialDto.prototype, "lowStockThreshold", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateMaterialDto.prototype, "defaultWastePercent", void 0);
class UpdateMaterialDto {
}
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateMaterialDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(client_1.MaterialCategory),
    __metadata("design:type", String)
], UpdateMaterialDto.prototype, "category", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], UpdateMaterialDto.prototype, "thicknessMm", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(['SHEET', 'M2']),
    __metadata("design:type", String)
], UpdateMaterialDto.prototype, "unitType", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Object)
], UpdateMaterialDto.prototype, "costPerSheet", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Object)
], UpdateMaterialDto.prototype, "costPerM2", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Object)
], UpdateMaterialDto.prototype, "sheetWidthMm", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Object)
], UpdateMaterialDto.prototype, "sheetHeightMm", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], UpdateMaterialDto.prototype, "stockQty", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], UpdateMaterialDto.prototype, "lowStockThreshold", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Object)
], UpdateMaterialDto.prototype, "defaultWastePercent", void 0);
class CreateStockMovementDto {
}
__decorate([
    (0, class_validator_1.IsEnum)(client_1.StockMovementType),
    __metadata("design:type", String)
], CreateStockMovementDto.prototype, "type", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateStockMovementDto.prototype, "qty", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateStockMovementDto.prototype, "note", void 0);
let MaterialsController = class MaterialsController {
    constructor(materialsService) {
        this.materialsService = materialsService;
    }
    getService() {
        return this.materialsService ?? fallbackMaterialsService;
    }
    async getCategories() {
        return [
            { label: 'Plywood', value: 'PLYWOOD' },
            { label: 'MDF', value: 'MDF' },
            { label: 'Acrylic', value: 'ACRYLIC' },
            { label: 'Mirror Acrylic', value: 'MIRROR_ACRYLIC' },
            { label: 'Other', value: 'OTHER' },
        ];
    }
    async list(query) {
        return this.getService().list({
            page: query.page,
            pageSize: query.pageSize,
        });
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
    async listStockMovements(id) {
        return this.getService().listStockMovements(id);
    }
    async createStockMovement(id, body) {
        return this.getService().createStockMovement(id, body);
    }
};
exports.MaterialsController = MaterialsController;
__decorate([
    (0, common_1.Get)('categories'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MaterialsController.prototype, "getCategories", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [PaginationQuery]),
    __metadata("design:returntype", Promise)
], MaterialsController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MaterialsController.prototype, "get", null);
__decorate([
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreateMaterialDto]),
    __metadata("design:returntype", Promise)
], MaterialsController.prototype, "create", null);
__decorate([
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, UpdateMaterialDto]),
    __metadata("design:returntype", Promise)
], MaterialsController.prototype, "update", null);
__decorate([
    (0, common_1.Get)(':id/stock-movements'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MaterialsController.prototype, "listStockMovements", null);
__decorate([
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, common_1.Post)(':id/stock-movements'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, CreateStockMovementDto]),
    __metadata("design:returntype", Promise)
], MaterialsController.prototype, "createStockMovement", null);
exports.MaterialsController = MaterialsController = __decorate([
    (0, swagger_1.ApiTags)('materials'),
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('materials'),
    __metadata("design:paramtypes", [materials_service_1.MaterialsService])
], MaterialsController);
