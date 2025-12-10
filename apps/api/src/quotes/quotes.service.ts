import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface ListQuotesParams {
  page?: number;
  pageSize?: number;
}

interface CreateQuoteInput {
  customerId?: string;
  data: any;
}

@Injectable()
export class QuotesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(params: ListQuotesParams) {
    const page = params.page && params.page > 0 ? params.page : 1;
    const pageSize = params.pageSize && params.pageSize > 0 ? params.pageSize : 20;

    const [quotes, total] = await this.prisma.$transaction([
      this.prisma.quote.findMany({
        include: { customer: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.quote.count(),
    ]);

    return {
      data: quotes,
      total,
      page,
      pageSize,
    };
  }

  async findOne(id: string) {
    const quote = await this.prisma.quote.findUnique({
      where: { id },
      include: { customer: true },
    });

    if (!quote) {
      throw new NotFoundException('Quote not found');
    }

    return quote;
  }

  async create(input: CreateQuoteInput) {
    if (input.customerId) {
      const customer = await this.prisma.customer.findUnique({
        where: { id: input.customerId },
      });
      if (!customer) {
        throw new NotFoundException('Customer not found');
      }
    }

    const created = await this.prisma.quote.create({
      data: {
        customerId: input.customerId,
        dataJson: input.data,
      },
    });

    return created;
  }

  async createOrderFromQuote(id: string, userId: string) {
    const quote = await this.prisma.quote.findUnique({ where: { id } });
    if (!quote) {
      throw new NotFoundException('Quote not found');
    }

    if (!quote.customerId) {
      throw new BadRequestException('Quote has no customer linked');
    }

    const customer = await this.prisma.customer.findUnique({
      where: { id: quote.customerId },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const data = (quote.dataJson || {}) as any;
    const pricingInput = data.pricingInput ?? data.input;
    const material = data.material;

    if (!pricingInput) {
      throw new BadRequestException('Quote is missing pricing input');
    }

    const order = await this.prisma.order.create({
      data: {
        customerId: quote.customerId,
        notes: `Created from quote ${quote.id}`,
        items: {
          create: [
            {
              title: pricingInput.title || 'Item from quote',
              materialId: material?.id,
              quantity: pricingInput.quantity ?? 1,
              widthMm: pricingInput.widthMm,
              heightMm: pricingInput.heightMm,
              customizationText: pricingInput.customizationText || undefined,
              estimatedMinutes:
                typeof pricingInput.machineMinutes === 'number'
                  ? pricingInput.machineMinutes
                  : undefined,
            },
          ],
        },
        activityLog: {
          create: {
            userId,
            field: 'SYSTEM',
            oldValue: null,
            newValue: `Order created from quote ${quote.id}`,
          },
        },
      },
    });

    return order;
  }
}
