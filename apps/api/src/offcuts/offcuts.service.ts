import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  MaterialCategory,
  OffcutCondition,
  OffcutShapeType,
  OffcutSource,
  OffcutStatus,
  OffcutUsageType,
} from '@prisma/client';

interface ListOffcutsParams {
  materialCategory?: MaterialCategory;
  thicknessMm?: number;
  status?: OffcutStatus;
  condition?: OffcutCondition;
  location?: string;
  search?: string;
}

interface CreateOffcutInput {
  materialId: string;
  thicknessMm: number;
  shapeType: OffcutShapeType;
  widthMm?: number | null;
  heightMm?: number | null;
  boundingBoxWidthMm?: number | null;
  boundingBoxHeightMm?: number | null;
  estimatedAreaMm2?: number | null;
  quantity?: number;
  locationLabel?: string | null;
  condition?: OffcutCondition;
  status?: OffcutStatus;
  source?: OffcutSource;
  notes?: string | null;
  createdByUserId?: string | null;
}

interface UpdateOffcutInput {
  thicknessMm?: number;
  widthMm?: number | null;
  heightMm?: number | null;
  boundingBoxWidthMm?: number | null;
  boundingBoxHeightMm?: number | null;
  estimatedAreaMm2?: number | null;
  quantity?: number;
  locationLabel?: string | null;
  condition?: OffcutCondition;
  status?: OffcutStatus;
  notes?: string | null;
}

interface UseFullInput {
  orderItemId?: string;
  batchId?: string;
  notes?: string | null;
  userId?: string | null;
}

interface UsePartialInput extends UseFullInput {
  usedAreaMm2?: number | null;
  usedWidthMm?: number | null;
  usedHeightMm?: number | null;
}

interface OffcutSuggestion {
  offcutId: string;
  materialId: string;
  thicknessMm: number;
  widthMm?: number | null;
  heightMm?: number | null;
  estimatedAreaMm2?: number | null;
  locationLabel?: string | null;
  condition: OffcutCondition;
  status: OffcutStatus;
  fitReason: string;
  score: number;
}

@Injectable()
export class OffcutsService {
  private readonly prisma: PrismaService;

  constructor(prisma?: PrismaService) {
    this.prisma = prisma ?? new PrismaService();
  }

