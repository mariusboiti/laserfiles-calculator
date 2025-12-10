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
exports.TemplatesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
function slugify(input) {
    return input
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 64);
}
let TemplatesService = class TemplatesService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async list(params) {
        const where = {};
        if (params.categoryId) {
            where.categoryId = params.categoryId;
        }
        if (typeof params.isActive === 'boolean') {
            where.isActive = params.isActive;
        }
        if (params.search) {
            where.OR = [
                { name: { contains: params.search, mode: 'insensitive' } },
                { description: { contains: params.search, mode: 'insensitive' } },
            ];
        }
        const templates = await this.prisma.productTemplate.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                category: true,
                defaultMaterial: true,
                _count: {
                    select: {
                        variants: true,
                        fields: true,
                        pricingRules: true,
                    },
                },
            },
        });
        return {
            data: templates,
            total: templates.length,
        };
    }
    async findOne(id) {
        const template = await this.prisma.productTemplate.findUnique({
            where: { id },
            include: {
                category: true,
                defaultMaterial: true,
                variants: true,
                fields: true,
                pricingRules: {
                    orderBy: { priority: 'asc' },
                },
            },
        });
        if (!template) {
            throw new common_1.NotFoundException('Template not found');
        }
        return template;
    }
    async ensureUniqueSlug(base, excludeId) {
        let slug = base || 'template';
        let attempt = 1;
        while (true) {
            const existing = await this.prisma.productTemplate.findFirst({
                where: {
                    slug,
                    ...(excludeId ? { id: { not: excludeId } } : {}),
                },
            });
            if (!existing)
                return slug;
            attempt += 1;
            slug = `${base}-${attempt}`.slice(0, 64);
        }
    }
    async create(input) {
        const baseSlug = slugify(input.name);
        const slug = await this.ensureUniqueSlug(baseSlug);
        return this.prisma.productTemplate.create({
            data: {
                name: input.name,
                slug,
                categoryId: input.categoryId,
                defaultMaterialId: input.defaultMaterialId,
                baseWidthMm: input.baseWidthMm,
                baseHeightMm: input.baseHeightMm,
                layersCount: input.layersCount,
                description: input.description,
                isActive: input.isActive ?? true,
            },
        });
    }
    async update(id, input) {
        const existing = await this.findOne(id);
        let slug = existing.slug;
        if (typeof input.slug === 'string' && input.slug.trim()) {
            const baseSlug = slugify(input.slug);
            slug = await this.ensureUniqueSlug(baseSlug, id);
        }
        return this.prisma.productTemplate.update({
            where: { id },
            data: {
                name: input.name ?? existing.name,
                slug,
                categoryId: input.categoryId ?? existing.categoryId,
                defaultMaterialId: typeof input.defaultMaterialId !== 'undefined'
                    ? input.defaultMaterialId
                    : existing.defaultMaterialId,
                baseWidthMm: typeof input.baseWidthMm !== 'undefined'
                    ? input.baseWidthMm
                    : existing.baseWidthMm,
                baseHeightMm: typeof input.baseHeightMm !== 'undefined'
                    ? input.baseHeightMm
                    : existing.baseHeightMm,
                layersCount: typeof input.layersCount !== 'undefined'
                    ? input.layersCount
                    : existing.layersCount,
                description: typeof input.description !== 'undefined'
                    ? input.description
                    : existing.description,
                isActive: typeof input.isActive !== 'undefined' ? input.isActive : existing.isActive,
            },
        });
    }
    async duplicate(id) {
        const template = await this.prisma.productTemplate.findUnique({
            where: { id },
            include: {
                variants: true,
                fields: true,
                pricingRules: true,
            },
        });
        if (!template) {
            throw new common_1.NotFoundException('Template not found');
        }
        const baseName = `${template.name} Copy`;
        const baseSlug = slugify(`${template.slug}-copy`);
        const slug = await this.ensureUniqueSlug(baseSlug);
        return this.prisma.$transaction(async (tx) => {
            const newTemplate = await tx.productTemplate.create({
                data: {
                    name: baseName,
                    slug,
                    categoryId: template.categoryId,
                    defaultMaterialId: template.defaultMaterialId,
                    baseWidthMm: template.baseWidthMm,
                    baseHeightMm: template.baseHeightMm,
                    layersCount: template.layersCount,
                    description: template.description,
                    isActive: template.isActive,
                },
            });
            const variantIdMap = new Map();
            for (const variant of template.variants) {
                const createdVariant = await tx.templateVariant.create({
                    data: {
                        templateId: newTemplate.id,
                        name: variant.name,
                        defaultMaterialId: variant.defaultMaterialId,
                        widthMm: variant.widthMm,
                        heightMm: variant.heightMm,
                        isActive: variant.isActive,
                    },
                });
                variantIdMap.set(variant.id, createdVariant.id);
            }
            for (const field of template.fields) {
                await tx.templatePersonalizationField.create({
                    data: {
                        templateId: newTemplate.id,
                        key: field.key,
                        label: field.label,
                        fieldType: field.fieldType,
                        required: field.required,
                        minNumber: field.minNumber,
                        maxNumber: field.maxNumber,
                        maxLength: field.maxLength,
                        optionsJson: field.optionsJson,
                        affectsPricing: field.affectsPricing,
                        affectsProductionNotes: field.affectsProductionNotes,
                    },
                });
            }
            for (const rule of template.pricingRules) {
                await tx.templatePricingRule.create({
                    data: {
                        templateId: newTemplate.id,
                        variantId: rule.variantId ? variantIdMap.get(rule.variantId) ?? null : null,
                        ruleType: rule.ruleType,
                        value: rule.value,
                        appliesWhenJson: rule.appliesWhenJson,
                        priority: rule.priority,
                    },
                });
            }
            return newTemplate;
        });
    }
    async listVariants(templateId) {
        await this.ensureTemplateExists(templateId);
        return this.prisma.templateVariant.findMany({
            where: { templateId },
            orderBy: { createdAt: 'asc' },
        });
    }
    async createVariant(templateId, input) {
        await this.ensureTemplateExists(templateId);
        return this.prisma.templateVariant.create({
            data: {
                templateId,
                name: input.name,
                defaultMaterialId: input.defaultMaterialId,
                widthMm: input.widthMm,
                heightMm: input.heightMm,
                isActive: input.isActive ?? true,
            },
        });
    }
    async updateVariant(templateId, variantId, input) {
        const variant = await this.prisma.templateVariant.findUnique({ where: { id: variantId } });
        if (!variant || variant.templateId !== templateId) {
            throw new common_1.NotFoundException('Template variant not found');
        }
        return this.prisma.templateVariant.update({
            where: { id: variantId },
            data: {
                name: input.name ?? variant.name,
                defaultMaterialId: typeof input.defaultMaterialId !== 'undefined'
                    ? input.defaultMaterialId
                    : variant.defaultMaterialId,
                widthMm: typeof input.widthMm !== 'undefined' ? input.widthMm : variant.widthMm,
                heightMm: typeof input.heightMm !== 'undefined' ? input.heightMm : variant.heightMm,
                isActive: typeof input.isActive !== 'undefined' ? input.isActive : variant.isActive,
            },
        });
    }
    async listFields(templateId) {
        await this.ensureTemplateExists(templateId);
        return this.prisma.templatePersonalizationField.findMany({
            where: { templateId },
            orderBy: { createdAt: 'asc' },
        });
    }
    async createField(templateId, input) {
        await this.ensureTemplateExists(templateId);
        const existingWithKey = await this.prisma.templatePersonalizationField.findFirst({
            where: { templateId, key: input.key },
        });
        if (existingWithKey) {
            throw new Error('A field with this key already exists for the template');
        }
        return this.prisma.templatePersonalizationField.create({
            data: {
                templateId,
                key: input.key,
                label: input.label,
                fieldType: input.fieldType,
                required: input.required ?? false,
                minNumber: input.minNumber,
                maxNumber: input.maxNumber,
                maxLength: input.maxLength,
                optionsJson: input.optionsJson,
                affectsPricing: input.affectsPricing ?? false,
                affectsProductionNotes: input.affectsProductionNotes ?? false,
            },
        });
    }
    async updateField(templateId, fieldId, input) {
        const field = await this.prisma.templatePersonalizationField.findUnique({
            where: { id: fieldId },
        });
        if (!field || field.templateId !== templateId) {
            throw new common_1.NotFoundException('Template field not found');
        }
        if (input.key && input.key !== field.key) {
            const existingWithKey = await this.prisma.templatePersonalizationField.findFirst({
                where: { templateId, key: input.key },
            });
            if (existingWithKey) {
                throw new Error('A field with this key already exists for the template');
            }
        }
        return this.prisma.templatePersonalizationField.update({
            where: { id: fieldId },
            data: {
                key: input.key ?? field.key,
                label: input.label ?? field.label,
                fieldType: input.fieldType ?? field.fieldType,
                required: typeof input.required !== 'undefined' ? input.required : field.required,
                minNumber: typeof input.minNumber !== 'undefined' ? input.minNumber : field.minNumber,
                maxNumber: typeof input.maxNumber !== 'undefined' ? input.maxNumber : field.maxNumber,
                maxLength: typeof input.maxLength !== 'undefined' ? input.maxLength : field.maxLength,
                optionsJson: typeof input.optionsJson !== 'undefined'
                    ? input.optionsJson
                    : field.optionsJson,
                affectsPricing: typeof input.affectsPricing !== 'undefined'
                    ? input.affectsPricing
                    : field.affectsPricing,
                affectsProductionNotes: typeof input.affectsProductionNotes !== 'undefined'
                    ? input.affectsProductionNotes
                    : field.affectsProductionNotes,
            },
        });
    }
    async listPricingRules(templateId) {
        await this.ensureTemplateExists(templateId);
        return this.prisma.templatePricingRule.findMany({
            where: { templateId },
            orderBy: { priority: 'asc' },
        });
    }
    async createPricingRule(templateId, input) {
        await this.ensureTemplateExists(templateId);
        return this.prisma.templatePricingRule.create({
            data: {
                templateId,
                variantId: input.variantId,
                ruleType: input.ruleType,
                value: input.value,
                appliesWhenJson: input.appliesWhenJson,
                priority: input.priority ?? 0,
            },
        });
    }
    async updatePricingRule(templateId, ruleId, input) {
        const rule = await this.prisma.templatePricingRule.findUnique({ where: { id: ruleId } });
        if (!rule || rule.templateId !== templateId) {
            throw new common_1.NotFoundException('Template pricing rule not found');
        }
        return this.prisma.templatePricingRule.update({
            where: { id: ruleId },
            data: {
                ruleType: input.ruleType ?? rule.ruleType,
                value: typeof input.value !== 'undefined' ? input.value : rule.value,
                variantId: typeof input.variantId !== 'undefined' ? input.variantId : rule.variantId,
                appliesWhenJson: typeof input.appliesWhenJson !== 'undefined'
                    ? input.appliesWhenJson
                    : rule.appliesWhenJson,
                priority: typeof input.priority !== 'undefined' ? input.priority : rule.priority,
            },
        });
    }
    async ensureTemplateExists(id) {
        const template = await this.prisma.productTemplate.findUnique({ where: { id } });
        if (!template) {
            throw new common_1.NotFoundException('Template not found');
        }
        return template;
    }
};
exports.TemplatesService = TemplatesService;
exports.TemplatesService = TemplatesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TemplatesService);
//# sourceMappingURL=templates.service.js.map