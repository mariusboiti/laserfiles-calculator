import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface CreateTemplateCategoryInput {
  name: string;
  slug?: string;
}

interface UpdateTemplateCategoryInput {
  name?: string;
  slug?: string;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

@Injectable()
export class TemplateCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    return this.prisma.templateCategory.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const category = await this.prisma.templateCategory.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundException('Template category not found');
    }
    return category;
  }

  private async ensureUniqueSlug(base: string, excludeId?: string) {
    let slug = base || 'category';
    let attempt = 1;
    while (true) {
      const existing = await this.prisma.templateCategory.findFirst({
        where: {
          slug,
          ...(excludeId ? { id: { not: excludeId } } : {}),
        },
      });
      if (!existing) return slug;
      attempt += 1;
      slug = `${base}-${attempt}`.slice(0, 64);
    }
  }

  async create(input: CreateTemplateCategoryInput) {
    const baseSlug = slugify(input.slug || input.name);
    const slug = await this.ensureUniqueSlug(baseSlug);

    return this.prisma.templateCategory.create({
      data: {
        name: input.name,
        slug,
      },
    });
  }

  async update(id: string, input: UpdateTemplateCategoryInput) {
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
}
