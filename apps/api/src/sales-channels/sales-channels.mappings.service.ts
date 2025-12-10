import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface ListMappingsParams {
  connectionId?: string;
  search?: string;
}

interface CreateMappingInput {
  connectionId: string;
  externalProductId: string;
  externalProductName: string;
  templateId: string;
  variantId?: string;
  materialId?: string;
  templateProductId?: string;
  personalizationMappingJson?: any;
  pricingMode?: 'USE_TEMPLATE_RULES' | 'EXTERNAL_PRICE_IGNORE' | 'PRICE_OVERRIDE';
  priceOverride?: number | null;
}

interface UpdateMappingInput extends Partial<CreateMappingInput> {}

interface MappingSuggestion {
  externalProductId: string;
  externalProductName: string;
  suggestedTemplateId: string;
  suggestedTemplateName: string;
  suggestedTemplateProductId?: string | null;
  suggestedTemplateProductName?: string | null;
  score: number;
}

const STOP_WORDS = new Set<string>([
  'the',
  'and',
  'set',
  'bundle',
  'custom',
  'personalized',
]);

function normalizeText(input: string | null | undefined): string {
  if (!input) return '';
  let s = input.toLowerCase();
  s = s.replace(/[^a-z0-9]+/g, ' ');
  s = s.trim().replace(/\s+/g, ' ');
  const tokens = s
    .split(' ')
    .map((t) => t.trim())
    .filter((t) => t && !STOP_WORDS.has(t));
  return tokens.join(' ');
}

function tokenize(input: string | null | undefined): string[] {
  const norm = normalizeText(input);
  return norm ? norm.split(' ') : [];
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const aLen = a.length;
  const bLen = b.length;
  if (aLen === 0) return bLen;
  if (bLen === 0) return aLen;

  const dp = new Array(bLen + 1).fill(0).map((_, i) => i);
  for (let i = 1; i <= aLen; i++) {
    let prev = i - 1;
    dp[0] = i;
    for (let j = 1; j <= bLen; j++) {
      const temp = dp[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + cost);
      prev = temp;
    }
  }
  return dp[bLen];
}

function scoreMatch(externalName: string, targetName: string, categoryName?: string | null): number {
  const normExt = normalizeText(externalName);
  const normTgt = normalizeText(targetName);
  if (!normExt || !normTgt) return 0;

  if (normExt === normTgt) {
    return 95;
  }

  const extTokens = normExt.split(' ');
  const tgtTokens = normTgt.split(' ');
  const extSet = new Set(extTokens);
  const tgtSet = new Set(tgtTokens);
  let intersection = 0;
  for (const t of tgtSet) {
    if (extSet.has(t)) intersection += 1;
  }

  let score = 0;
  if (intersection > 0) {
    const overlapRatio = intersection / Math.max(extTokens.length, tgtTokens.length);
    score = 60 + Math.round(overlapRatio * 25);
  }

  const dist = levenshtein(normExt, normTgt);
  const maxLen = Math.max(normExt.length, normTgt.length);
  if (maxLen > 0) {
    const sim = 1 - dist / maxLen;
    if (sim >= 0.9) {
      score = Math.max(score, 90);
    } else if (sim >= 0.8) {
      score = Math.max(score, 80);
    } else if (sim >= 0.7) {
      score = Math.max(score, 70);
    }
  }

  if (categoryName) {
    const catTokens = tokenize(categoryName);
    const extTokenSet = new Set(extTokens);
    if (catTokens.some((t) => extTokenSet.has(t))) {
      score += 5;
    }
  }

  return Math.min(100, score);
}

@Injectable()
export class SalesChannelsMappingsService {
  constructor(private readonly prisma: PrismaService) {}

  private async computeSuggestions(connectionId: string): Promise<MappingSuggestion[]> {
    const [templates, templateProducts, existingMappings] = await this.prisma.$transaction([
      this.prisma.productTemplate.findMany({
        include: {
          category: true,
        },
      }),
      this.prisma.templateProduct.findMany({
        where: { isActive: true },
        include: {
          template: {
            include: {
              category: true,
            },
          },
        },
      }),
      this.prisma.externalProductMapping.findMany({
        where: { connectionId },
        select: { externalProductId: true },
      }),
    ]);

    const mappedSet = new Set<string>(
      existingMappings.map((m) => m.externalProductId).filter((v): v is string => !!v),
    );

    const items = await this.prisma.externalOrderItem.findMany({
      where: {
        externalProductId: { not: null },
        externalOrder: { connectionId },
      },
      select: {
        externalProductId: true,
        title: true,
      },
    });

    const byProductId = new Map<string, { externalProductId: string; externalProductName: string }>();
    for (const it of items) {
      const pid = it.externalProductId as string | null;
      if (!pid || mappedSet.has(pid)) continue;
      if (!byProductId.has(pid)) {
        byProductId.set(pid, {
          externalProductId: pid,
          externalProductName: it.title || pid,
        });
      }
    }

    const suggestions: MappingSuggestion[] = [];

    for (const candidate of byProductId.values()) {
      const extName = candidate.externalProductName || candidate.externalProductId;
      let best: MappingSuggestion | null = null;

      for (const tp of templateProducts as any[]) {
        const score = scoreMatch(extName, tp.name, tp.template?.category?.name);
        if (score <= 0) continue;
        if (!best || score > best.score) {
          best = {
            externalProductId: candidate.externalProductId,
            externalProductName: candidate.externalProductName,
            suggestedTemplateId: tp.templateId,
            suggestedTemplateName: tp.template?.name ?? '',
            suggestedTemplateProductId: tp.id,
            suggestedTemplateProductName: tp.name,
            score,
          };
        }
      }

      for (const t of templates as any[]) {
        const score = scoreMatch(extName, t.name, t.category?.name);
        if (score <= 0) continue;
        if (!best || score > best.score) {
          best = {
            externalProductId: candidate.externalProductId,
            externalProductName: candidate.externalProductName,
            suggestedTemplateId: t.id,
            suggestedTemplateName: t.name,
            suggestedTemplateProductId: null,
            suggestedTemplateProductName: null,
            score,
          };
        }
      }

      if (best) {
        suggestions.push(best);
      }
    }

    suggestions.sort((a, b) => b.score - a.score);
    return suggestions;
  }

