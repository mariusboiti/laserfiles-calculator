import { Injectable, Logger } from '@nestjs/common';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface GeneratedProduct {
  id: string;
  trendTitle: string;
  productName: string;
  productType: string;
  description: string;
  designConcept: string;
  svgConceptDescription: string;
  materials: string[];
  recommendedSizes: Array<{ label: string; widthMm: number; heightMm: number }>;
  estimatedCutTimeMins: number;
  estimatedEngraveTimeMins: number;
  materialCostEstimate: number;
  suggestedPrice: number;
  profitMargin: number;
  difficulty: 'easy' | 'medium' | 'hard';
  styleHints: string[];
  targetAudience: string;
  marketingAngle: string;
  photoAiCompatible: boolean;
  mockupDescription: string;
}

// ─── Product concept templates ──────────────────────────────────────────────

const PRODUCT_TEMPLATES: Record<string, Array<{
  productType: string;
  nameTemplate: string;
  designConcept: string;
  svgConcept: string;
  materials: string[];
  sizes: Array<{ label: string; widthMm: number; heightMm: number }>;
  cutMins: number;
  engraveMins: number;
  materialCost: number;
  price: number;
  difficulty: 'easy' | 'medium' | 'hard';
  styles: string[];
  audience: string;
  marketing: string;
  mockup: string;
}>> = {
  memorial: [
    { productType: 'plaque', nameTemplate: '{subject} Memorial Plaque', designConcept: 'Elegant engraved plaque with photo area, name, dates, and heartfelt quote. Border with subtle floral or paw print motifs.', svgConcept: 'Rectangular plaque outline with rounded corners, inner border frame, text placeholders for name/dates, decorative corner elements', materials: ['plywood-6mm', 'walnut', 'bamboo'], sizes: [{ label: 'Standard', widthMm: 200, heightMm: 150 }, { label: 'Large', widthMm: 300, heightMm: 200 }], cutMins: 8, engraveMins: 15, materialCost: 4.50, price: 34.99, difficulty: 'easy', styles: ['elegant', 'heartfelt', 'classic'], audience: 'Pet owners, families experiencing loss', marketing: 'A lasting tribute to a beloved companion', mockup: 'Plaque on wooden easel with soft lighting, flowers nearby' },
    { productType: 'layered-portrait', nameTemplate: '{subject} Layered Portrait', designConcept: 'Multi-layer cut portrait creating 3D depth effect. 3-5 layers of progressively detailed silhouettes.', svgConcept: 'Multiple SVG layers: background silhouette, mid-ground details, foreground fine features, frame border', materials: ['plywood-3mm', 'mdf-3mm', 'basswood-3mm'], sizes: [{ label: 'Medium', widthMm: 200, heightMm: 200 }, { label: 'Large', widthMm: 300, heightMm: 300 }], cutMins: 25, engraveMins: 0, materialCost: 7.00, price: 55.00, difficulty: 'hard', styles: ['layered', '3d', 'artistic'], audience: 'Art lovers, gift buyers', marketing: 'Stunning 3D art that captures every detail', mockup: 'Layered art piece on wall with shadow depth visible' },
    { productType: 'ornament', nameTemplate: '{subject} Memorial Ornament', designConcept: 'Circular or heart-shaped ornament with engraved image and text. Ribbon hole at top.', svgConcept: 'Heart or circle outline with inner engraving area, small hole for ribbon, decorative border', materials: ['plywood-3mm', 'acrylic-clear', 'bamboo'], sizes: [{ label: 'Standard', widthMm: 80, heightMm: 80 }], cutMins: 3, engraveMins: 8, materialCost: 1.80, price: 18.99, difficulty: 'easy', styles: ['sentimental', 'keepsake'], audience: 'Families, pet owners', marketing: 'Keep their memory close, always', mockup: 'Ornament hanging on tree branch with soft bokeh background' },
    { productType: 'keychain', nameTemplate: '{subject} Memorial Keychain', designConcept: 'Small engraved keychain with silhouette and name. Durable everyday carry memorial.', svgConcept: 'Rounded rectangle with keyring hole, silhouette area, text line', materials: ['plywood-3mm', 'acrylic-colored', 'leather'], sizes: [{ label: 'Standard', widthMm: 50, heightMm: 30 }], cutMins: 2, engraveMins: 4, materialCost: 1.20, price: 14.99, difficulty: 'easy', styles: ['minimal', 'everyday'], audience: 'Anyone wanting a daily reminder', marketing: 'Carry their memory everywhere you go', mockup: 'Keychain on keys with leather background' },
  ],
  mandala: [
    { productType: 'wall-art', nameTemplate: 'Layered Mandala Wall Art — {style}', designConcept: 'Intricate multi-layer mandala with 4-6 layers creating stunning 3D shadow effect. Each layer progressively more detailed.', svgConcept: '4-6 concentric mandala layers with increasing detail, mounting holes, alignment marks', materials: ['plywood-3mm', 'mdf-3mm', 'basswood-3mm'], sizes: [{ label: 'Medium', widthMm: 300, heightMm: 300 }, { label: 'Large', widthMm: 450, heightMm: 450 }], cutMins: 45, engraveMins: 0, materialCost: 9.00, price: 65.00, difficulty: 'hard', styles: ['intricate', 'zen', 'bohemian'], audience: 'Home decor enthusiasts, yoga/meditation practitioners', marketing: 'Transform any wall into a meditation space', mockup: 'Mandala on white wall with dramatic side lighting showing shadows' },
    { productType: 'lamp', nameTemplate: 'Mandala Night Lamp', designConcept: 'Cylindrical or box lamp with mandala pattern cut-outs. LED light creates stunning shadow patterns on walls.', svgConcept: 'Unfolded lamp panels with mandala cut patterns, tab joints for assembly, base plate', materials: ['plywood-3mm', 'mdf-3mm'], sizes: [{ label: 'Standard', widthMm: 150, heightMm: 200 }], cutMins: 30, engraveMins: 0, materialCost: 8.00, price: 55.00, difficulty: 'hard', styles: ['ambient', 'decorative', 'zen'], audience: 'Home decor, gift buyers', marketing: 'Mesmerizing light patterns that transform any room', mockup: 'Lit lamp in dark room showing shadow patterns on walls' },
    { productType: 'coaster-set', nameTemplate: 'Mandala Coaster Set (4pc)', designConcept: 'Set of 4 coasters each with unique mandala pattern. Matching holder box.', svgConcept: 'Four circular coasters with different mandala patterns, box holder with slots', materials: ['plywood-3mm', 'bamboo', 'cork-backed'], sizes: [{ label: 'Standard', widthMm: 100, heightMm: 100 }], cutMins: 15, engraveMins: 20, materialCost: 5.00, price: 28.99, difficulty: 'medium', styles: ['decorative', 'functional'], audience: 'Home decor, housewarming gifts', marketing: 'Functional art for your coffee table', mockup: 'Coasters arranged on wooden table with coffee cups' },
  ],
  christmas: [
    { productType: 'ornament-set', nameTemplate: 'Custom Christmas Ornament Set', designConcept: 'Set of 6 personalized ornaments: snowflake, tree, star, bell, reindeer, stocking. Each with name engraving.', svgConcept: 'Six ornament shapes with engraving areas, ribbon holes, decorative details', materials: ['plywood-3mm', 'bamboo', 'acrylic-clear'], sizes: [{ label: 'Standard', widthMm: 80, heightMm: 80 }], cutMins: 12, engraveMins: 18, materialCost: 4.00, price: 24.99, difficulty: 'easy', styles: ['festive', 'personalized', 'traditional'], audience: 'Families, gift buyers', marketing: 'Make this Christmas unforgettable with personalized ornaments', mockup: 'Ornaments hanging on decorated tree with warm lighting' },
    { productType: 'advent-calendar', nameTemplate: 'Wooden Advent Calendar', designConcept: 'Large wall-mount advent calendar with 24 numbered doors. Each door opens to reveal a small compartment.', svgConcept: 'Main board with 24 door cutouts, individual door pieces with hinges, number engravings, decorative frame', materials: ['plywood-6mm', 'plywood-3mm'], sizes: [{ label: 'Standard', widthMm: 400, heightMm: 500 }], cutMins: 60, engraveMins: 30, materialCost: 15.00, price: 85.00, difficulty: 'hard', styles: ['traditional', 'heirloom', 'festive'], audience: 'Families with children, collectors', marketing: 'A family heirloom that grows more precious each year', mockup: 'Calendar mounted on wall with some doors open, candy visible' },
    { productType: 'tree-topper', nameTemplate: 'Custom Star Tree Topper', designConcept: 'Intricate star design with family name. Slot-together assembly for 3D effect.', svgConcept: 'Two interlocking star pieces with decorative cutouts, text area, tree-mount slot', materials: ['plywood-3mm', 'acrylic-gold', 'acrylic-clear'], sizes: [{ label: 'Standard', widthMm: 200, heightMm: 200 }], cutMins: 8, engraveMins: 5, materialCost: 3.00, price: 22.00, difficulty: 'medium', styles: ['festive', 'elegant', '3d'], audience: 'Families', marketing: 'Crown your tree with a personal touch', mockup: 'Star topper on top of Christmas tree' },
  ],
  geometric: [
    { productType: 'wall-clock', nameTemplate: 'Geometric Wall Clock — {style}', designConcept: 'Modern wall clock with geometric polygon pattern. Clock mechanism insert. Clean contemporary design.', svgConcept: 'Circular or hexagonal clock face with geometric pattern, center hole for mechanism, hour markers', materials: ['plywood-6mm', 'acrylic-black', 'walnut'], sizes: [{ label: 'Standard', widthMm: 300, heightMm: 300 }], cutMins: 15, engraveMins: 10, materialCost: 7.00, price: 45.00, difficulty: 'medium', styles: ['modern', 'minimalist', 'contemporary'], audience: 'Modern home decor enthusiasts', marketing: 'Time meets art in this stunning geometric piece', mockup: 'Clock on white wall in modern living room' },
    { productType: 'animal-art', nameTemplate: 'Geometric {animal} Wall Art', designConcept: 'Low-poly geometric animal portrait. Clean triangular facets creating recognizable animal form.', svgConcept: 'Animal silhouette filled with triangular polygon mesh, mounting holes', materials: ['plywood-3mm', 'acrylic-black', 'mdf-3mm'], sizes: [{ label: 'Medium', widthMm: 250, heightMm: 250 }, { label: 'Large', widthMm: 400, heightMm: 400 }], cutMins: 20, engraveMins: 0, materialCost: 5.00, price: 35.00, difficulty: 'medium', styles: ['geometric', 'modern', 'artistic'], audience: 'Animal lovers, modern decor', marketing: 'Your favorite animal, reimagined in geometric art', mockup: 'Geometric animal on wall above modern desk' },
  ],
  nightlight: [
    { productType: 'acrylic-lamp', nameTemplate: 'Custom Acrylic Night Light — {subject}', designConcept: 'Edge-lit acrylic panel with engraved design. LED base illuminates the engraving creating a glowing effect.', svgConcept: 'Rectangular acrylic panel with engraved design area, base slot cutout, optional frame', materials: ['acrylic-clear', 'acrylic-frosted'], sizes: [{ label: 'Standard', widthMm: 150, heightMm: 100 }], cutMins: 5, engraveMins: 12, materialCost: 5.50, price: 32.00, difficulty: 'medium', styles: ['glowing', 'modern', 'personalized'], audience: 'Parents, couples, gift buyers', marketing: 'A soft glow that tells your story', mockup: 'Lit night light on bedside table in dim room' },
    { productType: 'kids-lamp', nameTemplate: 'Kids Personalized Night Light', designConcept: 'Fun shaped acrylic lamp (dinosaur, unicorn, rocket, etc.) with child name. Colorful LED base.', svgConcept: 'Fun character silhouette in acrylic, name text area, base slot', materials: ['acrylic-clear', 'acrylic-colored'], sizes: [{ label: 'Standard', widthMm: 120, heightMm: 100 }], cutMins: 4, engraveMins: 8, materialCost: 4.50, price: 28.00, difficulty: 'easy', styles: ['fun', 'colorful', 'personalized'], audience: 'Parents of young children', marketing: 'Make bedtime magical with their very own night light', mockup: 'Colorful night light on kids bedside table' },
  ],
  wedding: [
    { productType: 'guest-book', nameTemplate: 'Wedding Guest Book Alternative', designConcept: 'Large wooden board with tree/heart design. Guests sign on laser-cut leaf/heart pieces that attach to the board.', svgConcept: 'Main board with tree trunk engraving, many small leaf/heart pieces with writing area, attachment slots', materials: ['plywood-6mm', 'plywood-3mm', 'bamboo'], sizes: [{ label: 'Standard', widthMm: 400, heightMm: 500 }], cutMins: 30, engraveMins: 15, materialCost: 12.00, price: 65.00, difficulty: 'medium', styles: ['romantic', 'rustic', 'keepsake'], audience: 'Engaged couples, wedding planners', marketing: 'A guest book that becomes wall art', mockup: 'Guest book on easel at wedding reception with some leaves attached' },
    { productType: 'cake-topper', nameTemplate: 'Custom Wedding Cake Topper', designConcept: 'Elegant script names with decorative flourishes. Stake base for cake insertion.', svgConcept: 'Script text with flourishes, two stake prongs at bottom, optional heart/ring detail', materials: ['acrylic-gold', 'acrylic-clear', 'plywood-3mm'], sizes: [{ label: 'Standard', widthMm: 150, heightMm: 100 }], cutMins: 5, engraveMins: 0, materialCost: 2.50, price: 18.00, difficulty: 'easy', styles: ['elegant', 'romantic', 'script'], audience: 'Brides, wedding planners', marketing: 'The perfect finishing touch for your perfect day', mockup: 'Topper on white wedding cake with flowers' },
    { productType: 'table-numbers', nameTemplate: 'Wedding Table Number Set', designConcept: 'Elegant table numbers 1-20 with matching style. Freestanding with base slot.', svgConcept: 'Number panels with decorative border, base slot, optional floral detail', materials: ['acrylic-clear', 'plywood-3mm', 'acrylic-frosted'], sizes: [{ label: 'Standard', widthMm: 100, heightMm: 140 }], cutMins: 20, engraveMins: 10, materialCost: 8.00, price: 45.00, difficulty: 'easy', styles: ['elegant', 'matching-set', 'formal'], audience: 'Brides, event planners', marketing: 'Coordinate every detail of your special day', mockup: 'Table number on decorated reception table' },
  ],
  farmhouse: [
    { productType: 'welcome-sign', nameTemplate: 'Farmhouse Welcome Sign', designConcept: 'Rustic welcome sign with family name, est. year, and farmhouse motifs (wheat, barn, windmill).', svgConcept: 'Rectangular sign with rounded or shaped top, text areas, decorative farmhouse elements, mounting holes', materials: ['plywood-6mm', 'reclaimed-wood', 'pine'], sizes: [{ label: 'Standard', widthMm: 300, heightMm: 200 }, { label: 'Large', widthMm: 450, heightMm: 300 }], cutMins: 10, engraveMins: 15, materialCost: 6.00, price: 32.00, difficulty: 'easy', styles: ['rustic', 'country', 'warm'], audience: 'Homeowners, housewarming gifts', marketing: 'Welcome guests with country charm', mockup: 'Sign on front porch next to potted plants' },
    { productType: 'kitchen-sign', nameTemplate: 'Kitchen Rules Sign', designConcept: 'Fun kitchen rules list with decorative border. Humorous or heartfelt rules.', svgConcept: 'Rectangular sign with text lines, decorative border, optional utensil motifs', materials: ['plywood-6mm', 'bamboo'], sizes: [{ label: 'Standard', widthMm: 200, heightMm: 300 }], cutMins: 5, engraveMins: 12, materialCost: 4.00, price: 24.00, difficulty: 'easy', styles: ['fun', 'rustic', 'homey'], audience: 'Home cooks, kitchen decor', marketing: 'Set the rules in style', mockup: 'Sign on kitchen wall above counter' },
  ],
};

