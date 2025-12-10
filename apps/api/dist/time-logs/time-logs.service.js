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
exports.TimeLogsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let TimeLogsService = class TimeLogsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async listForItem(orderId, orderItemId) {
        const item = await this.ensureOrderItem(orderId, orderItemId);
        return this.prisma.timeLog.findMany({
            where: { orderItemId: item.id },
            include: { user: true },
            orderBy: { startAt: 'desc' },
        });
    }
    async start(orderId, orderItemId, userId) {
        const item = await this.ensureOrderItem(orderId, orderItemId);
        const activeLog = await this.prisma.timeLog.findFirst({
            where: {
                orderItemId: item.id,
                userId,
                endAt: null,
            },
        });
        if (activeLog) {
            throw new common_1.BadRequestException('There is already an active timer for this item and user');
        }
        const log = await this.prisma.timeLog.create({
            data: {
                orderItemId: item.id,
                userId,
                startAt: new Date(),
            },
        });
        return log;
    }
    async stop(orderId, orderItemId, userId) {
        const item = await this.ensureOrderItem(orderId, orderItemId);
        const activeLog = await this.prisma.timeLog.findFirst({
            where: {
                orderItemId: item.id,
                userId,
                endAt: null,
            },
            orderBy: { startAt: 'desc' },
        });
        if (!activeLog) {
            throw new common_1.BadRequestException('No active timer found for this item and user');
        }
        const endAt = new Date();
        const durationMinutes = Math.max(1, Math.round((endAt.getTime() - activeLog.startAt.getTime()) / 60000));
        const updated = await this.prisma.timeLog.update({
            where: { id: activeLog.id },
            data: {
                endAt,
                durationMinutes,
            },
        });
        return updated;
    }
    async ensureOrderItem(orderId, orderItemId) {
        const item = await this.prisma.orderItem.findUnique({
            where: { id: orderItemId },
            include: { order: true },
        });
        if (!item || item.orderId !== orderId) {
            throw new common_1.NotFoundException('Order item not found');
        }
        return item;
    }
};
exports.TimeLogsService = TimeLogsService;
exports.TimeLogsService = TimeLogsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TimeLogsService);
