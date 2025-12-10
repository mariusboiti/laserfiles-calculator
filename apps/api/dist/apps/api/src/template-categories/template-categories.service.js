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
exports.TemplateCategoriesService = void 0;
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
let TemplateCategoriesService = class TemplateCategoriesService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async list() {
        return this.prisma.templateCategory.findMany({
            orderBy: { name: 'asc' },
        });
    }
    async findOne(id) {
        const category = await this.prisma.templateCategory.findUnique({ where: { id } });
        if (!category) {
            throw new common_1.NotFoundException('Template category not found');
        }
        return category;
    }
    async ensureUniqueSlug(base, excludeId) {
        let slug = base || 'category';
        let attempt = 1;
        while (true) {
            const existing = await this.prisma.templateCategory.findFirst({
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
        const baseSlug = slugify(input.slug || input.name);
        const slug = await this.ensureUniqueSlug(baseSlug);
        return this.prisma.templateCategory.create({
            data: {
                name: input.name,
                slug,
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
        return this.prisma.templateCategory.update({
            where: { id },
            data: {
                name: input.name ?? existing.name,
                slug,
            },
        });
    }
};
exports.TemplateCategoriesService = TemplateCategoriesService;
exports.TemplateCategoriesService = TemplateCategoriesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TemplateCategoriesService);
