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
exports.FilesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let FilesService = class FilesService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async listForOrder(orderId) {
        await this.ensureOrderExists(orderId);
        return this.prisma.file.findMany({
            where: { orderId },
            orderBy: { createdAt: 'desc' },
        });
    }
    async listForOrderItem(orderId, orderItemId) {
        await this.ensureOrderAndItem(orderId, orderItemId);
        return this.prisma.file.findMany({
            where: { orderId, orderItemId },
            orderBy: { createdAt: 'desc' },
        });
    }
    async addForOrder(orderId, file) {
        await this.ensureOrderExists(orderId);
        const url = `/uploads/${file.filename}`;
        return this.prisma.file.create({
            data: {
                orderId,
                orderItemId: null,
                url,
                mime: file.mimetype,
                size: file.size,
            },
        });
    }
    async addForOrderItem(orderId, orderItemId, file) {
        await this.ensureOrderAndItem(orderId, orderItemId);
        const url = `/uploads/${file.filename}`;
        return this.prisma.file.create({
            data: {
                orderId,
                orderItemId,
                url,
                mime: file.mimetype,
                size: file.size,
            },
        });
    }
    async ensureOrderExists(orderId) {
        const order = await this.prisma.order.findUnique({ where: { id: orderId } });
        if (!order) {
            throw new common_1.NotFoundException('Order not found');
        }
        return order;
    }
    async ensureOrderAndItem(orderId, orderItemId) {
        await this.ensureOrderExists(orderId);
        const item = await this.prisma.orderItem.findUnique({ where: { id: orderItemId } });
        if (!item || item.orderId !== orderId) {
            throw new common_1.NotFoundException('Order item not found');
        }
        return item;
    }
};
exports.FilesService = FilesService;
exports.FilesService = FilesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], FilesService);
