import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BatchPriority, BatchStatus, BatchType, MaterialUnitType } from '@prisma/client';

interface ListBatchesParams {
  status?: BatchStatus;
  seasonId?: string;
  templateId?: string;
  targetDateFrom?: Date;
  targetDateTo?: Date;
}

interface CreateBatchInput {
  name: string;
  seasonId?: string;
  batchType: BatchType;
  status?: BatchStatus;
  priority?: BatchPriority;
  targetDate?: Date | null;
  defaultMaterialId?: string | null;
  defaultVariantId?: string | null;
  notes?: string | null;
}

interface UpdateBatchInput {
  name?: string;
  seasonId?: string | null;
  batchType?: BatchType;
  status?: BatchStatus;
  priority?: BatchPriority;
  targetDate?: Date | null;
  defaultMaterialId?: string | null;
  defaultVariantId?: string | null;
  notes?: string | null;
}

interface CreateBatchFromFilterInput {
  name: string;
  seasonId?: string;
  batchType: BatchType;
  priority?: BatchPriority;
  targetDate?: Date | null;
  templateId?: string;
  variantId?: string;
  seasonFilterId?: string;
  orderStatus?: string;
  orderPriority?: string;
}

@Injectable()
export class BatchesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(params: ListBatchesParams) {
    const where: any = {};
    if (params.status) {
      where.status = params.status;
    }
    if (params.seasonId) {
      where.seasonId = params.seasonId;
    }
    if (params.templateId) {
      where.items = {
        some: {
          orderItem: {
            templateId: params.templateId,
          },
        },
      };
    }
    if (params.targetDateFrom || params.targetDateTo) {
      where.targetDate = {};
      if (params.targetDateFrom) {
        where.targetDate.gte = params.targetDateFrom;
      }
      if (params.targetDateTo) {
        where.targetDate.lte = params.targetDateTo;
      }
    }

    const batches = await this.prisma.productionBatch.findMany({
      where,
      orderBy: [
        { status: 'asc' },
        { targetDate: 'asc' },
        { createdAt: 'desc' },
      ],
      include: {
        season: true,
        _count: {
          select: {
            items: true,
            tasks: true,
          },
        },
      },
    });

    const withProgress = await Promise.all(
      batches.map(async (b) => {
        const itemIds = await this.prisma.batchItemLink.findMany({
          where: { batchId: b.id },
          select: { orderItemId: true },
        });
        const ids = itemIds.map((i) => i.orderItemId);

        let totalEstimated = 0;
        if (ids.length > 0) {
          const items = await this.prisma.orderItem.findMany({
            where: { id: { in: ids } },
            select: { estimatedMinutes: true },
          });
          totalEstimated = items.reduce(
            (sum, it) => sum + (it.estimatedMinutes ?? 0),
            0,
          );
        }

        return {
          ...b,
          estimatedMinutesTotal: totalEstimated,
        };
      }),
    );