  async listOffcuts(params: ListOffcutsParams) {
    const where: any = {
      deletedAt: null,
    };

    if (params.status) where.status = params.status;
    if (params.condition) where.condition = params.condition;
    if (params.thicknessMm) where.thicknessMm = params.thicknessMm;
    if (params.location) where.locationLabel = { contains: params.location, mode: 'insensitive' };

    if (params.materialCategory) {
      where.material = { category: params.materialCategory };
    }

    if (params.search) {
      where.OR = [
        { notes: { contains: params.search, mode: 'insensitive' } },
        { locationLabel: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const offcuts = await this.prisma.offcut.findMany({
      where,
      orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
      include: {
        material: true,
        tags: { include: { tag: true } },
      },
    });

    return {
      data: offcuts,
      total: offcuts.length,
    };
  }

  async getOffcut(id: string) {
    const offcut = await this.prisma.offcut.findUnique({
      where: { id },
      include: {
        material: true,
        usages: {
          include: {
            orderItem: true,
            batch: true,
            createdByUser: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        reservations: {
          include: {
            orderItem: true,
            batch: true,
            reservedByUser: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        tags: { include: { tag: true } },
      },
    });

    if (!offcut || offcut.deletedAt) {
      throw new NotFoundException('Offcut not found');
    }

    return offcut;
  }

  async createOffcut(input: CreateOffcutInput) {
    const material = await this.prisma.material.findUnique({ where: { id: input.materialId } });
    if (!material) {
      throw new BadRequestException('Invalid material');
    }

    if (input.shapeType === 'RECTANGLE') {
      if (!input.widthMm || !input.heightMm) {
        throw new BadRequestException('Width and height are required for rectangle offcuts');
      }
    } else {
      if (!input.estimatedAreaMm2 && (!input.boundingBoxWidthMm || !input.boundingBoxHeightMm)) {
        throw new BadRequestException(
          'Estimated area or bounding box is required for irregular offcuts',
        );
      }
    }

    const offcut = await this.prisma.offcut.create({
      data: {
        materialId: input.materialId,
        thicknessMm: input.thicknessMm,
        shapeType: input.shapeType,
        widthMm: input.widthMm ?? null,
        heightMm: input.heightMm ?? null,
        boundingBoxWidthMm: input.boundingBoxWidthMm ?? null,
        boundingBoxHeightMm: input.boundingBoxHeightMm ?? null,
        estimatedAreaMm2: input.estimatedAreaMm2 ?? null,
        quantity: input.quantity ?? 1,
        locationLabel: input.locationLabel ?? null,
        condition: input.condition ?? OffcutCondition.GOOD,
        status: input.status ?? OffcutStatus.AVAILABLE,
        source: input.source ?? OffcutSource.MANUAL,
        notes: input.notes ?? null,
        createdByUserId: input.createdByUserId ?? null,
      },
    });

    return offcut;
  }

  async updateOffcut(id: string, input: UpdateOffcutInput) {
    const existing = await this.prisma.offcut.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) {
      throw new NotFoundException('Offcut not found');
    }

    const offcut = await this.prisma.offcut.update({
      where: { id },
      data: {
        thicknessMm:
          typeof input.thicknessMm !== 'undefined' ? input.thicknessMm : existing.thicknessMm,
        widthMm: typeof input.widthMm !== 'undefined' ? input.widthMm : existing.widthMm,
        heightMm: typeof input.heightMm !== 'undefined' ? input.heightMm : existing.heightMm,
        boundingBoxWidthMm:
          typeof input.boundingBoxWidthMm !== 'undefined'
            ? input.boundingBoxWidthMm
            : existing.boundingBoxWidthMm,
        boundingBoxHeightMm:
          typeof input.boundingBoxHeightMm !== 'undefined'
            ? input.boundingBoxHeightMm
            : existing.boundingBoxHeightMm,
        estimatedAreaMm2:
          typeof input.estimatedAreaMm2 !== 'undefined'
            ? input.estimatedAreaMm2
            : existing.estimatedAreaMm2,
        quantity:
          typeof input.quantity !== 'undefined' ? input.quantity : existing.quantity,
        locationLabel:
          typeof input.locationLabel !== 'undefined'
            ? input.locationLabel
            : existing.locationLabel,
        condition:
          typeof input.condition !== 'undefined' ? input.condition : existing.condition,
        status: typeof input.status !== 'undefined' ? input.status : existing.status,
        notes: typeof input.notes !== 'undefined' ? input.notes : existing.notes,
      },
    });

    return offcut;
  }

  async softDeleteOffcut(id: string) {
    const existing = await this.prisma.offcut.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) {
      throw new NotFoundException('Offcut not found');
    }

    await this.prisma.offcut.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: OffcutStatus.DISCARDED,
      },
    });

    return { id };
  }

  async reserveOffcut(offcutId: string, input: { orderItemId?: string; batchId?: string; userId: string }) {
    return this.prisma.$transaction(async (tx) => {
      const offcut = await tx.offcut.findUnique({ where: { id: offcutId } });
      if (!offcut || offcut.deletedAt) {
        throw new NotFoundException('Offcut not found');
      }
      if (offcut.status !== OffcutStatus.AVAILABLE) {
        throw new BadRequestException('Offcut is not available for reservation');
      }

      const reservation = await tx.offcutReservation.create({
        data: {
          offcutId,
          orderItemId: input.orderItemId ?? null,
          batchId: input.batchId ?? null,
          reservedByUserId: input.userId,
        },
      });

      await tx.offcut.update({
        where: { id: offcutId },
        data: { status: OffcutStatus.RESERVED },
      });

      return reservation;
    });
  }

  async useFull(offcutId: string, input: UseFullInput) {
    return this.prisma.$transaction(async (tx) => {
      const offcut = await tx.offcut.findUnique({ where: { id: offcutId } });
      if (!offcut || offcut.deletedAt) {
        throw new NotFoundException('Offcut not found');
      }
      if (offcut.status === OffcutStatus.DISCARDED || offcut.status === OffcutStatus.USED) {
        throw new BadRequestException('Offcut is already used or discarded');
      }

      const usage = await tx.offcutUsage.create({
        data: {
          offcutId,
          orderItemId: input.orderItemId ?? null,
          batchId: input.batchId ?? null,
          usedAreaMm2: offcut.estimatedAreaMm2 ?? null,
          usedWidthMm: offcut.widthMm ?? null,
          usedHeightMm: offcut.heightMm ?? null,
          usageType: OffcutUsageType.FULL,
          notes: input.notes ?? null,
          createdByUserId: input.userId ?? null,
        },
      });

      await tx.offcut.update({
        where: { id: offcutId },
        data: { status: OffcutStatus.USED },
      });

      await tx.offcutReservation.deleteMany({ where: { offcutId } });

      return usage;
    });
  }

  async usePartial(offcutId: string, input: UsePartialInput) {
    return this.prisma.$transaction(async (tx) => {
      const offcut = await tx.offcut.findUnique({ where: { id: offcutId } });
      if (!offcut || offcut.deletedAt) {
        throw new NotFoundException('Offcut not found');
      }
      if (offcut.status === OffcutStatus.DISCARDED || offcut.status === OffcutStatus.USED) {
        throw new BadRequestException('Offcut is already used or discarded');
      }

      let usedArea = input.usedAreaMm2 ?? null;
      if (!usedArea && input.usedWidthMm && input.usedHeightMm) {
        usedArea = input.usedWidthMm * input.usedHeightMm;
      }

      const usage = await tx.offcutUsage.create({
        data: {
          offcutId,
          orderItemId: input.orderItemId ?? null,
          batchId: input.batchId ?? null,
          usedAreaMm2: usedArea,
          usedWidthMm: input.usedWidthMm ?? null,
          usedHeightMm: input.usedHeightMm ?? null,
          usageType: OffcutUsageType.PARTIAL,
          notes: input.notes ?? null,
          createdByUserId: input.userId ?? null,
        },
      });

      if (usedArea && offcut.estimatedAreaMm2 && offcut.estimatedAreaMm2 > 0) {
        const remaining = Math.max(0, offcut.estimatedAreaMm2 - usedArea);
        let newStatus = offcut.status;
        if (remaining <= 0) {
          newStatus = OffcutStatus.USED;
        } else if (remaining < offcut.estimatedAreaMm2 * 0.15) {
          newStatus = OffcutStatus.DISCARDED;
        }

        await tx.offcut.update({
          where: { id: offcutId },
          data: {
            estimatedAreaMm2: remaining,
            status: newStatus,
          },
        });
      }

      await tx.offcutReservation.deleteMany({
        where: { offcutId, orderItemId: input.orderItemId ?? undefined, batchId: input.batchId ?? undefined },
      });

      return usage;
    });
  }

  async listUsages() {
    const usages = await this.prisma.offcutUsage.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        offcut: { include: { material: true } },
        orderItem: true,
        batch: true,
        createdByUser: true,
      },
      take: 500,
    });

