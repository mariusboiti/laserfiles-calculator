import { Injectable, Logger } from '@nestjs/common';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ContentIdea {
  platform: 'tiktok' | 'instagram' | 'pinterest' | 'youtube' | 'facebook';
  contentType: 'reel' | 'post' | 'story' | 'pin' | 'short' | 'carousel';
  title: string;
  hook: string;
  caption: string;
  hashtags: string[];
  storytellingAngle: string;
  estimatedReach: 'low' | 'medium' | 'high' | 'viral-potential';
  bestPostingTime: string;
  callToAction: string;
}

export interface ContentPlan {
  trendTitle: string;
  productName: string;
  ideas: ContentIdea[];
  weeklySchedule: Array<{ day: string; platform: string; contentType: string; title: string }>;
}

// ─── Content templates ──────────────────────────────────────────────────────

const HOOK_TEMPLATES = [
  'POV: You just discovered the perfect {product} for {audience}',
  'Wait until you see this {product} come to life on the laser',
  'The {product} everyone is asking about right now',
  'How I make ${price} per hour with this simple {product}',
  'This {product} took me {time} minutes to make and sells for ${price}',
  'Stop scrolling if you love {theme} — this one\'s for you',
  'The laser cutting trend you NEED to try in {season}',
  'From raw {material} to finished {product} in {time} minutes',
  'My best-selling {product} and how I make it',
  'Why {product} is trending right now (and how to profit)',
];

const CAPTION_TEMPLATES = [
  'Just finished this custom {product} and I\'m obsessed with how it turned out! Made from {material} on my laser cutter. DM for custom orders! {cta}',
  'This {product} is one of my top sellers right now. The {style} design really resonates with {audience}. What do you think? {cta}',
  'Behind the scenes: Making a {product} from start to finish. {material} + laser = magic. {cta}',
  'New in the shop! {product} in {style} style. Perfect for {occasion}. Link in bio! {cta}',
  'The process of creating this {product} is so satisfying to watch. Would you like to see more? {cta}',
];

const STORYTELLING_ANGLES = [
  'Process video: Show the entire creation from design to finished product',
  'Before/After: Raw material transformation into beautiful product',
  'Customer reaction: Show the moment a customer receives their custom order',
  'Behind the scenes: Your workshop, tools, and daily routine',
  'Tutorial style: Quick tips on how you achieve a specific technique',
  'Trend explanation: Why this product is popular and how you capitalize on it',
  'Comparison: Show different materials/styles for the same design',
  'Packaging and shipping: The care you put into every order',
];

const HASHTAG_POOLS: Record<string, string[]> = {
  general: ['#lasercut', '#lasercutting', '#laserengraving', '#laserart', '#handmade', '#customorder', '#smallbusiness', '#makersofinstagram', '#craftbusiness', '#laserbusiness'],
  tiktok: ['#lasertok', '#smallbiztok', '#makertok', '#satisfying', '#process', '#asmr', '#fyp', '#viral', '#trending', '#diy'],
  wedding: ['#weddingdecor', '#customwedding', '#bridetobe', '#weddingsigns', '#rusticwedding', '#weddingdetails'],
  pet: ['#petmemorial', '#petlover', '#dogmom', '#catlover', '#petgifts', '#rainbowbridge'],
  homedecor: ['#homedecor', '#farmhousestyle', '#modernhome', '#wallart', '#handmadehome', '#customsigns'],
  christmas: ['#christmasgifts', '#christmasornaments', '#handmadechristmas', '#personalizedgifts', '#holidaydecor'],
  kids: ['#nursurydecor', '#babygifts', '#kidsdecor', '#personalizedbaby', '#newbabygift'],
};

const POSTING_TIMES: Record<string, string> = {
  tiktok: 'Tue/Thu/Sat 7-9 PM or 11 AM-1 PM',
  instagram: 'Mon/Wed/Fri 11 AM-1 PM or 7-9 PM',
  pinterest: 'Sat/Sun 8-11 PM, Fri 3 PM',
  youtube: 'Thu/Fri 2-4 PM or Sat 9-11 AM',
  facebook: 'Wed 11 AM-1 PM, Thu/Fri 1-3 PM',
};

@Injectable()
export class ContentIdeaGeneratorService {
  private readonly logger = new Logger(ContentIdeaGeneratorService.name);

