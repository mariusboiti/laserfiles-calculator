import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TimeLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForItem(orderId: string, orderItemId: string) {
    const item = await this.ensureOrderItem(orderId, orderItemId);

    return this.prisma.timeLog.findMany({
      where: { orderItemId: item.id },
      include: { user: true },
      orderBy: { startAt: 'desc' },
    });
  }

  async start(orderId: string, orderItemId: string, userId: string) {
    const item = await this.ensureOrderItem(orderId, orderItemId);

    const activeLog = await this.prisma.timeLog.findFirst({
      where: {
        orderItemId: item.id,
        userId,
        endAt: null,
      },
    });

    if (activeLog) {
      throw new BadRequestException('There is already an active timer for this item and user');
    }

    const log = await this.prisma.timeLog.create({
      data: {
        orderItemId: item.id,
        userId,
        startAt: new Date(),
      },
    });

    return log;
  }

  async stop(orderId: string, orderItemId: string, userId: string) {
    const item = await this.ensureOrderItem(orderId, orderItemId);

    const activeLog = await this.prisma.timeLog.findFirst({
      where: {
        orderItemId: item.id,
        userId,
        endAt: null,
      },
      orderBy: { startAt: 'desc' },
    });

    if (!activeLog) {
      throw new BadRequestException('No active timer found for this item and user');
    }

    const endAt = new Date();
    const durationMinutes = Math.max(
      1,
      Math.round((endAt.getTime() - activeLog.startAt.getTime()) / 60000),
    );

    const updated = await this.prisma.timeLog.update({
      where: { id: activeLog.id },
      data: {
        endAt,
        durationMinutes,
      },
    });

    return updated;
  }

  private async ensureOrderItem(orderId: string, orderItemId: string) {
    const item = await this.prisma.orderItem.findUnique({
      where: { id: orderItemId },
      include: { order: true },
    });
    if (!item || item.orderId !== orderId) {
      throw new NotFoundException('Order item not found');
    }
    return item;
  }
}
