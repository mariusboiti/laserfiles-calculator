import { Injectable, Logger } from '@nestjs/common';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface UserTrendProfile {
  userId: string;
  preferredCategories: string[];
  preferredMaterials: string[];
  preferredStyles: string[];
  priceRange: { min: number; max: number };
  skillLevel: 'beginner' | 'intermediate' | 'advanced';
  machineCapabilities: string[];
  recentActivity: string[];
}

export interface PersonalizedTrend {
  trendTitle: string;
  relevanceScore: number;        // 0-100
  matchReasons: string[];
  personalizedInsight: string;
  suggestedAction: string;
  estimatedEffort: 'low' | 'medium' | 'high';
  matchedPreferences: string[];
}

export interface PersonalizedFeed {
  userId: string;
  generatedAt: string;
  topPicks: PersonalizedTrend[];
  newForYou: PersonalizedTrend[];
  basedOnHistory: PersonalizedTrend[];
  quickWins: PersonalizedTrend[];
}

@Injectable()
export class UserTrendPersonalizationService {
  private readonly logger = new Logger(UserTrendPersonalizationService.name);

  // In production, this would fetch from DB. For now, simulate user profiles.
  buildUserProfile(userId: string, activityData?: any): UserTrendProfile {
    return {
      userId,
      preferredCategories: activityData?.categories || ['home-decor', 'pet-gifts', 'wedding'],
      preferredMaterials: activityData?.materials || ['plywood-3mm', 'plywood-6mm', 'bamboo', 'acrylic-clear'],
      preferredStyles: activityData?.styles || ['rustic', 'modern', 'minimalist'],
      priceRange: activityData?.priceRange || { min: 15, max: 65 },
      skillLevel: activityData?.skillLevel || 'intermediate',
      machineCapabilities: activityData?.machines || ['co2-40w', 'cutting', 'engraving'],
      recentActivity: activityData?.recent || ['keychain', 'coaster', 'sign', 'ornament'],
    };
  }

  generatePersonalizedFeed(
    profile: UserTrendProfile,
    allTrends: Array<{
      title: string;
      category: string;
      keywords: string[];
      materials: string[];
      styles: string[];
      priceRange: { min: number; max: number };
      trendStrength: number;
      growthVelocity: number;
      difficulty: string;
    }>,
  ): PersonalizedFeed {
    const scored: PersonalizedTrend[] = [];

    for (const trend of allTrends) {
      let relevanceScore = 0;
      const matchReasons: string[] = [];
      const matchedPreferences: string[] = [];

      // Category match (+25)
      if (profile.preferredCategories.some(c =>
        trend.category.toLowerCase().includes(c) || c.includes(trend.category.toLowerCase())
      )) {
        relevanceScore += 25;
        matchReasons.push('Matches your preferred categories');
        matchedPreferences.push('category');
      }

      // Material match (+20)
      const materialOverlap = trend.materials.filter(m =>
        profile.preferredMaterials.some(pm => m.includes(pm) || pm.includes(m))
      );
      if (materialOverlap.length > 0) {
        relevanceScore += 15 + Math.min(materialOverlap.length * 3, 10);
        matchReasons.push(`Uses materials you work with: ${materialOverlap.slice(0, 2).join(', ')}`);
        matchedPreferences.push('materials');
      }

      // Style match (+15)
      const styleOverlap = trend.styles.filter(s =>
        profile.preferredStyles.some(ps => s.includes(ps) || ps.includes(s))
      );
      if (styleOverlap.length > 0) {
        relevanceScore += 10 + Math.min(styleOverlap.length * 3, 8);
        matchReasons.push(`Matches your style: ${styleOverlap.slice(0, 2).join(', ')}`);
        matchedPreferences.push('style');
      }

      // Price range overlap (+10)
      if (trend.priceRange.min <= profile.priceRange.max && trend.priceRange.max >= profile.priceRange.min) {
        relevanceScore += 10;
        matchReasons.push('Within your target price range');
        matchedPreferences.push('price');
      }

      // Skill level match (+10)
      const difficultyMap: Record<string, number> = { easy: 1, medium: 2, hard: 3 };
      const skillMap: Record<string, number> = { beginner: 1, intermediate: 2, advanced: 3 };
      const trendDiff = difficultyMap[trend.difficulty] || 2;
      const userSkill = skillMap[profile.skillLevel] || 2;
      if (trendDiff <= userSkill) {
        relevanceScore += 10;
        matchReasons.push('Matches your skill level');
        matchedPreferences.push('skill');
      }

      // Recent activity similarity (+10)
      const activityMatch = profile.recentActivity.some(a =>
        trend.keywords.some(k => k.toLowerCase().includes(a) || a.includes(k.toLowerCase()))
      );
      if (activityMatch) {
        relevanceScore += 10;
        matchReasons.push('Similar to your recent projects');
        matchedPreferences.push('activity');
      }

      // Trend strength bonus (+5)
      if (trend.trendStrength > 70) {
        relevanceScore += 5;
        matchReasons.push('Strong market demand');
      }

      // Cap at 100
      relevanceScore = Math.min(100, relevanceScore);

      // Generate personalized insight
      let personalizedInsight: string;
      if (relevanceScore >= 75) {
        personalizedInsight = `This trend is a strong match for your setup. You already have the materials and skills to produce this.`;
      } else if (relevanceScore >= 50) {
        personalizedInsight = `Good fit for your business. Consider testing with a small batch to gauge demand.`;
      } else if (relevanceScore >= 30) {
        personalizedInsight = `Partial match. You may need new materials or techniques, but the market opportunity is there.`;
      } else {
        personalizedInsight = `Outside your usual focus, but could be worth exploring for diversification.`;
      }

      // Suggested action
      let suggestedAction: string;
      if (relevanceScore >= 70 && trend.growthVelocity > 5) {
        suggestedAction = 'Start production immediately — high relevance and growing demand.';
      } else if (relevanceScore >= 50) {
        suggestedAction = 'Create a test design and list on marketplace to gauge interest.';
      } else {
        suggestedAction = 'Add to watchlist and revisit if trend strengthens.';
      }

      // Estimated effort
      let estimatedEffort: 'low' | 'medium' | 'high' = 'medium';
      if (matchedPreferences.includes('materials') && matchedPreferences.includes('skill')) estimatedEffort = 'low';
      else if (!matchedPreferences.includes('materials') || trendDiff > userSkill) estimatedEffort = 'high';

      scored.push({
        trendTitle: trend.title,
        relevanceScore,
        matchReasons,
        personalizedInsight,
        suggestedAction,
        estimatedEffort,
        matchedPreferences,
      });
    }

    // Sort by relevance
    scored.sort((a, b) => b.relevanceScore - a.relevanceScore);

    return {
      userId: profile.userId,
      generatedAt: new Date().toISOString(),
      topPicks: scored.filter(t => t.relevanceScore >= 65).slice(0, 5),
      newForYou: scored.filter(t => !t.matchedPreferences.includes('activity') && t.relevanceScore >= 40).slice(0, 5),
      basedOnHistory: scored.filter(t => t.matchedPreferences.includes('activity')).slice(0, 5),
      quickWins: scored.filter(t => t.estimatedEffort === 'low' && t.relevanceScore >= 50).slice(0, 5),
    };
  }
}