  async list(params: ListMappingsParams) {
    const where: any = {};
    if (params.connectionId) {
      where.connectionId = params.connectionId;
    }
    if (params.search) {
      where.externalProductName = {
        contains: params.search,
        mode: 'insensitive',
      };
    }

    const items = await this.prisma.externalProductMapping.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        template: true,
        variant: true,
        material: true,
        templateProduct: true,
      },
    });

    return {
      data: items,
      total: items.length,
    };
  }

  async get(id: string) {
    const mapping = await this.prisma.externalProductMapping.findUnique({
      where: { id },
      include: {
        template: true,
        variant: true,
        material: true,
        templateProduct: true,
      },
    });
    if (!mapping) {
      throw new NotFoundException('Product mapping not found');
    }
    return mapping;
  }

  async create(input: CreateMappingInput) {
    return this.prisma.externalProductMapping.create({
      data: {
        connectionId: input.connectionId,
        externalProductId: input.externalProductId,
        externalProductName: input.externalProductName,
        templateId: input.templateId,
        variantId: input.variantId,
        materialId: input.materialId,
        templateProductId: input.templateProductId,
        personalizationMappingJson: input.personalizationMappingJson ?? {},
        pricingMode: (input.pricingMode ?? 'USE_TEMPLATE_RULES') as any,
        priceOverride:
          typeof input.priceOverride === 'number' ? input.priceOverride : null,
      },
    });
  }

  async update(id: string, input: UpdateMappingInput) {
    await this.get(id);
    return this.prisma.externalProductMapping.update({
      where: { id },
      data: {
        externalProductName: input.externalProductName,
        templateId: input.templateId,
        variantId: input.variantId,
        materialId: input.materialId,
        templateProductId: input.templateProductId,
        personalizationMappingJson:
          typeof input.personalizationMappingJson !== 'undefined'
            ? input.personalizationMappingJson
            : undefined,
        pricingMode: input.pricingMode ? (input.pricingMode as any) : undefined,
        priceOverride:
          typeof input.priceOverride !== 'undefined' ? input.priceOverride : undefined,
      },
    });
  }

  async remove(id: string) {
    await this.get(id);
    await this.prisma.externalProductMapping.delete({ where: { id } });
    return { id };
  }

  async suggestForConnection(connectionId: string, minScore?: number) {
    const raw = await this.computeSuggestions(connectionId);
    const threshold = typeof minScore === 'number' ? minScore : 0;
    const filtered = raw.filter((s) => s.score >= threshold);

    const data = filtered.map((s) => ({
      ...s,
      confidence: s.score >= 80 ? 'HIGH' : s.score >= 60 ? 'MEDIUM' : 'LOW',
    }));

    return {
      data,
      total: data.length,
    };
  }

  async applyHighConfidence(connectionId: string, minScore = 80) {
    const suggestions = await this.computeSuggestions(connectionId);
    const candidates = suggestions.filter((s) => s.score >= minScore);

    const applied: any[] = [];

    for (const s of candidates) {
      const existing = await this.prisma.externalProductMapping.findUnique({
        where: {
          connectionId_externalProductId: {
            connectionId,
            externalProductId: s.externalProductId,
          },
        },
      });
      if (existing) continue;

      const created = await this.prisma.externalProductMapping.create({
        data: {
          connectionId,
          externalProductId: s.externalProductId,
          externalProductName: s.externalProductName,
          templateId: s.suggestedTemplateId,
          templateProductId: s.suggestedTemplateProductId ?? undefined,
          personalizationMappingJson: {},
          pricingMode: 'USE_TEMPLATE_RULES' as any,
          priceOverride: null,
        },
        include: {
          template: true,
          variant: true,
          material: true,
          templateProduct: true,
        },
      });

      applied.push(created);
    }

    return {
      created: applied.length,
      skipped: candidates.length - applied.length,
      applied,
    };
  }
}
