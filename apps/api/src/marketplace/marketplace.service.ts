import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ListingStatus } from '@prisma/client';

@Injectable()
export class MarketplaceService {
  constructor(private prisma: PrismaService) {}

  // ═══════════════════════════════════════════════════════════════
  // LISTING CRUD
  // ═══════════════════════════════════════════════════════════════

  async listListings(filters?: {
    userId?: string;
    platform?: string;
    status?: ListingStatus;
    limit?: number;
  }) {
    return this.prisma.marketplaceListing.findMany({
      where: {
        ...(filters?.userId && { userId: filters.userId }),
        ...(filters?.platform && { platform: filters.platform as any }),
        ...(filters?.status && { status: filters.status }),
      },
      orderBy: { createdAt: 'desc' },
      take: filters?.limit || 50,
    });
  }

  async getListing(id: string) {
    const listing = await this.prisma.marketplaceListing.findUnique({ where: { id } });
    if (!listing) throw new NotFoundException('Listing not found');
    return listing;
  }

  async createListing(data: {
    userId: string;
    platform: string;
    connectionId?: string;
    title: string;
    description: string;
    tags?: string[];
    category?: string;
    productType?: string;
    materialLabel?: string;
    sizeMm?: string;
    price?: number;
    currency?: string;
    costOfGoods?: number;
    sku?: string;
    quantity?: number;
    mockupUrls?: string[];
    previewPngUrl?: string;
    seoKeywords?: string[];
    sourceArtifactId?: string;
    productionInfoJson?: any;
  }) {
    const profitMargin = data.price && data.costOfGoods
      ? ((data.price - data.costOfGoods) / data.price) * 100
      : null;

    return this.prisma.marketplaceListing.create({
      data: {
        userId: data.userId,
        platform: data.platform as any,
        connectionId: data.connectionId,
        title: data.title,
        description: data.description,
        tagsJson: data.tags,
        category: data.category,
        productType: data.productType,
        materialLabel: data.materialLabel,
        sizeMm: data.sizeMm,
        price: data.price,
        currency: data.currency || 'USD',
        costOfGoods: data.costOfGoods,
        profitMargin,
        sku: data.sku || this.generateSku(data.productType, data.materialLabel),
        quantity: data.quantity || 999,
        mockupUrlsJson: data.mockupUrls,
        previewPngUrl: data.previewPngUrl,
        seoKeywordsJson: data.seoKeywords,
        sourceArtifactId: data.sourceArtifactId,
        productionInfoJson: data.productionInfoJson,
      },
    });
  }

  async updateListing(id: string, data: Partial<{
    title: string;
    description: string;
    tags: string[];
    category: string;
    price: number;
    currency: string;
    costOfGoods: number;
    sku: string;
    quantity: number;
    mockupUrls: string[];
    previewPngUrl: string;
    seoKeywords: string[];
    status: ListingStatus;
  }>) {
    await this.getListing(id);
    const updates: any = {};
    if (data.title) updates.title = data.title;
    if (data.description) updates.description = data.description;
    if (data.tags) updates.tagsJson = data.tags;
    if (data.category) updates.category = data.category;
    if (data.price !== undefined) updates.price = data.price;
    if (data.currency) updates.currency = data.currency;
    if (data.costOfGoods !== undefined) updates.costOfGoods = data.costOfGoods;
    if (data.sku) updates.sku = data.sku;
    if (data.quantity !== undefined) updates.quantity = data.quantity;
    if (data.mockupUrls) updates.mockupUrlsJson = data.mockupUrls;
    if (data.previewPngUrl) updates.previewPngUrl = data.previewPngUrl;
    if (data.seoKeywords) updates.seoKeywordsJson = data.seoKeywords;
    if (data.status) updates.status = data.status;
    if (data.price && data.costOfGoods) {
      updates.profitMargin = ((data.price - data.costOfGoods) / data.price) * 100;
    }
    return this.prisma.marketplaceListing.update({ where: { id }, data: updates });
  }

