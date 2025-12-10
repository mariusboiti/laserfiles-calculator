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
exports.OrdersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
const pricing_engine_1 = require("../../../../packages/pricing-engine/src");
let OrdersService = class OrdersService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async list(params) {
        const page = params.page && params.page > 0 ? params.page : 1;
        const pageSize = params.pageSize && params.pageSize > 0 ? params.pageSize : 20;
        const where = {};
        if (params.status) {
            where.status = params.status;
        }
        if (params.customerId) {
            where.customerId = params.customerId;
        }
        if (params.priority) {
            where.priority = params.priority;
        }
        if (params.search) {
            where.OR = [
                { notes: { contains: params.search, mode: 'insensitive' } },
                {
                    customer: {
                        name: { contains: params.search, mode: 'insensitive' },
                    },
                },
            ];
        }
        const [orders, total] = await this.prisma.$transaction([
            this.prisma.order.findMany({
                where,
                include: {
                    customer: true,
                    _count: { select: { items: true } },
                },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            this.prisma.order.count({ where }),
        ]);
        return {
            data: orders,
            total,
            page,
            pageSize,
        };
    }
    async findOne(id) {
        const order = await this.prisma.order.findUnique({
            where: { id },
            include: {
                customer: true,
                items: {
                    include: {
                        material: true,
                        template: true,
                        templateVariant: true,
                        timeLogs: {
                            include: { user: true },
                        },
                    },
                },
                files: true,
                activityLog: {
                    include: { user: true },
                    orderBy: { createdAt: 'desc' },
                },
            },
        });
        if (!order) {
            throw new common_1.NotFoundException('Order not found');
        }
        return order;
    }
    async create(data, userId) {
        const customer = await this.prisma.customer.findUnique({
            where: { id: data.customerId },
        });
        if (!customer) {
            throw new common_1.NotFoundException('Customer not found');
        }
        const order = await this.prisma.order.create({
            data: {
                customerId: data.customerId,
                notes: data.notes,
                priority: data.priority ?? client_1.OrderPriority.NORMAL,
                items: {
                    create: data.items.map((item) => ({
                        title: item.title,
                        materialId: item.materialId,
                        quantity: item.quantity,
                        widthMm: item.widthMm,
                        heightMm: item.heightMm,
                        customizationText: item.customizationText,
                        estimatedMinutes: item.estimatedMinutes,
                    })),
                },
                activityLog: {
                    create: {
                        userId,
                        field: 'SYSTEM',
                        oldValue: null,
                        newValue: 'Order created',
                    },
                },
            },
            include: {
                items: true,
            },
        });
        return order;
    }
    async update(id, data, userId) {
        const existing = await this.prisma.order.findUnique({ where: { id } });
        if (!existing) {
            throw new common_1.NotFoundException('Order not found');
        }
        const changes = [];
        if (data.status && data.status !== existing.status) {
            changes.push({
                field: 'status',
                oldValue: existing.status,
                newValue: data.status,
            });
        }
        if (data.priority && data.priority !== existing.priority) {
            changes.push({
                field: 'priority',
                oldValue: existing.priority,
                newValue: data.priority,
            });
        }
        if (typeof data.notes !== 'undefined' && data.notes !== existing.notes) {
            changes.push({
                field: 'notes',
                oldValue: existing.notes ?? null,
                newValue: data.notes,
            });
        }
        const [updated] = await this.prisma.$transaction([
            this.prisma.order.update({
                where: { id },
                data: {
                    status: data.status,
                    priority: data.priority,
                    notes: data.notes,
                },
            }),
            ...changes.map((change) => this.prisma.orderActivityLog.create({
                data: {
                    orderId: id,
                    userId,
                    field: change.field,
                    oldValue: change.oldValue,
                    newValue: change.newValue,
                },
            })),
        ]);
        return updated;
    }
    async updateStatus(id, status, userId) {
        return this.update(id, { status }, userId);
    }
    async addItem(orderId, item, userId) {
        const order = await this.prisma.order.findUnique({ where: { id: orderId } });
        if (!order) {
            throw new common_1.NotFoundException('Order not found');
        }
        const created = await this.prisma.orderItem.create({
            data: {
                orderId,
                title: item.title,
                materialId: item.materialId,
                quantity: item.quantity,
                widthMm: item.widthMm,
                heightMm: item.heightMm,
                customizationText: item.customizationText,
                estimatedMinutes: item.estimatedMinutes,
            },
        });
        await this.prisma.orderActivityLog.create({
            data: {
                orderId,
                userId,
                field: 'item',
                oldValue: null,
                newValue: `Item added: ${item.title}`,
            },
        });
        return created;
    }
    async updateItem(orderId, itemId, data, userId) {
        const item = await this.prisma.orderItem.findUnique({ where: { id: itemId } });
        if (!item || item.orderId !== orderId) {
            throw new common_1.NotFoundException('Order item not found');
        }
        const updated = await this.prisma.orderItem.update({
            where: { id: itemId },
            data,
        });
        await this.prisma.orderActivityLog.create({
            data: {
                orderId,
                userId,
                field: 'item',
                oldValue: null,
                newValue: `Item updated: ${updated.title}`,
            },
        });
        return updated;
    }
    buildTemplateMetrics(personalization, fields, layersCount, quantity) {
        let characterCount = 0;
        for (const field of fields) {
            if (!field.affectsPricing)
                continue;
            if (field.fieldType !== 'TEXT')
                continue;
            const raw = personalization ? personalization[field.key] : undefined;
            if (typeof raw === 'string') {
                characterCount += raw.trim().length;
            }
        }
        const metrics = {
            characterCount,
            quantity,
        };
        if (typeof layersCount === 'number') {
            metrics.layersCount = layersCount;
        }
        return metrics;
    }
    filterAndMapTemplateRules(rules, variantId, personalization) {
        const result = [];
        for (const rule of rules) {
            if (rule.variantId && rule.variantId !== variantId) {
                continue;
            }
            const cond = rule.appliesWhenJson;
            if (cond && typeof cond === 'object') {
                let matches = true;
                for (const [key, expected] of Object.entries(cond)) {
                    const actual = personalization ? personalization[key] : undefined;
                    if (actual !== expected) {
                        matches = false;
                        break;
                    }
                }
                if (!matches)
                    continue;
            }
            result.push({
                id: rule.id,
                ruleType: rule.ruleType,
                value: rule.value,
                priority: rule.priority,
            });
        }
        return result;
    }
    async addItemFromTemplate(orderId, input, userId) {
        const order = await this.prisma.order.findUnique({ where: { id: orderId } });
        if (!order) {
            throw new common_1.NotFoundException('Order not found');
        }
        const template = await this.prisma.productTemplate.findUnique({
            where: { id: input.templateId },
            include: {
                fields: true,
                pricingRules: true,
                variants: true,
            },
        });
        if (!template) {
            throw new common_1.NotFoundException('Template not found');
        }
        const variant = input.variantId
            ? template.variants.find((v) => v.id === input.variantId)
            : undefined;
        if (input.variantId && !variant) {
            throw new common_1.NotFoundException('Template variant not found');
        }
        const materialId = input.materialId ?? variant?.defaultMaterialId ?? template.defaultMaterialId;
        if (!materialId) {
            throw new common_1.BadRequestException('Material is required for a template item');
        }
        const material = await this.prisma.material.findUnique({
            where: { id: materialId },
        });
        if (!material) {
            throw new common_1.NotFoundException('Material not found');
        }
        const quantity = input.quantity && input.quantity > 0 ? input.quantity : 1;
        const personalization = input.personalization ?? {};
        const widthMm = variant?.widthMm ?? template.baseWidthMm ?? 100;
        const heightMm = variant?.heightMm ?? template.baseHeightMm ?? 100;
        const metrics = this.buildTemplateMetrics(personalization, template.fields.map((f) => ({
            key: f.key,
            fieldType: f.fieldType,
            affectsPricing: f.affectsPricing,
        })), template.layersCount ?? null, quantity);
        const rules = this.filterAndMapTemplateRules(template.pricingRules, variant ? variant.id : null, personalization);
        const pricingInput = {
            materialId: material.id,
            quantity,
            widthMm,
            heightMm,
            wastePercent: material.defaultWastePercent ?? 15,
            machineMinutes: 0,
            machineHourlyCost: 0,
            addOnIds: [],
            targetMarginPercent: 40,
        };
        const breakdown = (0, pricing_engine_1.calculatePrice)(pricingInput, {
            material: {
                id: material.id,
                unitType: material.unitType,
                costPerSheet: material.costPerSheet ? Number(material.costPerSheet) : null,
                costPerM2: material.costPerM2 ? Number(material.costPerM2) : null,
                sheetWidthMm: material.sheetWidthMm,
                sheetHeightMm: material.sheetHeightMm,
            },
            addOns: [],
            templatePricing: rules.length
                ? {
                    rules,
                    metrics,
                }
                : undefined,
        });
        const derivedFields = {
            templateId: template.id,
            templateVariantId: variant ? variant.id : null,
            quantity,
            widthMm,
            heightMm,
            layersCount: template.layersCount ?? null,
            characterCount: metrics.characterCount ?? 0,
        };
        const title = variant ? `${template.name} – ${variant.name}` : template.name;
        if (input.dryRun) {
            return {
                dryRun: true,
                orderId,
                templateId: template.id,
                templateVariantId: variant ? variant.id : null,
                materialId,
                quantity,
                widthMm,
                heightMm,
                title,
                personalization,
                derivedFields,
                price: breakdown,
            };
        }
        const created = await this.prisma.orderItem.create({
            data: {
                orderId,
                title,
                materialId,
                quantity,
                widthMm,
                heightMm,
                templateId: template.id,
                templateVariantId: variant ? variant.id : null,
                personalizationJson: personalization,
                derivedFieldsJson: derivedFields,
                priceSnapshotJson: breakdown,
            },
        });
        await this.prisma.orderActivityLog.create({
            data: {
                orderId,
                userId,
                field: 'item',
                oldValue: null,
                newValue: `Item added from template: ${title}`,
            },
        });
        return created;
    }
    async bulkAddFromTemplate(orderId, input, userId) {
        if (!input.items || input.items.length === 0) {
            throw new common_1.BadRequestException('No items provided');
        }
        const order = await this.prisma.order.findUnique({ where: { id: orderId } });
        if (!order) {
            throw new common_1.NotFoundException('Order not found');
        }
        const template = await this.prisma.productTemplate.findUnique({
            where: { id: input.templateId },
            include: {
                fields: true,
                pricingRules: true,
                variants: true,
            },
        });
        if (!template) {
            throw new common_1.NotFoundException('Template not found');
        }
        const variant = input.variantId
            ? template.variants.find((v) => v.id === input.variantId)
            : undefined;
        if (input.variantId && !variant) {
            throw new common_1.NotFoundException('Template variant not found');
        }
        const materialId = input.materialId ?? variant?.defaultMaterialId ?? template.defaultMaterialId;
        if (!materialId) {
            throw new common_1.BadRequestException('Material is required for a template item');
        }
        const material = await this.prisma.material.findUnique({
            where: { id: materialId },
        });
        if (!material) {
            throw new common_1.NotFoundException('Material not found');
        }
        const titleBase = variant ? `${template.name} – ${variant.name}` : template.name;
        const results = [];
        for (const item of input.items) {
            const quantity = item.quantity && item.quantity > 0 ? item.quantity : 1;
            const personalization = item.personalization ?? {};
            const widthMm = variant?.widthMm ?? template.baseWidthMm ?? 100;
            const heightMm = variant?.heightMm ?? template.baseHeightMm ?? 100;
            const metrics = this.buildTemplateMetrics(personalization, template.fields.map((f) => ({
                key: f.key,
                fieldType: f.fieldType,
                affectsPricing: f.affectsPricing,
            })), template.layersCount ?? null, quantity);
            const rules = this.filterAndMapTemplateRules(template.pricingRules, variant ? variant.id : null, personalization);
            const pricingInput = {
                materialId: material.id,
                quantity,
                widthMm,
                heightMm,
                wastePercent: material.defaultWastePercent ?? 15,
                machineMinutes: 0,
                machineHourlyCost: 0,
                addOnIds: [],
                targetMarginPercent: 40,
            };
            const breakdown = (0, pricing_engine_1.calculatePrice)(pricingInput, {
                material: {
                    id: material.id,
                    unitType: material.unitType,
                    costPerSheet: material.costPerSheet ? Number(material.costPerSheet) : null,
                    costPerM2: material.costPerM2 ? Number(material.costPerM2) : null,
                    sheetWidthMm: material.sheetWidthMm,
                    sheetHeightMm: material.sheetHeightMm,
                },
                addOns: [],
                templatePricing: rules.length
                    ? {
                        rules,
                        metrics,
                    }
                    : undefined,
            });
            const derivedFields = {
                templateId: template.id,
                templateVariantId: variant ? variant.id : null,
                quantity,
                widthMm,
                heightMm,
                layersCount: template.layersCount ?? null,
                characterCount: metrics.characterCount ?? 0,
            };
            const title = titleBase;
            if (input.dryRun) {
                results.push({
                    dryRun: true,
                    orderId,
                    templateId: template.id,
                    templateVariantId: variant ? variant.id : null,
                    materialId,
                    quantity,
                    widthMm,
                    heightMm,
                    title,
                    personalization,
                    derivedFields,
                    price: breakdown,
                });
            }
            else {
                const created = await this.prisma.orderItem.create({
                    data: {
                        orderId,
                        title,
                        materialId,
                        quantity,
                        widthMm,
                        heightMm,
                        templateId: template.id,
                        templateVariantId: variant ? variant.id : null,
                        personalizationJson: personalization,
                        derivedFieldsJson: derivedFields,
                        priceSnapshotJson: breakdown,
                    },
                });
                results.push(created);
            }
        }
        if (!input.dryRun) {
            await this.prisma.orderActivityLog.create({
                data: {
                    orderId,
                    userId,
                    field: 'item',
                    oldValue: null,
                    newValue: `Bulk items added from template: ${titleBase} (${results.length})`,
                },
            });
        }
        return {
            orderId,
            items: results,
            dryRun: !!input.dryRun,
        };
    }
};
exports.OrdersService = OrdersService;
exports.OrdersService = OrdersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], OrdersService);
//# sourceMappingURL=orders.service.js.map