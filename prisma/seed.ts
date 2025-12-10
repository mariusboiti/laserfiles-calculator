import {
  PrismaClient,
  UserRole,
  MaterialCategory,
  MaterialUnitType,
  OrderPriority,
  OrderStatus,
  TemplateFieldType,
  TemplateRuleType,
  BatchStatus,
  BatchPriority,
  BatchType,
} from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash('admin123', 10);
  const workerPassword = await bcrypt.hash('worker123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: 'Admin User',
      password: adminPassword,
      role: UserRole.ADMIN,
    },
  });

  const worker = await prisma.user.upsert({
    where: { email: 'worker@example.com' },
    update: {},
    create: {
      email: 'worker@example.com',
      name: 'Worker User',
      password: workerPassword,
      role: UserRole.WORKER,
    },
  });

  const materials = await prisma.$transaction([
    prisma.material.create({
      data: {
        name: '3mm Birch Plywood',
        category: MaterialCategory.PLYWOOD,
        thicknessMm: 3,
        unitType: MaterialUnitType.SHEET,
        costPerSheet: 12,
        sheetWidthMm: 600,
        sheetHeightMm: 400,
        stockQty: 20,
        lowStockThreshold: 5,
      },
    }),
    prisma.material.create({
      data: {
        name: '4mm MDF',
        category: MaterialCategory.MDF,
        thicknessMm: 4,
        unitType: MaterialUnitType.SHEET,
        costPerSheet: 10,
        sheetWidthMm: 600,
        sheetHeightMm: 400,
        stockQty: 15,
        lowStockThreshold: 4,
      },
    }),
    prisma.material.create({
      data: {
        name: '3mm Clear Acrylic',
        category: MaterialCategory.ACRYLIC,
        thicknessMm: 3,
        unitType: MaterialUnitType.SHEET,
        costPerSheet: 20,
        sheetWidthMm: 600,
        sheetHeightMm: 400,
        stockQty: 10,
        lowStockThreshold: 3,
      },
    }),
    prisma.material.create({
      data: {
        name: '3mm Mirror Acrylic',
        category: MaterialCategory.MIRROR_ACRYLIC,
        thicknessMm: 3,
        unitType: MaterialUnitType.SHEET,
        costPerSheet: 25,
        sheetWidthMm: 600,
        sheetHeightMm: 400,
        stockQty: 8,
        lowStockThreshold: 2,
      },
    }),
    prisma.material.create({
      data: {
        name: '6mm Birch Plywood',
        category: MaterialCategory.PLYWOOD,
        thicknessMm: 6,
        unitType: MaterialUnitType.SHEET,
        costPerSheet: 18,
        sheetWidthMm: 600,
        sheetHeightMm: 400,
        stockQty: 12,
        lowStockThreshold: 3,
      },
    }),
  ]);

  const [birch3mm, mdf4mm, clearAcrylic3mm, mirrorAcrylic3mm, birch6mm] = materials;

  const ornamentsCategory = await prisma.templateCategory.upsert({
    where: { slug: 'ornaments' },
    update: {},
    create: {
      name: 'Ornaments',
      slug: 'ornaments',
    },
  });

  const namesCategory = await prisma.templateCategory.upsert({
    where: { slug: 'names' },
    update: {},
    create: {
      name: 'Names & Signs',
      slug: 'names',
    },
  });

  const giftBoxesCategory = await prisma.templateCategory.upsert({
    where: { slug: 'gift-boxes' },
    update: {},
    create: {
      name: 'Gift Boxes',
      slug: 'gift-boxes',
    },
  });

  const nameOrnamentTemplate = await prisma.productTemplate.upsert({
    where: { slug: 'name-ornament-circle' },
    update: {},
    create: {
      name: 'Name Ornament - Circle',
      slug: 'name-ornament-circle',
      categoryId: ornamentsCategory.id,
      defaultMaterialId: clearAcrylic3mm.id,
      baseWidthMm: 90,
      baseHeightMm: 90,
      layersCount: 1,
      description: 'Round name ornament with ribbon hole. Includes name and optional year.',
      isActive: true,
    },
  });

  const doorNameTemplate = await prisma.productTemplate.upsert({
    where: { slug: 'door-name-sign' },
    update: {},
    create: {
      name: 'Door Name Sign',
      slug: 'door-name-sign',
      categoryId: namesCategory.id,
      defaultMaterialId: birch3mm.id,
      baseWidthMm: 400,
      baseHeightMm: 150,
      layersCount: 1,
      description: 'Horizontal door sign with single name in script font.',
      isActive: true,
    },
  });

  const giftBoxTemplate = await prisma.productTemplate.upsert({
    where: { slug: 'engraved-gift-box' },
    update: {},
    create: {
      name: 'Engraved Gift Box',
      slug: 'engraved-gift-box',
      categoryId: giftBoxesCategory.id,
      defaultMaterialId: birch6mm.id,
      baseWidthMm: 180,
      baseHeightMm: 180,
      layersCount: 2,
      description: 'Small wooden gift box with engraved lid text.',
      isActive: true,
    },
  });

  const nameOrnamentVariants = await prisma.templateVariant.count({
    where: { templateId: nameOrnamentTemplate.id },
  });
  if (nameOrnamentVariants === 0) {
    await prisma.templateVariant.createMany({
      data: [
        {
          templateId: nameOrnamentTemplate.id,
          name: 'Standard 8cm',
          defaultMaterialId: clearAcrylic3mm.id,
          widthMm: 80,
          heightMm: 80,
          isActive: true,
        },
      ],
    });
  }

  const doorNameVariants = await prisma.templateVariant.count({
    where: { templateId: doorNameTemplate.id },
  });
  if (doorNameVariants === 0) {
    await prisma.templateVariant.createMany({
      data: [
        {
          templateId: doorNameTemplate.id,
          name: 'Standard 40cm',
          defaultMaterialId: birch3mm.id,
          widthMm: 400,
          heightMm: 150,
          isActive: true,
        },
      ],
    });
  }

  const giftBoxVariants = await prisma.templateVariant.count({
    where: { templateId: giftBoxTemplate.id },
  });
  if (giftBoxVariants === 0) {
    await prisma.templateVariant.createMany({
      data: [
        {
          templateId: giftBoxTemplate.id,
          name: 'Small box',
          defaultMaterialId: birch6mm.id,
          widthMm: 180,
          heightMm: 180,
          isActive: true,
        },
      ],
    });
  }

  const nameOrnamentFields = await prisma.templatePersonalizationField.count({
    where: { templateId: nameOrnamentTemplate.id },
  });
  if (nameOrnamentFields === 0) {
    await prisma.templatePersonalizationField.createMany({
      data: [
        {
          templateId: nameOrnamentTemplate.id,
          key: 'name',
          label: 'Name',
          fieldType: TemplateFieldType.TEXT,
          required: true,
          maxLength: 16,
          affectsPricing: true,
          affectsProductionNotes: false,
        },
        {
          templateId: nameOrnamentTemplate.id,
          key: 'year',
          label: 'Year',
          fieldType: TemplateFieldType.TEXT,
          required: false,
          maxLength: 4,
          affectsPricing: false,
          affectsProductionNotes: true,
        },
      ],
    });
  }

  const doorNameFields = await prisma.templatePersonalizationField.count({
    where: { templateId: doorNameTemplate.id },
  });
  if (doorNameFields === 0) {
    await prisma.templatePersonalizationField.createMany({
      data: [
        {
          templateId: doorNameTemplate.id,
          key: 'name',
          label: 'Name',
          fieldType: TemplateFieldType.TEXT,
          required: true,
          maxLength: 20,
          affectsPricing: true,
          affectsProductionNotes: false,
        },
      ],
    });
  }

  const giftBoxFields = await prisma.templatePersonalizationField.count({
    where: { templateId: giftBoxTemplate.id },
  });
  if (giftBoxFields === 0) {
    await prisma.templatePersonalizationField.createMany({
      data: [
        {
          templateId: giftBoxTemplate.id,
          key: 'recipient_name',
          label: 'Recipient name',
          fieldType: TemplateFieldType.TEXT,
          required: true,
          maxLength: 24,
          affectsPricing: false,
          affectsProductionNotes: true,
        },
        {
          templateId: giftBoxTemplate.id,
          key: 'message',
          label: 'Message',
          fieldType: TemplateFieldType.TEXT,
          required: false,
          maxLength: 80,
          affectsPricing: false,
          affectsProductionNotes: true,
        },
      ],
    });
  }

  const nameOrnamentRules = await prisma.templatePricingRule.count({
    where: { templateId: nameOrnamentTemplate.id },
  });
  if (nameOrnamentRules === 0) {
    await prisma.templatePricingRule.createMany({
      data: [
        {
          templateId: nameOrnamentTemplate.id,
          ruleType: TemplateRuleType.FIXED_BASE,
          value: 30,
          priority: 0,
        },
        {
          templateId: nameOrnamentTemplate.id,
          ruleType: TemplateRuleType.PER_CHARACTER,
          value: 1.2,
          priority: 10,
        },
      ],
    });
  }

  const doorNameRules = await prisma.templatePricingRule.count({
    where: { templateId: doorNameTemplate.id },
  });
  if (doorNameRules === 0) {
    await prisma.templatePricingRule.createMany({
      data: [
        {
          templateId: doorNameTemplate.id,
          ruleType: TemplateRuleType.FIXED_BASE,
          value: 60,
          priority: 0,
        },
        {
          templateId: doorNameTemplate.id,
          ruleType: TemplateRuleType.PER_CHARACTER,
          value: 1.5,
          priority: 10,
        },
      ],
    });
  }

  const giftBoxRules = await prisma.templatePricingRule.count({
    where: { templateId: giftBoxTemplate.id },
  });
  if (giftBoxRules === 0) {
    await prisma.templatePricingRule.createMany({
      data: [
        {
          templateId: giftBoxTemplate.id,
          ruleType: TemplateRuleType.FIXED_BASE,
          value: 45,
          priority: 0,
        },
        {
          templateId: giftBoxTemplate.id,
          ruleType: TemplateRuleType.PER_CM2,
          value: 0.12,
          priority: 10,
        },
      ],
    });
  }

  // Demo Sales Channels: connections
  const existingWooConnection = await prisma.storeConnection.findFirst({
    where: { name: 'Demo Woo Store' },
  });
  const wooConnection =
    existingWooConnection ??
    (await prisma.storeConnection.create({
      data: {
        name: 'Demo Woo Store',
        channel: 'WOOCOMMERCE' as any,
        status: 'DISCONNECTED' as any,
        credentialsJson: {},
        settingsJson: {
          auto_import_enabled: false,
          auto_create_orders: false,
          default_order_priority: 'NORMAL',
        },
      },
    }));

  const existingEtsyConnection = await prisma.storeConnection.findFirst({
    where: { name: 'Demo Etsy Shop' },
  });
  const etsyConnection =
    existingEtsyConnection ??
    (await prisma.storeConnection.create({
      data: {
        name: 'Demo Etsy Shop',
        channel: 'ETSY' as any,
        status: 'DISCONNECTED' as any,
        credentialsJson: {},
        settingsJson: {
          auto_import_enabled: false,
          auto_create_orders: false,
          default_order_priority: 'NORMAL',
        },
      },
    }));

  // Ensure demo connections have status push defaults for Pack 2.1
  await prisma.storeConnection.update({
    where: { id: wooConnection.id },
    data: {
      settingsJson: {
        ...(wooConnection.settingsJson as any),
        auto_import_enabled:
          (wooConnection.settingsJson as any)?.auto_import_enabled ?? false,
        auto_create_orders:
          (wooConnection.settingsJson as any)?.auto_create_orders ?? false,
        default_order_priority:
          (wooConnection.settingsJson as any)?.default_order_priority ?? 'NORMAL',
        enable_status_push:
          (wooConnection.settingsJson as any)?.enable_status_push ?? true,
        shipped_status_value:
          (wooConnection.settingsJson as any)?.shipped_status_value ?? 'completed',
      },
    },
  });

  await prisma.storeConnection.update({
    where: { id: etsyConnection.id },
    data: {
      settingsJson: {
        ...(etsyConnection.settingsJson as any),
        auto_import_enabled:
          (etsyConnection.settingsJson as any)?.auto_import_enabled ?? false,
        auto_create_orders:
          (etsyConnection.settingsJson as any)?.auto_create_orders ?? false,
        default_order_priority:
          (etsyConnection.settingsJson as any)?.default_order_priority ?? 'NORMAL',
        enable_status_push:
          (etsyConnection.settingsJson as any)?.enable_status_push ?? true,
        shipped_status_value:
          (etsyConnection.settingsJson as any)?.shipped_status_value ?? 'shipped',
      },
    },
  });

  // Demo Product Mappings
  await prisma.externalProductMapping.upsert({
    where: {
      connectionId_externalProductId: {
        connectionId: wooConnection.id,
        externalProductId: 'SKU-NAME-ORNAMENT',
      },
    },
    create: {
      connectionId: wooConnection.id,
      externalProductId: 'SKU-NAME-ORNAMENT',
      externalProductName: 'Name Ornament (Woo)',
      templateId: nameOrnamentTemplate.id,
      personalizationMappingJson: {
        fields: {
          name: 'Name',
          year: 'Year',
        },
      },
      pricingMode: 'USE_TEMPLATE_RULES' as any,
      priceOverride: null,
    },
    update: {},
  });

  await prisma.externalProductMapping.upsert({
    where: {
      connectionId_externalProductId: {
        connectionId: wooConnection.id,
        externalProductId: 'SKU-DOOR-NAME',
      },
    },
    create: {
      connectionId: wooConnection.id,
      externalProductId: 'SKU-DOOR-NAME',
      externalProductName: 'Door Name Sign (Woo)',
      templateId: doorNameTemplate.id,
      personalizationMappingJson: {
        fields: {
          name: 'Name',
        },
      },
      pricingMode: 'USE_TEMPLATE_RULES' as any,
      priceOverride: null,
    },
    update: {},
  });

  await prisma.externalProductMapping.upsert({
    where: {
      connectionId_externalProductId: {
        connectionId: etsyConnection.id,
        externalProductId: 'ETSY-GIFT-BOX',
      },
    },
    create: {
      connectionId: etsyConnection.id,
      externalProductId: 'ETSY-GIFT-BOX',
      externalProductName: 'Engraved Gift Box (Etsy)',
      templateId: giftBoxTemplate.id,
      personalizationMappingJson: {
        fields: {
          recipient_name: 'Name',
          message: 'Message',
        },
      },
      pricingMode: 'PRICE_OVERRIDE' as any,
      priceOverride: 120,
    },
    update: {},
  });

  // Demo External Orders
  const existingWooExternal = await prisma.externalOrder.findFirst({
    where: {
      connectionId: wooConnection.id,
      externalOrderId: '1001',
    },
  });
  if (!existingWooExternal) {
    await prisma.externalOrder.create({
      data: {
        connectionId: wooConnection.id,
        externalOrderId: '1001',
        externalOrderNumber: '1001',
        externalStatus: 'processing',
        currency: 'EUR',
        importedAt: new Date(),
        customerSnapshotJson: {
          name: 'Woo Demo Customer',
          email: 'woo-demo@example.com',
        },
        totalsJson: {},
        rawPayloadJson: {},
        items: {
          create: [
            {
              externalProductId: 'SKU-NAME-ORNAMENT',
              title: 'Name Ornament - Circle',
              quantity: 2,
              unitPrice: 35,
              optionsJson: {
                Name: 'Andrei',
                Year: '2025',
              },
              rawPayloadJson: {},
            },
          ],
        },
      },
    });
  }

  const existingEtsyExternal = await prisma.externalOrder.findFirst({
    where: {
      connectionId: etsyConnection.id,
      externalOrderId: 'ETSY-2001',
    },
  });
  if (!existingEtsyExternal) {
    await prisma.externalOrder.create({
      data: {
        connectionId: etsyConnection.id,
        externalOrderId: 'ETSY-2001',
        externalOrderNumber: '2001',
        externalStatus: 'paid',
        currency: 'EUR',
        importedAt: new Date(),
        customerSnapshotJson: {
          name: 'Etsy Demo Buyer',
          email: 'etsy-demo@example.com',
        },
        totalsJson: {},
        rawPayloadJson: {},
        items: {
          create: [
            {
              externalProductId: 'ETSY-GIFT-BOX',
              title: 'Engraved Gift Box',
              quantity: 1,
              unitPrice: 150,
              optionsJson: {
                Name: 'Ana',
                Message: 'La multi ani!',
              },
              rawPayloadJson: {},
            },
          ],
        },
      },
    });
  }

  // Additional demo external orders for Pack 2.1 states
  await prisma.externalOrder.upsert({
    where: {
      connectionId_externalOrderId: {
        connectionId: wooConnection.id,
        externalOrderId: '1002',
      },
    },
    create: {
      connectionId: wooConnection.id,
      externalOrderId: '1002',
      externalOrderNumber: '1002',
      externalStatus: 'on-hold',
      currency: 'EUR',
      importedAt: new Date(),
      processedState: 'NEEDS_REVIEW' as any,
      errorMessage: 'Missing product mappings for: SKU-UNKNOWN',
      customerSnapshotJson: {
        name: 'Woo Review Customer',
        email: 'woo-review@example.com',
      },
      totalsJson: {},
      rawPayloadJson: {},
      items: {
        create: [
          {
            externalProductId: 'SKU-UNKNOWN',
            title: 'Unknown Product from Woo',
            quantity: 1,
            unitPrice: 50,
            optionsJson: {
              Note: 'Please check mapping',
            },
            rawPayloadJson: {},
          },
        ],
      },
    },
    update: {
      processedState: 'NEEDS_REVIEW' as any,
      errorMessage: 'Missing product mappings for: SKU-UNKNOWN',
    },
  });

  await prisma.externalOrder.upsert({
    where: {
      connectionId_externalOrderId: {
        connectionId: wooConnection.id,
        externalOrderId: '1003',
      },
    },
    create: {
      connectionId: wooConnection.id,
      externalOrderId: '1003',
      externalOrderNumber: '1003',
      externalStatus: 'cancelled',
      currency: 'EUR',
      importedAt: new Date(),
      processedState: 'IGNORED' as any,
      errorMessage: null,
      customerSnapshotJson: {
        name: 'Woo Ignored Customer',
        email: 'woo-ignored@example.com',
      },
      totalsJson: {},
      rawPayloadJson: {},
      items: {
        create: [
          {
            externalProductId: 'SKU-NAME-ORNAMENT',
            title: 'Old Name Ornament',
            quantity: 1,
            unitPrice: 30,
            optionsJson: {},
            rawPayloadJson: {},
          },
        ],
      },
    },
    update: {
      processedState: 'IGNORED' as any,
      errorMessage: null,
    },
  });

  await prisma.externalOrder.upsert({
    where: {
      connectionId_externalOrderId: {
        connectionId: etsyConnection.id,
        externalOrderId: 'ETSY-2002',
      },
    },
    create: {
      connectionId: etsyConnection.id,
      externalOrderId: 'ETSY-2002',
      externalOrderNumber: '2002',
      externalStatus: 'paid',
      currency: 'EUR',
      importedAt: new Date(),
      processedState: 'ERROR' as any,
      errorMessage: 'Failed to import some items from Etsy payload.',
      customerSnapshotJson: {
        name: 'Etsy Error Buyer',
        email: 'etsy-error@example.com',
      },
      totalsJson: {},
      rawPayloadJson: {},
      items: {
        create: [
          {
            externalProductId: null,
            title: 'Etsy Custom Listing',
            quantity: 1,
            unitPrice: 80,
            optionsJson: {},
            rawPayloadJson: {},
          },
        ],
      },
    },
    update: {
      processedState: 'ERROR' as any,
      errorMessage: 'Failed to import some items from Etsy payload.',
    },
  });

  // Demo ExternalSyncLog entries for Pack 2.1 outbound status sync
  const wooOrder1001 = await prisma.externalOrder.findFirst({
    where: {
      connectionId: wooConnection.id,
      externalOrderId: '1001',
    },
  });

  if (wooOrder1001) {
    const existingSync = await prisma.externalSyncLog.findFirst({
      where: {
        externalOrderId: wooOrder1001.id,
        action: 'STATUS_PUSH',
      },
    });

    if (!existingSync) {
      await prisma.externalSyncLog.create({
        data: {
          connectionId: wooConnection.id,
          externalOrderId: wooOrder1001.id,
          action: 'STATUS_PUSH',
          status: 'SUCCESS' as any,
          errorMessage: null,
          createdAt: new Date(),
        },
      });
    }
  }

  const etsyOrder2001 = await prisma.externalOrder.findFirst({
    where: {
      connectionId: etsyConnection.id,
      externalOrderId: 'ETSY-2001',
    },
  });

  if (etsyOrder2001) {
    const existingSync = await prisma.externalSyncLog.findFirst({
      where: {
        externalOrderId: etsyOrder2001.id,
        action: 'STATUS_PUSH',
      },
    });

    if (!existingSync) {
      await prisma.externalSyncLog.create({
        data: {
          connectionId: etsyConnection.id,
          externalOrderId: etsyOrder2001.id,
          action: 'STATUS_PUSH',
          status: 'FAILED' as any,
          errorMessage: 'Demo failure: Etsy API token expired.',
          createdAt: new Date(),
        },
      });
    }
  }

  const customers = await prisma.$transaction([
    prisma.customer.create({
      data: {
        name: 'WoodCraft Studio',
        email: 'hello@woodcraft.test',
        phone: '+40 721 000 001',
      },
    }),
    prisma.customer.create({
      data: {
        name: 'Acrylic Art Shop',
        email: 'contact@acrylicartexample.test',
        phone: '+40 721 000 002',
      },
    }),
    prisma.customer.create({
      data: {
        name: 'GiftThings',
        email: 'orders@giftthings.test',
        phone: '+40 721 000 003',
      },
    }),
    prisma.customer.create({
      data: {
        name: 'Laser Crafts RO',
        email: 'office@lasercrafts.test',
        phone: '+40 721 000 004',
      },
    }),
    prisma.customer.create({
      data: {
        name: 'Makers Club',
        email: 'team@makersclub.test',
        phone: '+40 721 000 005',
      },
    }),
  ]);

  for (let i = 0; i < 10; i++) {
    const customer = customers[i % customers.length];
    const material = materials[i % materials.length];

    const order = await prisma.order.create({
      data: {
        customerId: customer.id,
        status: i < 3 ? OrderStatus.NEW : i < 6 ? OrderStatus.IN_PROGRESS : OrderStatus.READY,
        priority: i % 4 === 0 ? OrderPriority.URGENT : OrderPriority.NORMAL,
        notes: 'Sample order ' + (i + 1),
      },
    });

    await prisma.orderItem.create({
      data: {
        orderId: order.id,
        title: `Sample item ${i + 1}`,
        materialId: material.id,
        quantity: (i % 3) + 1,
        widthMm: 200,
        heightMm: 100,
        customizationText: i % 2 === 0 ? 'Name: Andrei' : 'Name: Maria',
        estimatedMinutes: 20 + i * 5,
        priceSnapshotJson: {
          materialCost: 25 + i,
          machineCost: 10,
          laborCost: 15,
          addOns: [],
          marginPercent: 40,
          totalCost: 50 + i,
          recommendedPrice: 80 + i,
        },
      },
    });
  }

  // Pack 3: Seasons, Batches, TemplateMaterialHints and demo batch items

  // Ensure template material hints exist for forecast
  const existingNameOrnamentHint = await prisma.templateMaterialHint.findFirst({
    where: { templateId: nameOrnamentTemplate.id },
  });
  if (!existingNameOrnamentHint) {
    await prisma.templateMaterialHint.create({
      data: {
        templateId: nameOrnamentTemplate.id,
        avgAreaMm2PerItem: 6500,
        avgSheetFractionPerItem: 0.08,
      },
    });
  }

  const existingDoorNameHint = await prisma.templateMaterialHint.findFirst({
    where: { templateId: doorNameTemplate.id },
  });
  if (!existingDoorNameHint) {
    await prisma.templateMaterialHint.create({
      data: {
        templateId: doorNameTemplate.id,
        avgAreaMm2PerItem: 30000,
        avgSheetFractionPerItem: 0.18,
      },
    });
  }

  // Create or reuse demo Season "Christmas 2025" and mark it active
  let christmasSeason = await prisma.season.findFirst({
    where: { name: 'Christmas 2025' },
  });

  if (!christmasSeason) {
    const currentYear = new Date().getFullYear();
    christmasSeason = await prisma.season.create({
      data: {
        name: 'Christmas 2025',
        startDate: new Date(currentYear, 10, 1), // November 1st
        endDate: new Date(currentYear, 11, 31), // December 31st
        isActive: true,
        notes: 'Demo high season for ornaments and gifts.',
      },
    });
  }

  // Ensure only this demo season is active
  await prisma.season.updateMany({
    where: { id: { not: christmasSeason.id } },
    data: { isActive: false },
  });
  await prisma.season.update({
    where: { id: christmasSeason.id },
    data: { isActive: true },
  });

  // Demo batches in different states for this season
  const plannedBatchName = 'Christmas ornaments – planned';
  const readyBatchName = 'Christmas ornaments – ready';
  const inProgressBatchName = 'Door signs – in progress';

  let plannedBatch = await prisma.productionBatch.findFirst({
    where: { name: plannedBatchName, seasonId: christmasSeason.id },
  });
  if (!plannedBatch) {
    plannedBatch = await prisma.productionBatch.create({
      data: {
        name: plannedBatchName,
        seasonId: christmasSeason.id,
        batchType: BatchType.TEMPLATE_RUN,
        status: BatchStatus.PLANNED,
        priority: BatchPriority.NORMAL,
        targetDate: null,
        notes: 'Demo batch with acrylic ornaments not started yet.',
      },
    });
  }

  let readyBatch = await prisma.productionBatch.findFirst({
    where: { name: readyBatchName, seasonId: christmasSeason.id },
  });
  if (!readyBatch) {
    readyBatch = await prisma.productionBatch.create({
      data: {
        name: readyBatchName,
        seasonId: christmasSeason.id,
        batchType: BatchType.TEMPLATE_RUN,
        status: BatchStatus.READY,
        priority: BatchPriority.HIGH,
        targetDate: new Date(),
        notes: 'Demo batch of mirror ornaments ready to cut.',
      },
    });
  }

  let inProgressBatch = await prisma.productionBatch.findFirst({
    where: { name: inProgressBatchName, seasonId: christmasSeason.id },
  });
  if (!inProgressBatch) {
    inProgressBatch = await prisma.productionBatch.create({
      data: {
        name: inProgressBatchName,
        seasonId: christmasSeason.id,
        batchType: BatchType.TEMPLATE_RUN,
        status: BatchStatus.IN_PROGRESS,
        priority: BatchPriority.URGENT,
        targetDate: new Date(),
        notes: 'Demo batch of door name signs currently in progress.',
      },
    });
  }

  // Only create demo orders/items for Pack 3 once
  const existingPack3Order = await prisma.order.findFirst({
    where: {
      notes: {
        contains: 'Pack3 Christmas batch demo',
        mode: 'insensitive',
      },
    },
  });

  if (!existingPack3Order) {
    const ornamentVariant = await prisma.templateVariant.findFirst({
      where: { templateId: nameOrnamentTemplate.id },
    });
    const doorNameVariant = await prisma.templateVariant.findFirst({
      where: { templateId: doorNameTemplate.id },
    });

    if (ornamentVariant && doorNameVariant) {
      const demoBatches = [plannedBatch, readyBatch, inProgressBatch];
      const templatesForBatches = [
        {
          template: nameOrnamentTemplate,
          variant: ornamentVariant,
          materialId: clearAcrylic3mm.id,
        },
        {
          template: nameOrnamentTemplate,
          variant: ornamentVariant,
          materialId: mirrorAcrylic3mm.id,
        },
        {
          template: doorNameTemplate,
          variant: doorNameVariant,
          materialId: birch3mm.id,
        },
      ];

      let createdItemsCount = 0;

      for (let bIndex = 0; bIndex < demoBatches.length; bIndex++) {
        const batch = demoBatches[bIndex];
        const tpl = templatesForBatches[bIndex];

        for (let i = 0; i < 5; i++) {
          const customer = customers[(bIndex * 5 + i) % customers.length];

          const order = await prisma.order.create({
            data: {
              customerId: customer.id,
              status:
                bIndex === 0
                  ? OrderStatus.NEW
                  : bIndex === 1
                  ? OrderStatus.READY
                  : OrderStatus.IN_PROGRESS,
              priority: i === 0 ? OrderPriority.URGENT : OrderPriority.NORMAL,
              notes: `Pack3 Christmas batch demo ${bIndex + 1}-${i + 1}`,
              seasonId: christmasSeason.id,
            },
          });

          const item = await prisma.orderItem.create({
            data: {
              orderId: order.id,
              title:
                tpl.template.id === nameOrnamentTemplate.id
                  ? 'Name ornament'
                  : 'Door name sign',
              materialId: tpl.materialId,
              templateId: tpl.template.id,
              templateVariantId: tpl.variant.id,
              quantity: 1 + (i % 3),
              widthMm: tpl.template.baseWidthMm ?? undefined,
              heightMm: tpl.template.baseHeightMm ?? undefined,
              customizationText:
                tpl.template.id === nameOrnamentTemplate.id
                  ? `Name: Demo ${createdItemsCount + 1}`
                  : `Name: Family ${createdItemsCount + 1}`,
              estimatedMinutes: 20 + bIndex * 10 + i * 2,
            },
          });

          await prisma.batchItemLink.create({
            data: {
              batchId: batch.id,
              orderItemId: item.id,
            },
          });

          createdItemsCount++;
        }
      }

      // Demo batch tasks across two batches
      await prisma.batchTask.createMany({
        data: [
          {
            batchId: plannedBatch.id,
            title: 'Prepare acrylic sheets',
            status: 'TODO' as any,
            assignedUserId: worker.id,
          },
          {
            batchId: plannedBatch.id,
            title: 'Print name list',
            status: 'TODO' as any,
            assignedUserId: worker.id,
          },
          {
            batchId: readyBatch.id,
            title: 'Check names spelling',
            status: 'DOING' as any,
            assignedUserId: worker.id,
          },
          {
            batchId: inProgressBatch.id,
            title: 'Finish cutting parts',
            status: 'DOING' as any,
            assignedUserId: worker.id,
          },
          {
            batchId: inProgressBatch.id,
            title: 'Clean and pack ornaments',
            status: 'TODO' as any,
            assignedUserId: worker.id,
          },
        ],
      });
    }
  }

  console.log('Seed data created:', { adminEmail: admin.email, workerEmail: worker.email });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
