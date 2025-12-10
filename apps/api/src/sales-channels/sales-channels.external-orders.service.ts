import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ExternalOrderPayload } from './connectors/base.connector';
import { OrdersService } from '../orders/orders.service';

interface ListExternalOrdersParams {
  connectionId?: string;
  processedState?: string;
}

@Injectable()
export class SalesChannelsExternalOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  private get prismaClient() {
    return this.prisma as any;
  }

  async list(params: ListExternalOrdersParams) {
    const where: any = {};
    if (params.connectionId) {
      where.connectionId = params.connectionId;
    }
    if (params.processedState) {
      where.processedState = params.processedState as any;
    }

    const items = await this.prismaClient.externalOrder.findMany({
      where,
      orderBy: { importedAt: 'desc' },
      include: {
        connection: true,
      },
    });

    return {
      data: items,
      total: items.length,
    };
  }

  async getForReview(id: string) {
    const order = await this.prismaClient.externalOrder.findUnique({
      where: { id },
      include: {
        connection: true,
        items: true,
      },
    });
    if (!order) {
      throw new NotFoundException('External order not found');
    }
    return order;
  }

  async markIgnored(id: string) {
    const existing = await this.prismaClient.externalOrder.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('External order not found');
    }

    const updated = await this.prismaClient.externalOrder.update({
      where: { id },
      data: {
        processedState: 'IGNORED',
        errorMessage: null,
      },
    });

    return updated;
  }

  async createInternalOrderFromExternal(id: string) {
    const ext = await this.prismaClient.externalOrder.findUnique({
      where: { id },
      include: { connection: true, items: true, orderLinks: true },
    });
    if (!ext) {
      throw new NotFoundException('External order not found');
    }

    if (ext.orderLinks.length > 0 || ext.processedState === 'CREATED_INTERNAL') {
      return {
        alreadyCreated: true,
        externalOrderId: ext.id,
        internalOrderId: ext.orderLinks[0]?.internalOrderId ?? null,
      };
    }

    const items = ext.items as any[];
    if (!items || items.length === 0) {
      await this.prismaClient.externalOrder.update({
        where: { id },
        data: {
          processedState: 'NEEDS_REVIEW',
          errorMessage: 'External order has no items to import.',
        },
      });
      throw new BadRequestException('External order has no items to import.');
    }

    const productIds = Array.from(
      new Set(
        items
          .map((i) => i.externalProductId as string | null)
          .filter((v): v is string => !!v),
      ),
    );

    const mappings = productIds.length
      ? await this.prismaClient.externalProductMapping.findMany({
          where: {
            connectionId: ext.connectionId,
            externalProductId: { in: productIds },
            isActive: true,
          },
          include: {
            template: true,
            variant: true,
            material: true,
            templateProduct: true,
          },
        })
      : [];

    const mappingByProductId: Record<string, any> = {};
    for (const m of mappings) {
      mappingByProductId[m.externalProductId] = m;
    }

    const unmapped: string[] = [];
    for (const item of items) {
      const pid = item.externalProductId as string | null;
      if (!pid) {
        unmapped.push(item.title as string);
        continue;
      }
      const mapping = mappingByProductId[pid];
      if (!mapping) {
        unmapped.push(pid);
      }
    }

    if (unmapped.length > 0) {
      const message = `Missing product mappings for: ${unmapped.join(', ')}`;
      await this.prismaClient.externalOrder.update({
        where: { id },
        data: {
          processedState: 'NEEDS_REVIEW',
          errorMessage: message,
        },
      });
      throw new BadRequestException('Missing product mappings for some external items.');
    }

    const snapshot = (ext.customerSnapshotJson ?? {}) as any;
    const email: string | undefined = snapshot.email || snapshot.customer_email;
    const name: string =
      snapshot.name || snapshot.fullName || snapshot.customer_name || 'Online customer';

    let customer = null as any;
    if (email) {
      customer = await this.prismaClient.customer.findFirst({ where: { email } });
    }
    if (!customer) {
      customer = await this.prismaClient.customer.create({
        data: {
          name,
          email: email ?? null,
        },
      });
    }

    const settings = (ext.connection.settingsJson ?? {}) as any;
    const prioritySetting =
      settings.default_order_priority || settings.defaultPriority || settings.default_priority;
    const priority = prioritySetting === 'URGENT' ? 'URGENT' : 'NORMAL';

    const order = await this.prismaClient.order.create({
      data: {
        customerId: customer.id,
        status: 'NEW',
        priority,
        notes: `Imported from ${ext.connection.channel} #${ext.externalOrderNumber}`,
      },
    });

    const ordersService = new OrdersService(this.prisma as any);

    for (const item of items) {
      const pid = item.externalProductId as string | null;
      const mapping = pid ? mappingByProductId[pid] : null;
      if (!mapping) {
        continue;
      }

      const quantityRaw = item.quantity as number | null;
      const quantity = quantityRaw && quantityRaw > 0 ? quantityRaw : 1;

      const personalization = this.buildPersonalizationFromMapping(mapping, item);

      const templateId = mapping.templateId as string;
      const variantId =
        (mapping.variantId as string | null) ??
        (mapping.templateProduct?.variantId as string | null) ??
        undefined;
      const materialId =
        (mapping.materialId as string | null) ??
        (mapping.templateProduct?.materialId as string | null) ??
        undefined;

      let priceOverride: number | undefined;
      const pricingMode = mapping.pricingMode as string | null;
      if (pricingMode === 'PRICE_OVERRIDE') {
        if (mapping.priceOverride != null) {
          const p = Number(mapping.priceOverride);
          if (!Number.isNaN(p)) priceOverride = p;
        } else if (typeof item.unitPrice === 'number') {
          const p = Number(item.unitPrice);
          if (!Number.isNaN(p)) priceOverride = p;
        }
      } else if (mapping.templateProduct?.priceOverride != null) {
        const p = Number(mapping.templateProduct.priceOverride);
        if (!Number.isNaN(p)) priceOverride = p;
      }

      await ordersService.addItemFromTemplate(
        order.id,
        {
          templateId,
          variantId,
          materialId,
          quantity,
          personalization,
          templateProductId: (mapping.templateProductId as string | null) ?? undefined,
          priceOverride,
        },
        null as any,
      );
    }

    await this.prismaClient.internalOrderExternalLink.create({
      data: {
        internalOrderId: order.id,
        externalOrderId: ext.id,
        channel: ext.connection.channel,
        connectionId: ext.connectionId,
      },
    });

    await this.prismaClient.externalOrder.update({
      where: { id: ext.id },
      data: {
        processedState: 'CREATED_INTERNAL',
        errorMessage: null,
      },
    });

    return {
      externalOrderId: ext.id,
      internalOrderId: order.id,
    };
  }

  private buildPersonalizationFromMapping(mapping: any, item: any): any {
    const options = (item.optionsJson ?? {}) as any;
    const result: any = {};

    const cfg = (mapping.personalizationMappingJson ?? {}) as any;
    const fieldsMap = (cfg.fields ?? {}) as Record<string, string>;

    for (const [internalKey, externalKey] of Object.entries(fieldsMap)) {
      const key = String(externalKey);
      const value = options[key];
      if (typeof value !== 'undefined' && value !== null && value !== '') {
        result[internalKey] = value;
      }
    }

    if (!Object.keys(result).length && options.personalization_text) {
      result.personalization_text = options.personalization_text;
    }

    if (mapping.templateProduct?.personalizationJson) {
      return {
        ...(mapping.templateProduct.personalizationJson as any),
        ...result,
      };
    }

    return result;
  }

  async ingestExternalOrders(connectionId: string, payloads: ExternalOrderPayload[]) {
    let imported = 0;

    for (const payload of payloads) {
      if (!payload.externalOrderId) {
        continue;
      }

      await this.prismaClient.externalOrder.upsert({
        where: {
          connectionId_externalOrderId: {
            connectionId,
            externalOrderId: payload.externalOrderId,
          },
        },
        create: {
          connectionId,
          externalOrderId: payload.externalOrderId,
          externalOrderNumber: payload.orderNumber,
          externalStatus: payload.status ?? null,
          currency: payload.currency ?? null,
          totalsJson: payload.totals ?? {},
          customerSnapshotJson: payload.customer ?? {},
          rawPayloadJson: payload.raw ?? {},
          items: {
            create: (payload.items || []).map((item) => ({
              externalProductId: item.externalProductId ?? null,
              title: item.title,
              quantity: item.quantity && item.quantity > 0 ? item.quantity : 1,
              unitPrice:
                typeof item.unitPrice === 'number' && !Number.isNaN(item.unitPrice)
                  ? item.unitPrice
                  : null,
              optionsJson: item.options ?? {},
              rawPayloadJson: item.raw ?? {},
            })),
          },
        },
        update: {
          externalOrderNumber: payload.orderNumber,
          externalStatus: payload.status ?? null,
          currency: payload.currency ?? null,
          totalsJson: payload.totals ?? {},
          customerSnapshotJson: payload.customer ?? {},
          rawPayloadJson: payload.raw ?? {},
        },
      });

      imported += 1;
    }

    return { imported };
  }
}
