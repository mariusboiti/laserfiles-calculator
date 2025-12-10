import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface ListTemplateProductsParams {
  search?: string;
  templateId?: string;
  isActive?: boolean;
}

interface CreateTemplateProductInput {
  name: string;
  templateId: string;
  variantId?: string;
  materialId?: string;
  defaultQuantity: number;
  personalizationJson?: any;
  priceOverride?: number | null;
  isActive?: boolean;
}

interface UpdateTemplateProductInput extends Partial<CreateTemplateProductInput> {}

@Injectable()
export class TemplateProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(params: ListTemplateProductsParams) {
    const where: any = {};

    if (params.templateId) {
      where.templateId = params.templateId;
    }

    if (typeof params.isActive === 'boolean') {
      where.isActive = params.isActive;
    }

    if (params.search) {
      where.name = { contains: params.search, mode: 'insensitive' };
    }

    const items = await this.prisma.templateProduct.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        template: true,
        variant: true,
        material: true,
      },
    });

    return {
      data: items,
      total: items.length,
    };
  }

  async findOne(id: string) {
    const item = await this.prisma.templateProduct.findUnique({
      where: { id },
      include: {
        template: true,
        variant: true,
        material: true,
      },
    });

    if (!item) {
      throw new NotFoundException('Template product not found');
    }

    return item;
  }

  async create(input: CreateTemplateProductInput) {
    return this.prisma.templateProduct.create({
      data: {
        name: input.name,
        templateId: input.templateId,
        variantId: input.variantId,
        materialId: input.materialId,
        defaultQuantity: input.defaultQuantity,
        personalizationJson: input.personalizationJson,
        priceOverride:
          typeof input.priceOverride === 'number' ? input.priceOverride : null,
        isActive: input.isActive ?? true,
      },
    });
  }

  async update(id: string, input: UpdateTemplateProductInput) {
    await this.ensureExists(id);

    return this.prisma.templateProduct.update({
      where: { id },
      data: {
        name: input.name,
        templateId: input.templateId,
        variantId: input.variantId,
        materialId: input.materialId,
        defaultQuantity: input.defaultQuantity,
        personalizationJson: input.personalizationJson,
        priceOverride:
          typeof input.priceOverride !== 'undefined'
            ? input.priceOverride
            : undefined,
        isActive: input.isActive,
      },
    });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    return this.prisma.templateProduct.delete({ where: { id } });
  }

  private async ensureExists(id: string) {
    const item = await this.prisma.templateProduct.findUnique({ where: { id } });
    if (!item) {
      throw new NotFoundException('Template product not found');
    }
    return item;
  }
}