  generateContentPlan(params: {
    trendTitle: string;
    productName: string;
    productType: string;
    materials: string[];
    styles: string[];
    targetAudience: string;
    priceRange: { min: number; max: number };
    season?: string;
  }): ContentPlan {
    const { trendTitle, productName, productType, materials, styles, targetAudience, priceRange, season } = params;

    const ideas: ContentIdea[] = [];

    // Generate ideas for each platform
    const platforms: Array<{ platform: ContentIdea['platform']; types: ContentIdea['contentType'][] }> = [
      { platform: 'tiktok', types: ['reel', 'short'] },
      { platform: 'instagram', types: ['reel', 'carousel', 'story'] },
      { platform: 'pinterest', types: ['pin'] },
      { platform: 'youtube', types: ['short'] },
      { platform: 'facebook', types: ['post', 'reel'] },
    ];

    for (const { platform, types } of platforms) {
      for (const contentType of types.slice(0, 2)) {
        const hook = this.fillTemplate(
          HOOK_TEMPLATES[Math.floor(Math.random() * HOOK_TEMPLATES.length)],
          { product: productName, audience: targetAudience, theme: trendTitle, material: materials[0] || 'wood', price: String(priceRange.max), time: '15', season: season || 'this season' }
        );

        const caption = this.fillTemplate(
          CAPTION_TEMPLATES[Math.floor(Math.random() * CAPTION_TEMPLATES.length)],
          { product: productName, material: materials[0] || 'wood', style: styles[0] || 'custom', audience: targetAudience, occasion: season || 'any occasion', cta: '👇 Comment "INFO" for details!' }
        );

        const storytelling = STORYTELLING_ANGLES[Math.floor(Math.random() * STORYTELLING_ANGLES.length)];

        // Build hashtags
        const hashtags = [...HASHTAG_POOLS.general.slice(0, 5)];
        if (platform === 'tiktok') hashtags.push(...HASHTAG_POOLS.tiktok.slice(0, 4));
        // Add category-specific hashtags
        const kwLower = trendTitle.toLowerCase();
        if (kwLower.includes('wedding')) hashtags.push(...HASHTAG_POOLS.wedding.slice(0, 3));
        if (kwLower.includes('pet') || kwLower.includes('dog') || kwLower.includes('cat')) hashtags.push(...HASHTAG_POOLS.pet.slice(0, 3));
        if (kwLower.includes('home') || kwLower.includes('decor') || kwLower.includes('sign')) hashtags.push(...HASHTAG_POOLS.homedecor.slice(0, 3));
        if (kwLower.includes('christmas') || kwLower.includes('holiday')) hashtags.push(...HASHTAG_POOLS.christmas.slice(0, 3));
        if (kwLower.includes('kid') || kwLower.includes('baby') || kwLower.includes('nursery')) hashtags.push(...HASHTAG_POOLS.kids.slice(0, 3));

        // Add product-specific hashtag
        hashtags.push(`#${productType.replace(/[^a-zA-Z]/g, '')}`, `#custom${productType.replace(/[^a-zA-Z]/g, '')}`);

        // Estimated reach
        let estimatedReach: ContentIdea['estimatedReach'] = 'medium';
        if (platform === 'tiktok' && contentType === 'reel') estimatedReach = 'high';
        if (platform === 'pinterest') estimatedReach = 'medium';
        if (contentType === 'story') estimatedReach = 'low';

        ideas.push({
          platform,
          contentType,
          title: `${hook.slice(0, 60)}...`,
          hook,
          caption,
          hashtags: [...new Set(hashtags)].slice(0, 15),
          storytellingAngle: storytelling,
          estimatedReach,
          bestPostingTime: POSTING_TIMES[platform] || 'Weekdays 11 AM-1 PM',
          callToAction: this.generateCTA(platform, productType),
        });
      }
    }

    // Weekly schedule
    const weeklySchedule = [
      { day: 'Monday', platform: 'instagram', contentType: 'carousel', title: `${productName} — Design showcase` },
      { day: 'Tuesday', platform: 'tiktok', contentType: 'reel', title: `Making ${productName} — Process video` },
      { day: 'Wednesday', platform: 'facebook', contentType: 'post', title: `New in shop: ${productName}` },
      { day: 'Thursday', platform: 'tiktok', contentType: 'reel', title: `${productName} — Before & After` },
      { day: 'Friday', platform: 'instagram', contentType: 'reel', title: `${productName} — Customer reaction` },
      { day: 'Saturday', platform: 'pinterest', contentType: 'pin', title: `${productName} — Styled product photo` },
      { day: 'Sunday', platform: 'instagram', contentType: 'story', title: `Behind the scenes — Workshop day` },
    ];

    return {
      trendTitle,
      productName,
      ideas,
      weeklySchedule,
    };
  }

  private fillTemplate(template: string, vars: Record<string, string>): string {
    let result = template;
    for (const [key, value] of Object.entries(vars)) {
      result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    }
    return result;
  }

  private generateCTA(platform: string, productType: string): string {
    const ctas: Record<string, string[]> = {
      tiktok: ['Link in bio for custom orders!', 'Comment "WANT" and I\'ll DM you the link!', 'Follow for more laser cutting content!'],
      instagram: ['DM me "ORDER" for custom requests!', 'Link in bio — shop now!', 'Save this for later!'],
      pinterest: ['Click to shop this design!', 'Pin for later — perfect gift idea!', 'Visit our shop for custom orders!'],
      youtube: ['Subscribe for weekly laser cutting content!', 'Check the description for shop link!'],
      facebook: ['Share with someone who needs this!', 'Comment below for pricing!', 'Visit our shop — link in comments!'],
    };
    const pool = ctas[platform] || ctas.instagram;
    return pool[Math.floor(Math.random() * pool.length)];
  }
}
