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
Object.defineProperty(exports, "__esModule", { value: true });
exports.MaterialsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
let MaterialsService = class MaterialsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async list(params) {
        const page = params.page && params.page > 0 ? params.page : 1;
        const pageSize = params.pageSize && params.pageSize > 0 ? params.pageSize : 20;
        const [items, total] = await this.prisma.$transaction([
            this.prisma.material.findMany({
                skip: (page - 1) * pageSize,
                take: pageSize,
                orderBy: { name: 'asc' },
            }),
            this.prisma.material.count(),
        ]);
        return {
            data: items.map((m) => ({
                ...m,
                isLowStock: m.stockQty <= m.lowStockThreshold,
            })),
            total,
            page,
            pageSize,
        };
    }
    async findOne(id) {
        const material = await this.prisma.material.findUnique({ where: { id } });
        if (!material) {
            throw new common_1.NotFoundException('Material not found');
        }
        return {
            ...material,
            isLowStock: material.stockQty <= material.lowStockThreshold,
        };
    }
    async create(data) {
        const created = await this.prisma.material.create({
            data: {
                name: data.name,
                category: data.category,
                thicknessMm: data.thicknessMm,
                unitType: data.unitType,
                costPerSheet: data.costPerSheet,
                costPerM2: data.costPerM2,
                sheetWidthMm: data.sheetWidthMm,
                sheetHeightMm: data.sheetHeightMm,
                stockQty: data.stockQty ?? 0,
                lowStockThreshold: data.lowStockThreshold ?? 0,
                defaultWastePercent: data.defaultWastePercent,
            },
        });
        return {
            ...created,
            isLowStock: created.stockQty <= created.lowStockThreshold,
        };
    }
    async update(id, data) {
        await this.ensureExists(id);
        const updated = await this.prisma.material.update({
            where: { id },
            data: {
                ...data,
                category: data.category,
                unitType: data.unitType,
            },
        });
        return {
            ...updated,
            isLowStock: updated.stockQty <= updated.lowStockThreshold,
        };
    }
    async listStockMovements(materialId) {
        await this.ensureExists(materialId);
        return this.prisma.stockMovement.findMany({
            where: { materialId },
            orderBy: { createdAt: 'desc' },
        });
    }
    async createStockMovement(materialId, data) {
        const material = await this.ensureExists(materialId);
        let newStock = material.stockQty;
        if (data.type === client_1.StockMovementType.IN) {
            newStock += data.qty;
        }
        else if (data.type === client_1.StockMovementType.OUT) {
            newStock = Math.max(0, material.stockQty - data.qty);
        }
        else if (data.type === client_1.StockMovementType.ADJUST) {
            newStock = data.qty;
        }
        const [movement, updatedMaterial] = await this.prisma.$transaction([
            this.prisma.stockMovement.create({
                data: {
                    materialId,
                    type: data.type,
                    qty: data.qty,
                    note: data.note,
                },
            }),
            this.prisma.material.update({
                where: { id: materialId },
                data: { stockQty: newStock },
            }),
        ]);
        return {
            movement,
            material: {
                ...updatedMaterial,
                isLowStock: updatedMaterial.stockQty <= updatedMaterial.lowStockThreshold,
            },
        };
    }
    async ensureExists(id) {
        const material = await this.prisma.material.findUnique({ where: { id } });
        if (!material) {
            throw new common_1.NotFoundException('Material not found');
        }
        return material;
    }
};
exports.MaterialsService = MaterialsService;
exports.MaterialsService = MaterialsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], MaterialsService);
//# sourceMappingURL=materials.service.js.map