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
exports.AnalyticsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let AnalyticsService = class AnalyticsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async dashboard() {
        const now = new Date();
        const startOfWeek = this.getStartOfWeek(now);
        let ordersThisWeek = 0;
        let revenueEstimateThisWeek = 0;
        let topMaterialsByUsage = [];
        let averageProductionMinutesPerItem = 0;
        try {
            const [ordersCount, topMaterials, avgProduction] = await this.prisma.$transaction([
                // Orders this week
                this.prisma.order.count({
                    where: {
                        createdAt: { gte: startOfWeek },
                    },
                }),
                // Top materials by usage: count of order items per material
                this.prisma.orderItem.groupBy({
                    by: ['materialId'],
                    _count: { _all: true },
                    where: { materialId: { not: null } },
                    orderBy: { _count: { _all: 'desc' } },
                    take: 5,
                }),
                // Average production time per item: from TimeLog
                this.prisma.timeLog.aggregate({
                    _avg: {
                        durationMinutes: true,
                    },
                }),
            ]);
            ordersThisWeek = ordersCount;
            // For revenue, we approximate by summing priceSnapshotJson.recommendedPrice in JS.
            const orderItems = await this.prisma.orderItem.findMany({
                where: { createdAt: { gte: startOfWeek } },
                select: { priceSnapshotJson: true },
            });
            revenueEstimateThisWeek = orderItems.reduce((sum, item) => {
                const price = item.priceSnapshotJson &&
                    typeof item.priceSnapshotJson.recommendedPrice === 'number'
                    ? item.priceSnapshotJson.recommendedPrice
                    : 0;
                return sum + price;
            }, 0);
            const materials = await this.prisma.material.findMany({
                where: {
                    id: { in: topMaterials.map((m) => m.materialId).filter(Boolean) },
                },
            });
            topMaterialsByUsage = topMaterials.map((m) => ({
                materialId: m.materialId,
                materialName: materials.find((mat) => mat.id === m.materialId)?.name || 'Unknown',
                count: m._count?._all ?? 0,
            }));
            averageProductionMinutesPerItem =
                avgProduction._avg.durationMinutes ?? 0;
        }
        catch (err) {
            console.error('Error in AnalyticsService.dashboard', err);
        }
        return {
            ordersThisWeek,
            revenueEstimateThisWeek,
            topMaterialsByUsage,
            averageProductionMinutesPerItem,
        };
    }
    getStartOfWeek(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday as first day
        const start = new Date(d.setDate(diff));
        start.setHours(0, 0, 0, 0);
        return start;
    }
};
exports.AnalyticsService = AnalyticsService;
exports.AnalyticsService = AnalyticsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AnalyticsService);
//# sourceMappingURL=analytics.service.js.map