    return {
      data: usages,
      total: usages.length,
    };
  }

  async listReservations() {
    const reservations = await this.prisma.offcutReservation.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        offcut: { include: { material: true } },
        orderItem: true,
        batch: true,
        reservedByUser: true,
      },
      take: 500,
    });

    return {
      data: reservations,
      total: reservations.length,
    };
  }

  private async resolveOrderItem(orderItemId: string): Promise<any> {
    const item = await this.prisma.orderItem.findUnique({
      where: { id: orderItemId },
      include: {
        material: true,
        template: {
          include: {
            defaultMaterial: true,
            materialHints: true,
          },
        },
      },
    });

    if (!item) {
      throw new NotFoundException('Order item not found');
    }

    return item as any;
  }

  async suggestionsForOrderItem(orderItemId: string): Promise<OffcutSuggestion[]> {
    const item = await this.resolveOrderItem(orderItemId);
    const material = item.material ?? item.template?.defaultMaterial;

    if (!material) {
      return [];
    }

    const safetyMargin = this.getSafetyMargin(material.category as MaterialCategory);

    const requiredWidth = item.widthMm ?? null;
    const requiredHeight = item.heightMm ?? null;

    let requiredArea: number | null = null;
    if (requiredWidth && requiredHeight) {
      requiredArea = requiredWidth * requiredHeight * item.quantity;
    } else {
      const hint = item.template?.materialHints?.[0];
      if (hint?.avgAreaMm2PerItem != null) {
        requiredArea = hint.avgAreaMm2PerItem * item.quantity;
      }
    }

    const offcuts = await this.prisma.offcut.findMany({
      where: {
        deletedAt: null,
        status: OffcutStatus.AVAILABLE,
        condition: { not: OffcutCondition.DAMAGED },
        thicknessMm: material.thicknessMm,
        material: {
          category: material.category,
        },
      },
      include: {
        material: true,
      },
    });

    const suggestions: OffcutSuggestion[] = [];

    for (const offcut of offcuts) {
      let fitReason = '';
      let score = 0;

      const offWidth = offcut.widthMm ?? offcut.boundingBoxWidthMm ?? null;
      const offHeight = offcut.heightMm ?? offcut.boundingBoxHeightMm ?? null;

      const offArea =
        offcut.estimatedAreaMm2 ??
        (offWidth && offHeight ? offWidth * offHeight : null);

      if (requiredWidth && requiredHeight && offWidth && offHeight) {
        const fitsStraight = offWidth >= requiredWidth && offHeight >= requiredHeight;
        const fitsRotated = offWidth >= requiredHeight && offHeight >= requiredWidth;

        if (fitsStraight || fitsRotated) {
          fitReason = fitsStraight ? 'Fits exact size' : 'Fits rotated';
          score += 100;
        }
      }

      if (!fitReason && requiredArea && offArea) {
        if (offArea >= requiredArea * (1 + safetyMargin)) {
          fitReason = 'Area likely sufficient';
          score += 60;
        }
      }

      if (!fitReason && offArea && requiredArea && offArea >= requiredArea) {
        fitReason = 'Potential risk: irregular shape';
        score += 30;
      }

      if (!fitReason) continue;

      if (offcut.condition === OffcutCondition.GOOD) score += 10;

      const effectiveArea = offArea ?? Number.MAX_SAFE_INTEGER;
      suggestions.push({
        offcutId: offcut.id,
        materialId: offcut.materialId,
        thicknessMm: offcut.thicknessMm,
        widthMm: offWidth,
        heightMm: offHeight,
        estimatedAreaMm2: offArea,
        locationLabel: offcut.locationLabel ?? undefined,
        condition: offcut.condition,
        status: offcut.status,
        fitReason,
        score: score + Math.max(0, 1000000000 - effectiveArea),
      });
    }

    suggestions.sort((a, b) => b.score - a.score);

    return suggestions.slice(0, 20);
  }

  async suggestionsForBatch(batchId: string): Promise<
    { materialId: string; materialName: string; thicknessMm: number; suggestions: OffcutSuggestion[] }[]
  > {
    const links = await this.prisma.batchItemLink.findMany({
      where: { batchId },
      include: {
        orderItem: {
          include: {
            material: true,
            template: {
              include: {
                defaultMaterial: true,
                materialHints: true,
              },
            },
          },
        },
      },
    });

    if (links.length === 0) {
      return [];
    }

    const groups = new Map<string, { material: any; items: any[] }>();

    for (const link of links) {
      const item = link.orderItem as any;
      const material = item.material ?? item.template?.defaultMaterial;
      if (!material) continue;
      const key = `${material.id}:${material.thicknessMm}`;
      const existing = groups.get(key);
      if (existing) {
        existing.items.push(item);
      } else {
        groups.set(key, { material, items: [item] });
      }
    }

    const results: {
      materialId: string;
      materialName: string;
      thicknessMm: number;
      suggestions: OffcutSuggestion[];
    }[] = [];

    for (const [, group] of groups) {
      const items = group.items;

      let maxRequiredArea = 0;
      for (const item of items) {
        const w = item.widthMm ?? null;
        const h = item.heightMm ?? null;
        let area = 0;
        if (w && h) {
          area = w * h * item.quantity;
        } else {
          const hint = item.template?.materialHints?.[0];
          if (hint?.avgAreaMm2PerItem != null) {
            area = hint.avgAreaMm2PerItem * item.quantity;
          }
        }
        if (area > maxRequiredArea) maxRequiredArea = area;
      }

      const safetyMargin = this.getSafetyMargin(group.material.category as MaterialCategory);

      const offcuts = await this.prisma.offcut.findMany({
        where: {
          deletedAt: null,
          status: OffcutStatus.AVAILABLE,
          condition: { not: OffcutCondition.DAMAGED },
          thicknessMm: group.material.thicknessMm,
          materialId: group.material.id,
        },
      });

      const suggestions: OffcutSuggestion[] = [];

      for (const offcut of offcuts) {
        const offWidth = offcut.widthMm ?? offcut.boundingBoxWidthMm ?? null;
        const offHeight = offcut.heightMm ?? offcut.boundingBoxHeightMm ?? null;
        const offArea =
          offcut.estimatedAreaMm2 ??
          (offWidth && offHeight ? offWidth * offHeight : null);

        if (!offArea || maxRequiredArea <= 0) continue;

        if (offArea >= maxRequiredArea * (1 + safetyMargin)) {
          suggestions.push({
            offcutId: offcut.id,
            materialId: offcut.materialId,
            thicknessMm: offcut.thicknessMm,
            widthMm: offWidth,
            heightMm: offHeight,
            estimatedAreaMm2: offArea,
            locationLabel: offcut.locationLabel ?? undefined,
            condition: offcut.condition,
            status: offcut.status,
            fitReason: 'Area likely sufficient for batch items',
            score: offArea,
          });
        }
      }

      suggestions.sort((a, b) => (a.estimatedAreaMm2 ?? 0) - (b.estimatedAreaMm2 ?? 0));

      if (suggestions.length > 0) {
        results.push({
          materialId: group.material.id,
          materialName: group.material.name,
          thicknessMm: group.material.thicknessMm,
          suggestions: suggestions.slice(0, 20),
        });
      }
    }

    return results;
  }

  async countActiveOffcuts() {
    return this.prisma.offcut.count({
      where: { deletedAt: null },
    });
  }

  private getSafetyMargin(category: MaterialCategory): number {
    switch (category) {
      case MaterialCategory.PLYWOOD:
      case MaterialCategory.MDF:
        return 0.1;
      case MaterialCategory.ACRYLIC:
      case MaterialCategory.MIRROR_ACRYLIC:
        return 0.15;
      default:
        return 0.1;
    }
  }
}
