import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StockMovementType } from '@prisma/client';

@Injectable()
export class MaterialsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(params: { page?: number; pageSize?: number }) {
    const page = params.page && params.page > 0 ? params.page : 1;
    const pageSize = params.pageSize && params.pageSize > 0 ? params.pageSize : 20;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.material.findMany({
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { name: 'asc' },
      }),
      this.prisma.material.count(),
    ]);

    return {
      data: items.map((m) => ({
        ...m,
        isLowStock: m.stockQty <= m.lowStockThreshold,
      })),
      total,
      page,
      pageSize,
    };
  }

  async findOne(id: string) {
    const material = await this.prisma.material.findUnique({ where: { id } });
    if (!material) {
      throw new NotFoundException('Material not found');
    }
    return {
      ...material,
      isLowStock: material.stockQty <= material.lowStockThreshold,
    };
  }

  async create(data: {
    name: string;
    category: string;
    thicknessMm: number;
    unitType: 'SHEET' | 'M2';
    costPerSheet?: number;
    costPerM2?: number;
    sheetWidthMm?: number;
    sheetHeightMm?: number;
    stockQty?: number;
    lowStockThreshold?: number;
    defaultWastePercent?: number;
  }) {
    const created = await this.prisma.material.create({
      data: {
        name: data.name,
        category: data.category as any,
        thicknessMm: data.thicknessMm,
        unitType: data.unitType as any,
        costPerSheet: data.costPerSheet,
        costPerM2: data.costPerM2,
        sheetWidthMm: data.sheetWidthMm,
        sheetHeightMm: data.sheetHeightMm,
        stockQty: data.stockQty ?? 0,
        lowStockThreshold: data.lowStockThreshold ?? 0,
        defaultWastePercent: data.defaultWastePercent,
      },
    });

    return {
      ...created,
      isLowStock: created.stockQty <= created.lowStockThreshold,
    };
  }

  async update(
    id: string,
    data: Partial<{
      name: string;
      category: string;
      thicknessMm: number;
      unitType: 'SHEET' | 'M2';
      costPerSheet?: number | null;
      costPerM2?: number | null;
      sheetWidthMm?: number | null;
      sheetHeightMm?: number | null;
      stockQty?: number;
      lowStockThreshold?: number;
      defaultWastePercent?: number | null;
    }>,
  ) {
    await this.ensureExists(id);

    const updated = await this.prisma.material.update({
      where: { id },
      data: {
        ...data,
        category: data.category as any,
        unitType: data.unitType as any,
      },
    });

    return {
      ...updated,
      isLowStock: updated.stockQty <= updated.lowStockThreshold,
    };
  }

  async listStockMovements(materialId: string) {
    await this.ensureExists(materialId);

    return this.prisma.stockMovement.findMany({
      where: { materialId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createStockMovement(materialId: string, data: { type: StockMovementType; qty: number; note?: string }) {
    const material = await this.ensureExists(materialId);

    let newStock = material.stockQty;

    if (data.type === StockMovementType.IN) {
      newStock += data.qty;
    } else if (data.type === StockMovementType.OUT) {
      newStock = Math.max(0, material.stockQty - data.qty);
    } else if (data.type === StockMovementType.ADJUST) {
      newStock = data.qty;
    }

    const [movement, updatedMaterial] = await this.prisma.$transaction([
      this.prisma.stockMovement.create({
        data: {
          materialId,
          type: data.type,
          qty: data.qty,
          note: data.note,
        },
      }),
      this.prisma.material.update({
        where: { id: materialId },
        data: { stockQty: newStock },
      }),
    ]);

    return {
      movement,
      material: {
        ...updatedMaterial,
        isLowStock: updatedMaterial.stockQty <= updatedMaterial.lowStockThreshold,
      },
    };
  }

  private async ensureExists(id: string) {
    const material = await this.prisma.material.findUnique({ where: { id } });
    if (!material) {
      throw new NotFoundException('Material not found');
    }
    return material;
  }
}