@Injectable()
export class TrendProductGenerationService {
  private readonly logger = new Logger(TrendProductGenerationService.name);

  generateProductsFromTrend(trendTitle: string, trendKeywords: string[], category: string): GeneratedProduct[] {
    const products: GeneratedProduct[] = [];
    const kw = trendTitle.toLowerCase();

    // Match against product templates
    for (const [templateKey, templates] of Object.entries(PRODUCT_TEMPLATES)) {
      const isMatch = kw.includes(templateKey) ||
        trendKeywords.some(k => k.toLowerCase().includes(templateKey)) ||
        templateKey.split(/[-_]/).some(part => kw.includes(part));

      if (isMatch) {
        for (const tmpl of templates) {
          const subject = trendTitle.replace(/trending|rising|laser|engraving|cutting/gi, '').trim();
          products.push({
            id: `gen-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            trendTitle,
            productName: tmpl.nameTemplate.replace('{subject}', subject).replace('{style}', tmpl.styles[0] || 'Classic').replace('{animal}', subject),
            productType: tmpl.productType,
            description: tmpl.designConcept,
            designConcept: tmpl.designConcept,
            svgConceptDescription: tmpl.svgConcept,
            materials: tmpl.materials,
            recommendedSizes: tmpl.sizes,
            estimatedCutTimeMins: tmpl.cutMins,
            estimatedEngraveTimeMins: tmpl.engraveMins,
            materialCostEstimate: tmpl.materialCost,
            suggestedPrice: tmpl.price,
            profitMargin: Math.round(((tmpl.price - tmpl.materialCost) / tmpl.price) * 100),
            difficulty: tmpl.difficulty,
            styleHints: tmpl.styles,
            targetAudience: tmpl.audience,
            marketingAngle: tmpl.marketing,
            photoAiCompatible: true,
            mockupDescription: tmpl.mockup,
          });
        }
      }
    }

    // Fallback generic products if no template matched
    if (products.length === 0) {
      const subject = trendTitle;
      products.push(
        {
          id: `gen-${Date.now()}-a`,
          trendTitle,
          productName: `Custom ${subject} Engraved Plaque`,
          productType: 'plaque',
          description: `Personalized engraved plaque featuring ${subject.toLowerCase()} theme. Clean design with customizable text.`,
          designConcept: `Elegant plaque with ${subject.toLowerCase()} motif, personalization area, decorative border.`,
          svgConceptDescription: 'Rectangular plaque with border, central design area, text placeholders',
          materials: ['plywood-6mm', 'bamboo', 'walnut'],
          recommendedSizes: [{ label: 'Standard', widthMm: 200, heightMm: 150 }, { label: 'Large', widthMm: 300, heightMm: 200 }],
          estimatedCutTimeMins: 8,
          estimatedEngraveTimeMins: 12,
          materialCostEstimate: 5.00,
          suggestedPrice: 32.00,
          profitMargin: 84,
          difficulty: 'easy',
          styleHints: ['versatile', 'customizable'],
          targetAudience: 'Gift buyers, personalization seekers',
          marketingAngle: `The perfect personalized ${subject.toLowerCase()} gift`,
          photoAiCompatible: true,
          mockupDescription: 'Plaque on wooden surface with warm lighting',
        },
        {
          id: `gen-${Date.now()}-b`,
          trendTitle,
          productName: `${subject} Keychain`,
          productType: 'keychain',
          description: `Compact laser-cut keychain with ${subject.toLowerCase()} design. Durable everyday carry.`,
          designConcept: `Small keychain with ${subject.toLowerCase()} silhouette or text, keyring hole.`,
          svgConceptDescription: 'Small shape outline with keyring hole, design area',
          materials: ['plywood-3mm', 'acrylic-colored', 'leather'],
          recommendedSizes: [{ label: 'Standard', widthMm: 50, heightMm: 35 }],
          estimatedCutTimeMins: 2,
          estimatedEngraveTimeMins: 3,
          materialCostEstimate: 1.20,
          suggestedPrice: 14.99,
          profitMargin: 92,
          difficulty: 'easy',
          styleHints: ['compact', 'everyday'],
          targetAudience: 'Everyone, impulse buyers',
          marketingAngle: `Carry your passion with you`,
          photoAiCompatible: true,
          mockupDescription: 'Keychain on keys with lifestyle background',
        },
        {
          id: `gen-${Date.now()}-c`,
          trendTitle,
          productName: `${subject} Wall Art`,
          productType: 'wall-art',
          description: `Decorative wall art piece featuring ${subject.toLowerCase()} theme. Statement piece for any room.`,
          designConcept: `Artistic wall piece with ${subject.toLowerCase()} design, mounting hardware compatible.`,
          svgConceptDescription: 'Decorative panel with artistic design, mounting holes',
          materials: ['plywood-3mm', 'mdf-3mm', 'acrylic-black'],
          recommendedSizes: [{ label: 'Medium', widthMm: 250, heightMm: 250 }, { label: 'Large', widthMm: 400, heightMm: 400 }],
          estimatedCutTimeMins: 18,
          estimatedEngraveTimeMins: 0,
          materialCostEstimate: 5.50,
          suggestedPrice: 38.00,
          profitMargin: 86,
          difficulty: 'medium',
          styleHints: ['decorative', 'statement'],
          targetAudience: 'Home decor enthusiasts',
          marketingAngle: `Transform your space with unique laser art`,
          photoAiCompatible: true,
          mockupDescription: 'Art piece on wall in styled room',
        },
      );
    }

    return products;
  }

  generateBulkFromOpportunities(opportunities: Array<{ title: string; keywords: string[]; category: string }>): GeneratedProduct[] {
    const all: GeneratedProduct[] = [];
    for (const opp of opportunities.slice(0, 10)) {
      all.push(...this.generateProductsFromTrend(opp.title, opp.keywords, opp.category));
    }
    return all;
  }
}
