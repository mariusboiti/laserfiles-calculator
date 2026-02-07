import { Injectable, Logger } from '@nestjs/common';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ConfidenceAssessment {
  trendTitle: string;
  overallConfidence: number;       // 0-100
  signalConsistency: number;       // 0-100
  crossPlatformValidation: number; // 0-100
  growthMomentum: number;          // 0-100
  saturationRisk: number;          // 0-100 (higher = more saturated)
  isHypeTrend: boolean;
  hypeWarnings: string[];
  reliabilityGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  recommendation: string;
}

@Injectable()
export class TrendConfidenceEngine {
  private readonly logger = new Logger(TrendConfidenceEngine.name);

  assessConfidence(params: {
    trendTitle: string;
    sources: string[];
    signalStrengths: number[];
    growthRates: number[];
    competitionDensity: number;
    daysActive: number;
    volumeHistory?: number[];
  }): ConfidenceAssessment {
    const { trendTitle, sources, signalStrengths, growthRates, competitionDensity, daysActive, volumeHistory = [] } = params;

    // Signal consistency: how uniform are signal strengths across sources?
    const avgSignal = signalStrengths.length > 0
      ? signalStrengths.reduce((a, b) => a + b, 0) / signalStrengths.length
      : 0;
    const signalVariance = signalStrengths.length > 1
      ? signalStrengths.reduce((sum, s) => sum + Math.pow(s - avgSignal, 2), 0) / signalStrengths.length
      : 0;
    const signalConsistency = Math.max(0, Math.round(100 - Math.sqrt(signalVariance) * 2));

    // Cross-platform validation: how many distinct platform types confirm the trend?
    const platformTypes = new Set<string>();
    for (const src of sources) {
      const s = src.toLowerCase();
      if (['etsy', 'shopify', 'amazon'].some(p => s.includes(p))) platformTypes.add('marketplace');
      if (['tiktok', 'instagram', 'pinterest'].some(p => s.includes(p))) platformTypes.add('social');
      if (['reddit', 'forum', 'facebook'].some(p => s.includes(p))) platformTypes.add('community');
    }
    const crossPlatformValidation = Math.min(100, Math.round((platformTypes.size / 3) * 100));

    // Growth momentum: are growth rates positive and accelerating?
    const avgGrowth = growthRates.length > 0
      ? growthRates.reduce((a, b) => a + b, 0) / growthRates.length
      : 0;
    const growthMomentum = Math.min(100, Math.max(0, Math.round(50 + avgGrowth * 5)));

    // Saturation risk
    const saturationRisk = Math.min(100, Math.round(competitionDensity * 1.2));

    // Hype detection
    const hypeWarnings: string[] = [];
    let isHypeTrend = false;

    // Sudden spike with no history = potential hype
    if (daysActive < 14 && avgGrowth > 15) {
      hypeWarnings.push('Extremely rapid growth with short history — may be a flash trend');
    }
    // Single-platform signal
    if (platformTypes.size === 1) {
      hypeWarnings.push('Signal from single platform type only — limited validation');
    }
    // Volume spike then drop
    if (volumeHistory.length >= 4) {
      const recent = volumeHistory.slice(-2);
      const prior = volumeHistory.slice(-4, -2);
      const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
      const priorAvg = prior.reduce((a, b) => a + b, 0) / prior.length;
      if (recentAvg < priorAvg * 0.7) {
        hypeWarnings.push('Volume declining after spike — trend may be fading');
      }
    }
    // Very high growth + high competition = hype
    if (avgGrowth > 20 && competitionDensity > 60) {
      hypeWarnings.push('High growth combined with high competition — likely oversaturated hype');
      isHypeTrend = true;
    }
    if (hypeWarnings.length >= 3) isHypeTrend = true;

    // Overall confidence
    const overallConfidence = Math.round(
      signalConsistency * 0.25 +
      crossPlatformValidation * 0.30 +
      growthMomentum * 0.25 +
      (100 - saturationRisk) * 0.20
    ) - (isHypeTrend ? 20 : 0);

    const clampedConfidence = Math.max(0, Math.min(100, overallConfidence));

    // Grade
    let reliabilityGrade: 'A' | 'B' | 'C' | 'D' | 'F';
    if (clampedConfidence >= 80) reliabilityGrade = 'A';
    else if (clampedConfidence >= 65) reliabilityGrade = 'B';
    else if (clampedConfidence >= 50) reliabilityGrade = 'C';
    else if (clampedConfidence >= 35) reliabilityGrade = 'D';
    else reliabilityGrade = 'F';

    // Recommendation
    let recommendation: string;
    if (isHypeTrend) {
      recommendation = 'Caution: This appears to be a hype trend. Consider small test batches only.';
    } else if (clampedConfidence >= 75 && saturationRisk < 40) {
      recommendation = 'Strong opportunity: High confidence, low saturation. Recommended for production.';
    } else if (clampedConfidence >= 60) {
      recommendation = 'Moderate opportunity: Good signals but monitor competition closely.';
    } else if (clampedConfidence >= 40) {
      recommendation = 'Emerging signal: Worth watching but too early for large investment.';
    } else {
      recommendation = 'Weak signal: Insufficient data to recommend action.';
    }

    return {
      trendTitle,
      overallConfidence: clampedConfidence,
      signalConsistency,
      crossPlatformValidation,
      growthMomentum,
      saturationRisk,
      isHypeTrend,
      hypeWarnings,
      reliabilityGrade,
      recommendation,
    };
  }
}
