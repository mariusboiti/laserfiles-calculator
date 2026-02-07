import { Injectable, Logger } from '@nestjs/common';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface MicroNiche {
  id: string;
  nicheTitle: string;
  parentCategory: string;
  specificAngle: string;
  demandSignal: number;       // 0-100
  competitionLevel: number;   // 0-100
  opportunityScore: number;   // 0-100
  exampleProducts: string[];
  targetDemographic: string;
  styleModifiers: string[];
  materialSuggestions: string[];
  pricingTier: 'budget' | 'mid-range' | 'premium' | 'luxury';
  seasonalRelevance: string[];
  detectedFrom: string[];
}

// ─── NLP clustering patterns ────────────────────────────────────────────────

interface NichePattern {
  parentCategory: string;
  subjectModifiers: string[];
  styleModifiers: string[];
  audienceModifiers: string[];
  materialModifiers: string[];
  seasonalModifiers: string[];
}

const NICHE_PATTERNS: NichePattern[] = [
  {
    parentCategory: 'pet-gifts',
    subjectModifiers: ['german shepherd', 'golden retriever', 'labrador', 'french bulldog', 'cat', 'horse', 'rabbit', 'parrot', 'hamster', 'poodle', 'husky', 'corgi', 'dachshund', 'beagle', 'rottweiler'],
    styleModifiers: ['memorial', 'portrait', 'silhouette', 'paw print', 'cartoon', 'realistic', 'minimalist', 'rustic', 'modern'],
    audienceModifiers: ['pet owner', 'dog mom', 'cat lady', 'horse lover', 'breeder', 'vet clinic', 'pet groomer', 'rescue organization'],
    materialModifiers: ['wood', 'acrylic', 'slate', 'leather', 'bamboo'],
    seasonalModifiers: ['christmas', 'valentines', 'mothers day', 'rainbow bridge', 'adoption anniversary'],
  },
  {
    parentCategory: 'home-decor',
    subjectModifiers: ['kitchen', 'bathroom', 'bedroom', 'living room', 'nursery', 'office', 'patio', 'garden', 'entryway', 'laundry room', 'man cave', 'she shed'],
    styleModifiers: ['farmhouse', 'modern', 'bohemian', 'minimalist', 'industrial', 'coastal', 'rustic', 'scandinavian', 'mid-century', 'cottagecore'],
    audienceModifiers: ['newlyweds', 'new homeowners', 'renters', 'families', 'couples', 'singles'],
    materialModifiers: ['wood', 'acrylic', 'metal-look', 'layered', 'mixed-media'],
    seasonalModifiers: ['spring refresh', 'fall decor', 'holiday', 'summer', 'back to school'],
  },
  {
    parentCategory: 'wedding',
    subjectModifiers: ['cake topper', 'guest book', 'table numbers', 'seating chart', 'welcome sign', 'favors', 'centerpiece', 'photo booth props', 'ring box', 'vow books'],
    styleModifiers: ['rustic', 'elegant', 'bohemian', 'vintage', 'modern', 'garden', 'beach', 'woodland', 'industrial', 'romantic'],
    audienceModifiers: ['bride', 'groom', 'wedding planner', 'maid of honor', 'best man'],
    materialModifiers: ['acrylic', 'wood', 'bamboo', 'mirror-acrylic', 'frosted-acrylic'],
    seasonalModifiers: ['spring wedding', 'summer wedding', 'fall wedding', 'winter wedding', 'destination wedding'],
  },
  {
    parentCategory: 'kids',
    subjectModifiers: ['nursery', 'playroom', 'bedroom', 'school', 'birthday', 'baby shower', 'christening', 'first birthday'],
    styleModifiers: ['whimsical', 'educational', 'safari', 'space', 'dinosaur', 'princess', 'superhero', 'woodland creatures', 'rainbow', 'unicorn'],
    audienceModifiers: ['new parents', 'grandparents', 'teachers', 'godparents'],
    materialModifiers: ['wood', 'painted-wood', 'acrylic-colored', 'bamboo'],
    seasonalModifiers: ['baby shower', 'birthday', 'christmas', 'back to school', 'easter'],
  },
  {
    parentCategory: 'business-gifts',
    subjectModifiers: ['corporate', 'employee', 'client', 'award', 'recognition', 'retirement', 'promotion', 'milestone', 'team building'],
    styleModifiers: ['professional', 'elegant', 'modern', 'classic', 'branded', 'minimalist'],
    audienceModifiers: ['HR departments', 'small business owners', 'managers', 'event planners'],
    materialModifiers: ['walnut', 'acrylic', 'glass-look', 'bamboo', 'premium-wood'],
    seasonalModifiers: ['end of year', 'Q4', 'holiday party', 'annual review', 'company anniversary'],
  },
  {
    parentCategory: 'gaming',
    subjectModifiers: ['dice tower', 'dice tray', 'DM screen', 'miniature terrain', 'card holder', 'token set', 'initiative tracker', 'spell cards', 'character sheet holder'],
    styleModifiers: ['fantasy', 'sci-fi', 'steampunk', 'medieval', 'cyberpunk', 'horror', 'celtic'],
    audienceModifiers: ['D&D players', 'board gamers', 'wargamers', 'RPG enthusiasts', 'game masters'],
    materialModifiers: ['plywood', 'mdf', 'acrylic', 'walnut', 'leather'],
    seasonalModifiers: ['christmas gifts', 'convention season', 'new campaign'],
  },
  {
    parentCategory: 'jewelry',
    subjectModifiers: ['earrings', 'pendant', 'bracelet', 'brooch', 'hair pin', 'ring holder', 'jewelry box', 'display stand'],
    styleModifiers: ['geometric', 'botanical', 'art deco', 'boho', 'minimalist', 'statement', 'layered', 'filigree'],
    audienceModifiers: ['women 25-45', 'fashion conscious', 'gift buyers', 'bridesmaids'],
    materialModifiers: ['acrylic', 'wood-thin', 'leather', 'bamboo', 'cork'],
    seasonalModifiers: ['valentines', 'mothers day', 'christmas', 'birthday', 'graduation'],
  },
];