  async deleteListing(id: string) {
    await this.getListing(id);
    return this.prisma.marketplaceListing.update({
      where: { id },
      data: { status: 'DELETED' },
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // AI LISTING GENERATION
  // ═══════════════════════════════════════════════════════════════

  async generateListingContent(data: {
    productType: string;
    materialLabel: string;
    sizeMm: string;
    subjectLabel?: string;
    subjectType?: string;
    costOfGoods?: number;
  }) {
    const productLabels: Record<string, string> = {
      'engraved-frame': 'Custom Laser Engraved Photo Frame',
      keychain: 'Personalized Laser Cut Keychain',
      ornament: 'Custom Laser Engraved Ornament',
      coaster: 'Laser Engraved Photo Coaster Set',
      'memorial-plaque': 'Memorial Photo Plaque',
      'multilayer-wall-art': 'Multi-Layer Laser Cut Wall Art',
      'led-lightbox': 'LED Edge-Lit Photo Lightbox',
      stencil: 'Custom Laser Cut Stencil',
      puzzle: 'Personalized Photo Puzzle',
      'lamp-panel': 'Laser Cut Night Light Panel',
      'phone-stand': 'Engraved Photo Phone Stand',
      'jewelry-pendant': 'Custom Engraved Jewelry Pendant',
    };

    const productLabel = productLabels[data.productType] || 'Custom Laser Product';
    const subject = data.subjectLabel || 'custom design';
    const [w, h] = data.sizeMm.split('x').map(Number);

    // Generate SEO-optimized title
    const title = `${productLabel} - ${data.subjectLabel ? data.subjectLabel + ' ' : ''}${data.materialLabel} | Handmade Laser Art`;

    // Generate description
    const description = `Beautiful ${productLabel.toLowerCase()} featuring ${subject}, precision laser engraved on ${data.materialLabel}.

Product Details:
- Size: ${w}mm × ${h}mm (${(w / 25.4).toFixed(1)}" × ${(h / 25.4).toFixed(1)}")
- Material: ${data.materialLabel}
- Process: Professional laser engraving & cutting
- Finish: Clean edges, production-quality

Perfect as a personalized gift, home decor, or keepsake. Each piece is made to order using our AI-powered laser production system for consistent, high-quality results.

Ships within 3-5 business days. Custom designs available upon request.`;

    // Generate tags
    const tags = [
      'laser engraved', 'custom', 'personalized', 'handmade',
      data.productType.replace(/-/g, ' '),
      data.materialLabel.toLowerCase(),
      'laser cut', 'photo gift', 'unique gift',
      data.subjectType || 'custom design',
      'home decor', 'personalized gift',
    ].slice(0, 13);

    // Generate SEO keywords
    const seoKeywords = [
      `custom ${data.productType.replace(/-/g, ' ')}`,
      `laser engraved ${data.materialLabel.toLowerCase()}`,
      `personalized ${data.productType.replace(/-/g, ' ')} gift`,
      'laser cut art',
      `${data.materialLabel.toLowerCase()} ${data.productType.replace(/-/g, ' ')}`,
    ];

    // Pricing tiers
    const basePrices: Record<string, number> = {
      keychain: 12.99, ornament: 18.99, coaster: 15.99,
      'engraved-frame': 29.99, 'memorial-plaque': 39.99,
      'multilayer-wall-art': 49.99, 'led-lightbox': 59.99,
      stencil: 19.99, puzzle: 34.99, 'lamp-panel': 44.99,
      'phone-stand': 24.99, 'jewelry-pendant': 22.99,
    };
    const suggestedPrice = basePrices[data.productType] || 24.99;
    const costOfGoods = data.costOfGoods || suggestedPrice * 0.3;
    const profitMargin = ((suggestedPrice - costOfGoods) / suggestedPrice) * 100;

    // Generate SKU
    const sku = this.generateSku(data.productType, data.materialLabel);

    return {
      title,
      description,
      tags,
      seoKeywords,
      suggestedPrice,
      costOfGoods: Math.round(costOfGoods * 100) / 100,
      profitMargin: Math.round(profitMargin),
      sku,
      category: this.getMarketplaceCategory(data.productType),
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // PUBLISH FLOW
  // ═══════════════════════════════════════════════════════════════

  async publishListing(id: string) {
    const listing = await this.getListing(id);
    if (listing.status !== 'DRAFT' && listing.status !== 'PENDING_REVIEW') {
      throw new BadRequestException(`Cannot publish listing in status: ${listing.status}`);
    }

    // Route to platform-specific publisher
    let externalId: string | null = null;
    let externalUrl: string | null = null;

    try {
      switch (listing.platform) {
        case 'ETSY':
          ({ externalId, externalUrl } = await this.publishToEtsy(listing));
          break;
        case 'SHOPIFY':
          ({ externalId, externalUrl } = await this.publishToShopify(listing));
          break;
        case 'WOOCOMMERCE':
          ({ externalId, externalUrl } = await this.publishToWooCommerce(listing));
          break;
        default:
          // INTERNAL — just mark as published
          externalId = `internal-${listing.id}`;
          break;
      }
    } catch (err) {
      await this.prisma.marketplaceListing.update({
        where: { id },
        data: { externalStatus: 'publish_failed' },
      });
      throw err;
    }

    return this.prisma.marketplaceListing.update({
      where: { id },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date(),
        externalListingId: externalId,
        externalUrl: externalUrl,
        externalStatus: 'active',
      },
    });
  }

  async getListingStats(userId: string) {
    const [total, published, draft, revenue] = await Promise.all([
      this.prisma.marketplaceListing.count({ where: { userId } }),
      this.prisma.marketplaceListing.count({ where: { userId, status: 'PUBLISHED' } }),
      this.prisma.marketplaceListing.count({ where: { userId, status: 'DRAFT' } }),
      this.prisma.marketplaceListing.aggregate({
        where: { userId, status: 'PUBLISHED' },
        _sum: { price: true },
        _avg: { profitMargin: true },
      }),
    ]);
    return {
      total,
      published,
      draft,
      totalListedValue: revenue._sum.price || 0,
      avgProfitMargin: Math.round((revenue._avg.profitMargin || 0) * 10) / 10,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // PLATFORM PUBLISHERS (Phase 1 stubs)
  // ═══════════════════════════════════════════════════════════════

  private async publishToEtsy(listing: any): Promise<{ externalId: string; externalUrl: string }> {
    // Requires Etsy API v3 OAuth2 — full implementation needs API key + shop ID
    // Phase 1: Validate listing data and prepare draft
    if (!listing.connectionId) {
      throw new BadRequestException('Connect your Etsy shop first in Sales Channels settings');
    }
    const connection = await this.prisma.storeConnection.findUnique({
      where: { id: listing.connectionId },
    });
    if (!connection || connection.channel !== 'ETSY') {
      throw new BadRequestException('Invalid Etsy connection');
    }
    // TODO: Implement Etsy API v3 createDraftListing
    throw new BadRequestException('Etsy API integration coming soon. Export listing data and create manually.');
  }

  private async publishToShopify(listing: any): Promise<{ externalId: string; externalUrl: string }> {
    if (!listing.connectionId) {
      throw new BadRequestException('Connect your Shopify store first');
    }
    // TODO: Implement Shopify Admin API product creation
    throw new BadRequestException('Shopify API integration coming soon. Export listing data and create manually.');
  }

  private async publishToWooCommerce(listing: any): Promise<{ externalId: string; externalUrl: string }> {
    if (!listing.connectionId) {
      throw new BadRequestException('Connect your WooCommerce store first');
    }
    const connection = await this.prisma.storeConnection.findUnique({
      where: { id: listing.connectionId },
    });
    if (!connection || connection.channel !== 'WOOCOMMERCE') {
      throw new BadRequestException('Invalid WooCommerce connection');
    }
    // WooCommerce REST API integration
    const creds = connection.credentialsJson as any;
    if (!creds?.baseUrl || !creds?.consumerKey || !creds?.consumerSecret) {
      throw new BadRequestException('WooCommerce credentials incomplete');
    }
    try {
      const res = await fetch(`${creds.baseUrl}/wp-json/wc/v3/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${Buffer.from(`${creds.consumerKey}:${creds.consumerSecret}`).toString('base64')}`,
        },
        body: JSON.stringify({
          name: listing.title,
          type: 'simple',
          regular_price: listing.price?.toString(),
          description: listing.description,
          short_description: `Custom laser engraved ${listing.productType}`,
          sku: listing.sku,
          stock_quantity: listing.quantity,
          categories: listing.category ? [{ name: listing.category }] : [],
          tags: (listing.tagsJson as string[] || []).map((t: string) => ({ name: t })),
          status: 'draft',
        }),
      });
      if (!res.ok) throw new Error(`WooCommerce API: ${res.status}`);
      const product = await res.json();
      return {
        externalId: product.id?.toString() || '',
        externalUrl: product.permalink || '',
      };
    } catch (err) {
      throw new BadRequestException(`WooCommerce publish failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════

  private generateSku(productType?: string, material?: string): string {
    const pt = (productType || 'custom').substring(0, 3).toUpperCase();
    const mt = (material || 'gen').substring(0, 3).toUpperCase();
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `LFP-${pt}-${mt}-${rand}`;
  }

  private getMarketplaceCategory(productType: string): string {
    const categories: Record<string, string> = {
      'engraved-frame': 'Home & Living > Home Decor > Picture Frames',
      keychain: 'Accessories > Keychains & Lanyards',
      ornament: 'Home & Living > Home Decor > Ornaments',
      coaster: 'Home & Living > Kitchen & Dining > Coasters',
      'memorial-plaque': 'Home & Living > Home Decor > Memorial & Sympathy',
      'multilayer-wall-art': 'Art & Collectibles > Wall Art',
      'led-lightbox': 'Home & Living > Lighting > Night Lights',
      stencil: 'Craft Supplies & Tools > Stencils & Templates',
      puzzle: 'Toys & Games > Puzzles',
      'lamp-panel': 'Home & Living > Lighting > Lamps',
      'phone-stand': 'Electronics & Accessories > Phone Accessories',
      'jewelry-pendant': 'Jewelry > Necklaces > Pendants',
    };
    return categories[productType] || 'Handmade';
  }
}
