import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FilesService {
  constructor(private readonly prisma: PrismaService) {}

  async listForOrder(orderId: string) {
    await this.ensureOrderExists(orderId);
    return this.prisma.file.findMany({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listForOrderItem(orderId: string, orderItemId: string) {
    await this.ensureOrderAndItem(orderId, orderItemId);
    return this.prisma.file.findMany({
      where: { orderId, orderItemId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addForOrder(orderId: string, file: any) {
    await this.ensureOrderExists(orderId);

    const url = `/uploads/${file.filename}`;

    return this.prisma.file.create({
      data: {
        orderId,
        orderItemId: null,
        url,
        mime: file.mimetype,
        size: file.size,
      },
    });
  }

  async addForOrderItem(orderId: string, orderItemId: string, file: any) {
    await this.ensureOrderAndItem(orderId, orderItemId);

    const url = `/uploads/${file.filename}`;

    return this.prisma.file.create({
      data: {
        orderId,
        orderItemId,
        url,
        mime: file.mimetype,
        size: file.size,
      },
    });
  }

  private async ensureOrderExists(orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return order;
  }

  private async ensureOrderAndItem(orderId: string, orderItemId: string) {
    await this.ensureOrderExists(orderId);
    const item = await this.prisma.orderItem.findUnique({ where: { id: orderItemId } });
    if (!item || item.orderId !== orderId) {
      throw new NotFoundException('Order item not found');
    }
    return item;
  }
}