    return {
      data: withProgress,
      total: batches.length,
    };
  }

  async get(id: string) {
    const batch = await this.prisma.productionBatch.findUnique({
      where: { id },
      include: {
        season: true,
        defaultMaterial: true,
        defaultVariant: true,
        tasks: true,
        _count: {
          select: {
            items: true,
            tasks: true,
          },
        },
      },
    });
    if (!batch) {
      throw new NotFoundException('Batch not found');
    }

    const links = await this.prisma.batchItemLink.findMany({
      where: { batchId: id },
      select: { orderItemId: true },
    });
    const orderItemIds = links.map((l) => l.orderItemId);

    let estimatedMinutesTotal = 0;
    let actualMinutesTotal = 0;

    if (orderItemIds.length > 0) {
      const [items, timeAgg] = await Promise.all([
        this.prisma.orderItem.findMany({
          where: { id: { in: orderItemIds } },
          select: { id: true, estimatedMinutes: true },
        }),
        this.prisma.timeLog.aggregate({
          _sum: { durationMinutes: true },
          where: { orderItemId: { in: orderItemIds } },
        }),
      ]);

      estimatedMinutesTotal = items.reduce(
        (sum, it) => sum + (it.estimatedMinutes ?? 0),
        0,
      );
      actualMinutesTotal = timeAgg._sum.durationMinutes ?? 0;
    }

    return {
      ...batch,
      estimatedMinutesTotal,
      actualMinutesTotal,
    };
  }

  async create(input: CreateBatchInput) {
    const batch = await this.prisma.productionBatch.create({
      data: {
        name: input.name,
        seasonId: input.seasonId,
        batchType: input.batchType,
        status: input.status ?? BatchStatus.PLANNED,
        priority: input.priority ?? BatchPriority.NORMAL,
        targetDate: input.targetDate ?? null,
        defaultMaterialId: input.defaultMaterialId ?? null,
        defaultVariantId: input.defaultVariantId ?? null,
        notes: input.notes ?? null,
      },
    });

    return batch;
  }

  async update(id: string, input: UpdateBatchInput) {
    const existing = await this.prisma.productionBatch.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Batch not found');
    }

    const batch = await this.prisma.productionBatch.update({
      where: { id },
      data: {
        name: typeof input.name !== 'undefined' ? input.name : existing.name,
        seasonId:
          typeof input.seasonId !== 'undefined' ? input.seasonId : existing.seasonId,
        batchType:
          typeof input.batchType !== 'undefined' ? input.batchType : existing.batchType,
        status: typeof input.status !== 'undefined' ? input.status : existing.status,
        priority:
          typeof input.priority !== 'undefined' ? input.priority : existing.priority,
        targetDate:
          typeof input.targetDate !== 'undefined'
            ? input.targetDate
            : existing.targetDate,
        defaultMaterialId:
          typeof input.defaultMaterialId !== 'undefined'
            ? input.defaultMaterialId
            : existing.defaultMaterialId,
        defaultVariantId:
          typeof input.defaultVariantId !== 'undefined'
            ? input.defaultVariantId
            : existing.defaultVariantId,
        notes:
          typeof input.notes !== 'undefined' ? input.notes : existing.notes,
      },
    });

    return batch;
  }

  async createFromFilter(input: CreateBatchFromFilterInput) {
    const batch = await this.create({
      name: input.name,
      seasonId: input.seasonId ?? input.seasonFilterId,
      batchType: input.batchType,
      priority: input.priority,
      targetDate: input.targetDate ?? null,
    });

    const where: any = {};
    if (input.templateId) {
      where.templateId = input.templateId;
    }
    if (input.variantId) {
      where.templateVariantId = input.variantId;
    }

    where.order = {};
    if (input.seasonFilterId) {
      where.order.seasonId = input.seasonFilterId;
    }
    if (input.orderStatus) {
      where.order.status = input.orderStatus as any;
    }
    if (input.orderPriority) {
      where.order.priority = input.orderPriority as any;
    }

    const items = await this.prisma.orderItem.findMany({
      where,
      select: { id: true },
    });

    if (items.length > 0) {
      await this.prisma.batchItemLink.createMany({
        data: items.map((it) => ({
          batchId: batch.id,
          orderItemId: it.id,
        })),
        skipDuplicates: true,
      });
    }

    return this.get(batch.id);
  }

  async addItems(batchId: string, orderItemIds: string[]) {
    const batch = await this.prisma.productionBatch.findUnique({ where: { id: batchId } });
    if (!batch) {
      throw new NotFoundException('Batch not found');
    }

    if (!orderItemIds || orderItemIds.length === 0) {
      return this.get(batchId);
    }

    await this.prisma.batchItemLink.createMany({
      data: orderItemIds.map((id) => ({ batchId, orderItemId: id })),
      skipDuplicates: true,
    });

    return this.get(batchId);
  }

  async removeItems(batchId: string, orderItemIds: string[]) {
    const batch = await this.prisma.productionBatch.findUnique({ where: { id: batchId } });
    if (!batch) {
      throw new NotFoundException('Batch not found');
    }

    if (!orderItemIds || orderItemIds.length === 0) {
      return this.get(batchId);
    }

    await this.prisma.batchItemLink.deleteMany({
      where: {
        batchId,
        orderItemId: { in: orderItemIds },
      },
    });

    return this.get(batchId);
  }

  async listItems(batchId: string) {
    const batch = await this.prisma.productionBatch.findUnique({ where: { id: batchId } });
    if (!batch) {
      throw new NotFoundException('Batch not found');
    }

    const links = await this.prisma.batchItemLink.findMany({
      where: { batchId },
      include: {
        orderItem: {
          include: {
            order: true,
            material: true,
            template: true,
            templateVariant: true,
            templateProduct: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return links;
  }

  async listTasks(batchId: string) {
    const batch = await this.prisma.productionBatch.findUnique({ where: { id: batchId } });
    if (!batch) {
      throw new NotFoundException('Batch not found');
    }

    return this.prisma.batchTask.findMany({
      where: { batchId },
      orderBy: { createdAt: 'asc' },
      include: {
        assignedUser: true,
      },
    });
  }

  async createTask(batchId: string, input: { title: string; assignedUserId?: string }) {
    const batch = await this.prisma.productionBatch.findUnique({ where: { id: batchId } });
    if (!batch) {
      throw new NotFoundException('Batch not found');
    }

    return this.prisma.batchTask.create({
      data: {
        batchId,
        title: input.title,
        assignedUserId: input.assignedUserId ?? null,
      },
    });
  }

  async updateTask(
    batchId: string,
    taskId: string,
    input: { title?: string; status?: string; assignedUserId?: string | null },
  ) {
    const task = await this.prisma.batchTask.findUnique({ where: { id: taskId } });
    if (!task || task.batchId !== batchId) {
      throw new NotFoundException('Batch task not found');
    }

    return this.prisma.batchTask.update({
      where: { id: taskId },
      data: {
        title: typeof input.title !== 'undefined' ? input.title : task.title,
        status:
          typeof input.status !== 'undefined'
            ? (input.status as any)
            : task.status,
        assignedUserId:
          typeof input.assignedUserId !== 'undefined'
            ? input.assignedUserId
            : task.assignedUserId,
      },
      include: {
        assignedUser: true,
      },
    });
  }

  async forecast(batchId: string) {
    const batch = await this.prisma.productionBatch.findUnique({ where: { id: batchId } });
    if (!batch) {
      throw new NotFoundException('Batch not found');
    }

    const links = await this.prisma.batchItemLink.findMany({
      where: { batchId },
      include: {
        orderItem: {
          include: {
            material: true,
            template: {
              include: {
                materialHints: true,
              },
            },
          },
        },
      },
    });

    const materialMap = new Map<string, {
      material: any;
      estimatedUnits: number;
      hasHint: boolean;
    }>();

    for (const link of links) {
      const item = link.orderItem as any;
      if (!item) continue;

      const material = item.material;
      if (!material) continue;

      const template = item.template;
      const hint = template?.materialHints?.[0];

      const key = material.id as string;
      let entry = materialMap.get(key);
      if (!entry) {
        entry = {
          material,
          estimatedUnits: 0,
          hasHint: !!hint,
        };
        materialMap.set(key, entry);
      }

      if (!hint) {
        // we still mark that some items have no hint
        entry.hasHint = entry.hasHint || false;
        continue;
      }

      const qty = item.quantity ?? 1;

      if (material.unitType === MaterialUnitType.SHEET) {
        const sheetFraction = hint.avgSheetFractionPerItem ?? null;
        const areaMm2 = hint.avgAreaMm2PerItem ?? null;
        let estimatedSheetsForItem = 0;

        if (sheetFraction != null) {
          estimatedSheetsForItem = sheetFraction * qty;
        } else if (
          areaMm2 != null &&
          typeof material.sheetWidthMm === 'number' &&
          typeof material.sheetHeightMm === 'number'
        ) {
          const sheetArea = material.sheetWidthMm * material.sheetHeightMm;
          if (sheetArea > 0) {
            estimatedSheetsForItem = (areaMm2 * qty) / sheetArea;
          }
        }

        entry.estimatedUnits += estimatedSheetsForItem;
      } else if (material.unitType === MaterialUnitType.M2) {
        const areaMm2 = hint.avgAreaMm2PerItem ?? null;
        if (areaMm2 != null) {
          const areaM2 = (areaMm2 * qty) / 1_000_000;
          entry.estimatedUnits += areaM2;
        }
      }
    }

    const forecasts = Array.from(materialMap.values()).map((entry) => {
      const material = entry.material;
      const estimated = entry.estimatedUnits;
      const stock = material.stockQty ?? 0;

      let status: 'LIKELY_ENOUGH' | 'AT_RISK' | 'UNKNOWN' = 'UNKNOWN';
      let message = 'No material hint configured for this template.';

      if (!entry.hasHint || !Number.isFinite(estimated) || estimated <= 0) {
        status = 'UNKNOWN';
      } else if (stock <= 0 && estimated > 0) {
        status = 'AT_RISK';
        message = 'At risk: no stock available for this material.';
      } else {
        const threshold = stock * 0.9;
        if (estimated > threshold) {
          status = 'AT_RISK';
          message = 'At risk: estimated usage is close to or above current stock.';
        } else {
          status = 'LIKELY_ENOUGH';
          message = 'Likely enough stock (heuristic estimate).';
        }
      }

      return {
        materialId: material.id,
        materialName: material.name,
        unitType: material.unitType as MaterialUnitType,
        estimatedUnits: Number.isFinite(estimated) ? estimated : null,
        stockQty: stock,
        status,
        message,
      };
    });

    return {
      batchId,
      materials: forecasts,
    };
  }
}
