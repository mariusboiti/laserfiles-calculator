import { BadRequestException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderPriority, OrderStatus } from '@prisma/client';
import { SalesChannelsStatusSyncService } from '../sales-channels/sales-channels.status-sync.service';
import {
  calculatePrice,
  TemplatePricingMetrics,
  TemplatePricingRuleInput,
} from '@laser/pricing-engine';

interface ListOrdersParams {
  page?: number;
  pageSize?: number;
  status?: OrderStatus;
  customerId?: string;
  priority?: OrderPriority;
  search?: string;
}

interface CreateOrderItemInput {
  title: string;
  materialId?: string;
  quantity: number;
  widthMm?: number;
  heightMm?: number;
  customizationText?: string;
  estimatedMinutes?: number;
}

interface CreateOrderInput {
  customerId: string;
  notes?: string;
  priority?: OrderPriority;
  items: CreateOrderItemInput[];
}

interface UpdateOrderInput {
  status?: OrderStatus;
  priority?: OrderPriority;
  notes?: string | null;
}

interface AddItemFromTemplateInput {
  templateId: string;
  variantId?: string;
  materialId?: string;
  quantity?: number;
  personalization?: any;
  dryRun?: boolean;
  templateProductId?: string;
  priceOverride?: number;
}

interface BulkAddFromTemplateItemInput {
  quantity?: number;
  personalization?: any;
}

