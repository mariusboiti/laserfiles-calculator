import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface ListCustomersParams {
  search?: string;
}

interface CreateCustomerInput {
  name: string;
  email?: string;
  phone?: string;
  notes?: string;
}

interface UpdateCustomerInput {
  name?: string;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
}

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(params: ListCustomersParams) {
    const where: any = {};

    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { email: { contains: params.search, mode: 'insensitive' } },
        { phone: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const customers = await this.prisma.customer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { orders: true },
        },
      },
    });

    return {
      data: customers,
      total: customers.length,
    };
  }

  async findOne(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        orders: {
          orderBy: { createdAt: 'desc' },
          include: {
            _count: { select: { items: true } },
          },
        },
      },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }
    return customer;
  }

  async create(data: CreateCustomerInput) {
    const created = await this.prisma.customer.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        notes: data.notes,
      },
    });
    return created;
  }

  async update(id: string, data: UpdateCustomerInput) {
    await this.ensureExists(id);

    const updated = await this.prisma.customer.update({
      where: { id },
      data,
    });

    return updated;
  }

  private async ensureExists(id: string) {
    const customer = await this.prisma.customer.findUnique({ where: { id } });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }
    return customer;
  }
}