@Injectable()
export class MicroNicheDetectorService {
  private readonly logger = new Logger(MicroNicheDetectorService.name);

  detectNiches(trendKeywords: string[], trendCategories: string[]): MicroNiche[] {
    const niches: MicroNiche[] = [];
    const kwLower = trendKeywords.map(k => k.toLowerCase());
    const catLower = trendCategories.map(c => c.toLowerCase());

    for (const pattern of NICHE_PATTERNS) {
      // Check if this pattern's parent category is relevant
      const categoryMatch = catLower.some(c =>
        c.includes(pattern.parentCategory) ||
        pattern.parentCategory.includes(c)
      );
      const keywordMatch = kwLower.some(k =>
        pattern.subjectModifiers.some(s => k.includes(s) || s.includes(k)) ||
        pattern.styleModifiers.some(s => k.includes(s)) ||
        k.includes(pattern.parentCategory.replace('-', ' '))
      );

      if (!categoryMatch && !keywordMatch) continue;

      // Find specific subject matches
      const matchedSubjects = pattern.subjectModifiers.filter(s =>
        kwLower.some(k => k.includes(s) || s.includes(k))
      );

      // Find style matches
      const matchedStyles = pattern.styleModifiers.filter(s =>
        kwLower.some(k => k.includes(s))
      );

      // Generate micro-niches from combinations
      const subjects = matchedSubjects.length > 0 ? matchedSubjects : [pattern.subjectModifiers[0]];
      const styles = matchedStyles.length > 0 ? matchedStyles : [pattern.styleModifiers[0]];

      for (const subject of subjects.slice(0, 3)) {
        for (const style of styles.slice(0, 2)) {
          const nicheTitle = `${this.capitalize(subject)} ${this.capitalize(style)} ${this.capitalize(pattern.parentCategory.replace('-', ' '))}`;
          const specificAngle = `${this.capitalize(style)} style ${subject} products for ${pattern.audienceModifiers[0]}`;

          // Score based on specificity
          const specificityBonus = matchedSubjects.length > 0 ? 15 : 0;
          const styleBonus = matchedStyles.length > 0 ? 10 : 0;
          const demandSignal = Math.min(100, 40 + specificityBonus + styleBonus + Math.floor(Math.random() * 25));
          const competitionLevel = Math.max(10, 60 - specificityBonus - styleBonus + Math.floor(Math.random() * 15));
          const opportunityScore = Math.round((demandSignal * 0.5 + (100 - competitionLevel) * 0.5));

          // Determine pricing tier
          let pricingTier: 'budget' | 'mid-range' | 'premium' | 'luxury' = 'mid-range';
          if (pattern.materialModifiers.some(m => ['walnut', 'premium-wood', 'leather'].includes(m))) pricingTier = 'premium';
          if (style === 'luxury' || style === 'elegant') pricingTier = 'premium';
          if (subject.includes('corporate') || subject.includes('award')) pricingTier = 'luxury';

          // Example products
          const exampleProducts = [
            `${this.capitalize(style)} ${subject} engraved plaque`,
            `Personalized ${subject} ${style} ornament`,
            `Custom ${subject} wall art — ${style} design`,
          ];

          // Seasonal relevance
          const seasonalRelevance = pattern.seasonalModifiers.filter(s =>
            kwLower.some(k => k.includes(s.split(' ')[0]))
          );

          niches.push({
            id: `niche-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            nicheTitle,
            parentCategory: pattern.parentCategory,
            specificAngle,
            demandSignal,
            competitionLevel,
            opportunityScore,
            exampleProducts,
            targetDemographic: pattern.audienceModifiers.slice(0, 2).join(', '),
            styleModifiers: [style, ...matchedStyles.filter(s => s !== style)].slice(0, 3),
            materialSuggestions: pattern.materialModifiers.slice(0, 3),
            pricingTier,
            seasonalRelevance: seasonalRelevance.length > 0 ? seasonalRelevance : ['year-round'],
            detectedFrom: trendKeywords.slice(0, 3),
          });
        }
      }
    }

    // Sort by opportunity score descending
    niches.sort((a, b) => b.opportunityScore - a.opportunityScore);

    // Deduplicate by title similarity
    const seen = new Set<string>();
    const unique = niches.filter(n => {
      const key = n.nicheTitle.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return unique.slice(0, 15);
  }

  private capitalize(s: string): string {
    return s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }
}
