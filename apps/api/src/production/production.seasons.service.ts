import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface CreateSeasonInput {
  name: string;
  startDate?: Date | null;
  endDate?: Date | null;
  isActive?: boolean;
  notes?: string | null;
}

interface UpdateSeasonInput {
  name?: string;
  startDate?: Date | null;
  endDate?: Date | null;
  isActive?: boolean;
  notes?: string | null;
}

@Injectable()
export class SeasonsService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const seasons = await this.prisma.season.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            orders: true,
            batches: true,
          },
        },
      },
    });

    const withItemsCounts = await Promise.all(
      seasons.map(async (s) => {
        const itemsCount = await this.prisma.orderItem.count({
          where: { order: { seasonId: s.id } },
        });
        return {
          ...s,
          _count: s._count,
          itemsCount,
        };
      }),
    );

    return {
      data: withItemsCounts,
      total: seasons.length,
    };
  }

  async get(id: string) {
    const season = await this.prisma.season.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            orders: true,
            batches: true,
          },
        },
      },
    });
    if (!season) {
      throw new NotFoundException('Season not found');
    }

    const [itemsCount, batchedItemsCount] = await Promise.all([
      this.prisma.orderItem.count({ where: { order: { seasonId: id } } }),
      this.prisma.orderItem.count({
        where: { order: { seasonId: id }, batchLinks: { some: {} } },
      }),
    ]);

    return {
      ...season,
      itemsCount,
      batchedItemsCount,
    };
  }

  async create(input: CreateSeasonInput) {
    const season = await this.prisma.season.create({
      data: {
        name: input.name,
        startDate: input.startDate ?? null,
        endDate: input.endDate ?? null,
        isActive: !!input.isActive,
        notes: input.notes ?? null,
      },
    });

    if (input.isActive) {
      await this.setActive(season.id);
      return this.get(season.id);
    }

    return season;
  }

  async update(id: string, input: UpdateSeasonInput) {
    const existing = await this.prisma.season.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Season not found');
    }

    const updated = await this.prisma.season.update({
      where: { id },
      data: {
        name: typeof input.name !== 'undefined' ? input.name : existing.name,
        startDate:
          typeof input.startDate !== 'undefined' ? input.startDate : existing.startDate,
        endDate:
          typeof input.endDate !== 'undefined' ? input.endDate : existing.endDate,
        notes: typeof input.notes !== 'undefined' ? input.notes : existing.notes,
        isActive:
          typeof input.isActive !== 'undefined' ? input.isActive : existing.isActive,
      },
    });

    if (input.isActive) {
      await this.setActive(id);
      return this.get(id);
    }

    return updated;
  }

  async setActive(id: string) {
    const existing = await this.prisma.season.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Season not found');
    }

    const [, season] = await this.prisma.$transaction([
      this.prisma.season.updateMany({
        data: { isActive: false },
        where: { id: { not: id } },
      }),
      this.prisma.season.update({
        where: { id },
        data: { isActive: true },
      }),
    ]);

    return season;
  }
}