interface BulkAddFromTemplateInput {
  templateId: string;
  variantId?: string;
  materialId?: string;
  items: BulkAddFromTemplateItemInput[];
  dryRun?: boolean;
}

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly statusSync?: SalesChannelsStatusSyncService,
  ) {}

  async list(params: ListOrdersParams) {
    const page = params.page && params.page > 0 ? params.page : 1;
    const pageSize = params.pageSize && params.pageSize > 0 ? params.pageSize : 20;

    const where: any = {};

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

  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        items: {
          include: {
            material: true,
            template: true,
            templateVariant: true,
            templateProduct: true,
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
        externalLinks: {
          include: {
            externalOrder: true,
            connection: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async create(data: CreateOrderInput, userId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: data.customerId },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const order = await this.prisma.order.create({
      data: {
        customerId: data.customerId,
        notes: data.notes,
        priority: data.priority ?? OrderPriority.NORMAL,
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

  async update(id: string, data: UpdateOrderInput, userId: string) {
    const existing = await this.prisma.order.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Order not found');
    }

    const changes: { field: string; oldValue: string | null; newValue: string | null }[] = [];

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
      ...changes.map((change) =>
        this.prisma.orderActivityLog.create({
          data: {
            orderId: id,
            userId,
            field: change.field,
            oldValue: change.oldValue,
            newValue: change.newValue,
          },
        }),
      ),
    ]);

    if (data.status && data.status === OrderStatus.SHIPPED && existing.status !== OrderStatus.SHIPPED) {
      if (this.statusSync) {
        this.statusSync
          .pushShippedStatusForOrder(id)
          .catch(() => {
            // Best-effort: ignore errors from external status sync.
          });
      }
    }

    return updated;
  }

  async updateStatus(id: string, status: OrderStatus, userId: string) {
    return this.update(id, { status }, userId);
  }

  async getExternalSyncStatus(orderId: string) {
    if (!this.statusSync) {
      return { links: [] };
    }
    return this.statusSync.getStatusForOrder(orderId);
  }

  async retryExternalStatus(orderId: string) {
    if (!this.statusSync) {
      return { attempts: 0, successes: 0, failures: 0, results: [] };
    }
    return this.statusSync.pushShippedStatusForOrder(orderId, { force: true });
  }

  async addItem(orderId: string, item: CreateOrderItemInput, userId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException('Order not found');
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

  async updateItem(
    orderId: string,
    itemId: string,
    data: Partial<CreateOrderItemInput>,
    userId: string,
  ) {
    const item = await this.prisma.orderItem.findUnique({ where: { id: itemId } });
    if (!item || item.orderId !== orderId) {
      throw new NotFoundException('Order item not found');
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

  private buildTemplateMetrics(
    personalization: any,
    fields: { key: string; fieldType: string; affectsPricing: boolean }[],
    layersCount: number | null,
    quantity: number,
  ): TemplatePricingMetrics {
    let characterCount = 0;

    for (const field of fields) {
      if (!field.affectsPricing) continue;
      if (field.fieldType !== 'TEXT') continue;
      const raw = personalization ? personalization[field.key] : undefined;
      if (typeof raw === 'string') {
        characterCount += raw.trim().length;
      }
    }

    const metrics: TemplatePricingMetrics = {
      characterCount,
      quantity,
    };

    if (typeof layersCount === 'number') {
      metrics.layersCount = layersCount;
    }

    return metrics;
  }

  private filterAndMapTemplateRules(
    rules: {
      id: string;
      templateId: string;
      variantId: string | null;
      ruleType: any;
      value: number;
      appliesWhenJson: any;
      priority: number;
    }[],
    variantId: string | null,
    personalization: any,
  ): TemplatePricingRuleInput[] {
    const result: TemplatePricingRuleInput[] = [];

    for (const rule of rules) {
      if (rule.variantId && rule.variantId !== variantId) {
        continue;
      }

      const cond = rule.appliesWhenJson as any;
      if (cond && typeof cond === 'object') {
        let matches = true;
        for (const [key, expected] of Object.entries(cond)) {
          const actual = personalization ? personalization[key] : undefined;
          if (actual !== expected) {
            matches = false;
            break;
          }
        }
        if (!matches) continue;
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

  async addItemFromTemplate(
    orderId: string,
    input: AddItemFromTemplateInput,
    userId: string,
  ) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException('Order not found');
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
      throw new NotFoundException('Template not found');
    }

    const variant = input.variantId
      ? template.variants.find((v) => v.id === input.variantId)
      : undefined;

    if (input.variantId && !variant) {
      throw new NotFoundException('Template variant not found');
    }

    const materialId =
      input.materialId ?? variant?.defaultMaterialId ?? template.defaultMaterialId;
    if (!materialId) {
      throw new BadRequestException('Material is required for a template item');
    }

    const material = await this.prisma.material.findUnique({
      where: { id: materialId },
    });

    if (!material) {
      throw new NotFoundException('Material not found');
    }

    const quantity = input.quantity && input.quantity > 0 ? input.quantity : 1;
    const personalization = input.personalization ?? {};

    const widthMm = variant?.widthMm ?? template.baseWidthMm ?? 100;
    const heightMm = variant?.heightMm ?? template.baseHeightMm ?? 100;

    const hasPriceOverride =
      typeof input.priceOverride === 'number' && !Number.isNaN(input.priceOverride);

    const metrics = this.buildTemplateMetrics(
      personalization,
      template.fields.map((f) => ({
        key: f.key,
        fieldType: f.fieldType,
        affectsPricing: f.affectsPricing,
      })),
      template.layersCount ?? null,
      quantity,
    );

    const rules = this.filterAndMapTemplateRules(
      template.pricingRules,
      variant ? variant.id : null,
      personalization,
    );

    const pricingInput = {
      materialId: material.id,
      quantity,
      widthMm,
      heightMm,
      wastePercent: material.defaultWastePercent ?? 15,
      machineMinutes: 0,
      machineHourlyCost: 0,
      addOnIds: [] as string[],
      targetMarginPercent: 40,
    };

    const breakdown = calculatePrice(pricingInput, {
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

    const finalBreakdown = hasPriceOverride
      ? { ...breakdown, recommendedPrice: input.priceOverride as number }
      : breakdown;

    const derivedFields: any = {
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
        price: finalBreakdown,
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
        templateProductId: input.templateProductId,
        templateId: template.id,
        templateVariantId: variant ? variant.id : null,
        personalizationJson: personalization,
        derivedFieldsJson: derivedFields,
        priceSnapshotJson: finalBreakdown as any,
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

  async bulkAddFromTemplate(
    orderId: string,
    input: BulkAddFromTemplateInput,
    userId: string,
  ) {
    if (!input.items || input.items.length === 0) {
      throw new BadRequestException('No items provided');
    }

    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException('Order not found');
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
      throw new NotFoundException('Template not found');
    }

    const variant = input.variantId
      ? template.variants.find((v) => v.id === input.variantId)
      : undefined;

    if (input.variantId && !variant) {
      throw new NotFoundException('Template variant not found');
    }

    const materialId =
      input.materialId ?? variant?.defaultMaterialId ?? template.defaultMaterialId;
    if (!materialId) {
      throw new BadRequestException('Material is required for a template item');
    }

    const material = await this.prisma.material.findUnique({
      where: { id: materialId },
    });

    if (!material) {
      throw new NotFoundException('Material not found');
    }

    const titleBase = variant ? `${template.name} – ${variant.name}` : template.name;

    const results: any[] = [];

    for (const item of input.items) {
      const quantity = item.quantity && item.quantity > 0 ? item.quantity : 1;
      const personalization = item.personalization ?? {};

      const widthMm = variant?.widthMm ?? template.baseWidthMm ?? 100;
      const heightMm = variant?.heightMm ?? template.baseHeightMm ?? 100;

      const metrics = this.buildTemplateMetrics(
        personalization,
        template.fields.map((f) => ({
          key: f.key,
          fieldType: f.fieldType,
          affectsPricing: f.affectsPricing,
        })),
        template.layersCount ?? null,
        quantity,
      );

      const rules = this.filterAndMapTemplateRules(
        template.pricingRules,
        variant ? variant.id : null,
        personalization,
      );

      const pricingInput = {
        materialId: material.id,
        quantity,
        widthMm,
        heightMm,
        wastePercent: material.defaultWastePercent ?? 15,
        machineMinutes: 0,
        machineHourlyCost: 0,
        addOnIds: [] as string[],
        targetMarginPercent: 40,
      };

      const breakdown = calculatePrice(pricingInput, {
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

      const derivedFields: any = {
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
      } else {
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
            priceSnapshotJson: breakdown as any,
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
}
