import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { calculatePrice } from '@laser/pricing-engine';

export interface PriceDto {
  materialId: string;
  quantity: number;
  widthMm: number;
  heightMm: number;
  wastePercent?: number;
  machineMinutes?: number;
  machineHourlyCost?: number;
  addOnIds?: string[];
  targetMarginPercent?: number;
}

@Injectable()
export class PricingService {
  constructor(private readonly prisma: PrismaService) {}

  async preview(input: PriceDto) {
    const material = await this.prisma.material.findUnique({
      where: { id: input.materialId },
    });
    if (!material) {
      throw new NotFoundException('Material not found');
    }

    const addOns = input.addOnIds && input.addOnIds.length
      ? await this.prisma.addOn.findMany({ where: { id: { in: input.addOnIds } } })
      : [];

    const breakdown = calculatePrice(
      {
        materialId: input.materialId,
        quantity: input.quantity,
        widthMm: input.widthMm,
        heightMm: input.heightMm,
        wastePercent: input.wastePercent ?? material.defaultWastePercent ?? 15,
        machineMinutes: input.machineMinutes ?? 0,
        machineHourlyCost: input.machineHourlyCost ?? 0,
        addOnIds: input.addOnIds ?? [],
        targetMarginPercent: input.targetMarginPercent ?? 40,
      },
      {
        material: {
          id: material.id,
          unitType: material.unitType,
          costPerSheet: material.costPerSheet ? Number(material.costPerSheet) : null,
          costPerM2: material.costPerM2 ? Number(material.costPerM2) : null,
          sheetWidthMm: material.sheetWidthMm,
          sheetHeightMm: material.sheetHeightMm,
        },
        addOns: addOns.map((a) => ({
          id: a.id,
          name: a.name,
          costType: a.costType as any,
          value: Number(a.value),
        })),
      },
    );

    return { input, breakdown };
  }

  async priceOrderItem(
    orderId: string,
    itemId: string,
    input: PriceDto,
    userId: string,
  ) {
    const item = await this.prisma.orderItem.findUnique({
      where: { id: itemId },
      include: { order: true },
    });

    if (!item || item.orderId !== orderId) {
      throw new NotFoundException('Order item not found');
    }

    const result = await this.preview(input);

    const updatedItem = await this.prisma.orderItem.update({
      where: { id: itemId },
      data: {
        priceSnapshotJson: result.breakdown as any,
      },
    });

    await this.prisma.orderActivityLog.create({
      data: {
        orderId,
        userId,
        field: 'price',
        oldValue: null,
        newValue: `Price recalculated for item ${updatedItem.title}`,
      },
    });

    return {
      item: updatedItem,
      pricing: result.breakdown,
    };
  }
}
