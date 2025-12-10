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
exports.QuotesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let QuotesService = class QuotesService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async list(params) {
        const page = params.page && params.page > 0 ? params.page : 1;
        const pageSize = params.pageSize && params.pageSize > 0 ? params.pageSize : 20;
        const [quotes, total] = await this.prisma.$transaction([
            this.prisma.quote.findMany({
                include: { customer: true },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            this.prisma.quote.count(),
        ]);
        return {
            data: quotes,
            total,
            page,
            pageSize,
        };
    }
    async findOne(id) {
        const quote = await this.prisma.quote.findUnique({
            where: { id },
            include: { customer: true },
        });
        if (!quote) {
            throw new common_1.NotFoundException('Quote not found');
        }
        return quote;
    }
    async create(input) {
        if (input.customerId) {
            const customer = await this.prisma.customer.findUnique({
                where: { id: input.customerId },
            });
            if (!customer) {
                throw new common_1.NotFoundException('Customer not found');
            }
        }
        const created = await this.prisma.quote.create({
            data: {
                customerId: input.customerId,
                dataJson: input.data,
            },
        });
        return created;
    }
    async createOrderFromQuote(id, userId) {
        const quote = await this.prisma.quote.findUnique({ where: { id } });
        if (!quote) {
            throw new common_1.NotFoundException('Quote not found');
        }
        if (!quote.customerId) {
            throw new common_1.BadRequestException('Quote has no customer linked');
        }
        const customer = await this.prisma.customer.findUnique({
            where: { id: quote.customerId },
        });
        if (!customer) {
            throw new common_1.NotFoundException('Customer not found');
        }
        const data = (quote.dataJson || {});
        const pricingInput = data.pricingInput ?? data.input;
        const material = data.material;
        if (!pricingInput) {
            throw new common_1.BadRequestException('Quote is missing pricing input');
        }
        const order = await this.prisma.order.create({
            data: {
                customerId: quote.customerId,
                notes: `Created from quote ${quote.id}`,
                items: {
                    create: [
                        {
                            title: pricingInput.title || 'Item from quote',
                            materialId: material?.id,
                            quantity: pricingInput.quantity ?? 1,
                            widthMm: pricingInput.widthMm,
                            heightMm: pricingInput.heightMm,
                            customizationText: pricingInput.customizationText || undefined,
                            estimatedMinutes: typeof pricingInput.machineMinutes === 'number'
                                ? pricingInput.machineMinutes
                                : undefined,
                        },
                    ],
                },
                activityLog: {
                    create: {
                        userId,
                        field: 'SYSTEM',
                        oldValue: null,
                        newValue: `Order created from quote ${quote.id}`,
                    },
                },
            },
        });
        return order;
    }
};
exports.QuotesService = QuotesService;
exports.QuotesService = QuotesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], QuotesService);
//# sourceMappingURL=quotes.service.js.map