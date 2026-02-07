import { Injectable, Logger } from '@nestjs/common';

// ─── Types ──────────────────────────────────────────────────────────────────

export type LifecycleStage = 'emerging' | 'rising' | 'peak' | 'declining';

export interface TrendLifecycle {
  trendTitle: string;
  currentStage: LifecycleStage;
  stageConfidence: number;       // 0-100
  daysInCurrentStage: number;
  estimatedDaysRemaining: number;
  timeline: LifecycleTimelinePoint[];
  velocityTrend: 'accelerating' | 'steady' | 'decelerating';
  recommendation: string;
  actionUrgency: 'act-now' | 'prepare' | 'monitor' | 'avoid';
}

export interface LifecycleTimelinePoint {
  date: string;
  stage: LifecycleStage;
  volume: number;
  growthRate: number;
}

// ─── Stage classification thresholds ────────────────────────────────────────

const STAGE_THRESHOLDS = {
  emerging: { minGrowth: 5, maxGrowth: 100, minVolume: 0, maxVolume: 30, minDays: 0 },
  rising: { minGrowth: 8, maxGrowth: 100, minVolume: 20, maxVolume: 70, minDays: 7 },
  peak: { minGrowth: -5, maxGrowth: 10, minVolume: 60, maxVolume: 100, minDays: 14 },
  declining: { minGrowth: -100, maxGrowth: 0, minVolume: 0, maxVolume: 80, minDays: 21 },
};

@Injectable()
export class TrendLifecycleService {
  private readonly logger = new Logger(TrendLifecycleService.name);

  classifyLifecycle(params: {
    trendTitle: string;
    volumeHistory: number[];       // weekly volumes, oldest first
    growthRates: number[];         // weekly growth rates
    daysActive: number;
    competitionDensity: number;
    currentVolume: number;
  }): TrendLifecycle {
    const { trendTitle, volumeHistory, growthRates, daysActive, competitionDensity, currentVolume } = params;

    // Normalize volume to 0-100 scale
    const maxVol = Math.max(...volumeHistory, currentVolume, 1);
    const normalizedVolume = Math.round((currentVolume / maxVol) * 100);

    // Recent growth trend
    const recentGrowth = growthRates.length > 0
      ? growthRates.slice(-3).reduce((a, b) => a + b, 0) / Math.min(growthRates.length, 3)
      : 0;

    // Growth acceleration
    let velocityTrend: 'accelerating' | 'steady' | 'decelerating' = 'steady';
    if (growthRates.length >= 3) {
      const recent = growthRates.slice(-2).reduce((a, b) => a + b, 0) / 2;
      const prior = growthRates.slice(-4, -2).reduce((a, b) => a + b, 0) / Math.min(growthRates.slice(-4, -2).length, 2);
      if (recent > prior + 3) velocityTrend = 'accelerating';
      else if (recent < prior - 3) velocityTrend = 'decelerating';
    }

    // Classify stage
    let currentStage: LifecycleStage;
    let stageConfidence: number;

    if (recentGrowth < -3 && daysActive > 21) {
      currentStage = 'declining';
      stageConfidence = Math.min(90, 50 + Math.abs(recentGrowth) * 2);
    } else if (normalizedVolume > 70 && Math.abs(recentGrowth) < 8) {
      currentStage = 'peak';
      stageConfidence = Math.min(90, 50 + normalizedVolume * 0.3);
    } else if (recentGrowth > 5 && normalizedVolume > 25) {
      currentStage = 'rising';
      stageConfidence = Math.min(90, 50 + recentGrowth * 2);
    } else {
      currentStage = 'emerging';
      stageConfidence = Math.min(85, 40 + (daysActive < 14 ? 20 : 0) + (recentGrowth > 0 ? 15 : 0));
    }

    // Estimate days remaining in current stage
    let estimatedDaysRemaining: number;
    switch (currentStage) {
      case 'emerging': estimatedDaysRemaining = Math.max(7, 30 - daysActive); break;
      case 'rising': estimatedDaysRemaining = velocityTrend === 'accelerating' ? 14 : 30; break;
      case 'peak': estimatedDaysRemaining = velocityTrend === 'decelerating' ? 7 : 21; break;
      case 'declining': estimatedDaysRemaining = Math.max(7, Math.round(normalizedVolume / 3)); break;
    }

    // Days in current stage estimate
    let daysInCurrentStage: number;
    switch (currentStage) {
      case 'emerging': daysInCurrentStage = Math.min(daysActive, 14); break;
      case 'rising': daysInCurrentStage = Math.max(1, daysActive - 14); break;
      case 'peak': daysInCurrentStage = Math.max(1, daysActive - 30); break;
      case 'declining': daysInCurrentStage = Math.max(1, daysActive - 45); break;
    }

    // Build timeline
    const timeline: LifecycleTimelinePoint[] = [];
    const weeksBack = Math.min(volumeHistory.length, 12);
    for (let i = 0; i < weeksBack; i++) {
      const weekDate = new Date();
      weekDate.setDate(weekDate.getDate() - (weeksBack - i) * 7);
      const vol = volumeHistory[volumeHistory.length - weeksBack + i] || 0;
      const gr = growthRates[growthRates.length - weeksBack + i] || 0;
      const normVol = Math.round((vol / maxVol) * 100);

      let stage: LifecycleStage = 'emerging';
      if (normVol > 70 && Math.abs(gr) < 8) stage = 'peak';
      else if (gr > 5 && normVol > 25) stage = 'rising';
      else if (gr < -3) stage = 'declining';

      timeline.push({
        date: weekDate.toISOString().split('T')[0],
        stage,
        volume: vol,
        growthRate: gr,
      });
    }

    // Add current point
    timeline.push({
      date: new Date().toISOString().split('T')[0],
      stage: currentStage,
      volume: currentVolume,
      growthRate: recentGrowth,
    });

    // Recommendation and urgency
    let recommendation: string;
    let actionUrgency: 'act-now' | 'prepare' | 'monitor' | 'avoid';

    switch (currentStage) {
      case 'emerging':
        recommendation = 'Early signal detected. Create test designs and monitor growth. Low risk to experiment.';
        actionUrgency = 'monitor';
        break;
      case 'rising':
        if (velocityTrend === 'accelerating') {
          recommendation = 'Strong upward momentum. Ideal time to launch products. Prioritize production.';
          actionUrgency = 'act-now';
        } else {
          recommendation = 'Steady growth. Good time to prepare product listings and build inventory.';
          actionUrgency = 'prepare';
        }
        break;
      case 'peak':
        if (competitionDensity > 70) {
          recommendation = 'Market is saturated at peak. Focus on differentiation or niche angles.';
          actionUrgency = 'prepare';
        } else {
          recommendation = 'Peak demand with room for competition. Act quickly to capture market share.';
          actionUrgency = 'act-now';
        }
        break;
      case 'declining':
        if (normalizedVolume > 40) {
          recommendation = 'Declining but still viable. Discount existing inventory. Do not invest in new production.';
          actionUrgency = 'avoid';
        } else {
          recommendation = 'Trend is fading. Clear remaining stock and redirect resources to rising trends.';
          actionUrgency = 'avoid';
        }
        break;
    }

    return {
      trendTitle,
      currentStage,
      stageConfidence,
      daysInCurrentStage,
      estimatedDaysRemaining,
      timeline,
      velocityTrend,
      recommendation,
      actionUrgency,
    };
  }

  classifyBatch(trends: Array<{
    trendTitle: string;
    volumeHistory: number[];
    growthRates: number[];
    daysActive: number;
    competitionDensity: number;
    currentVolume: number;
  }>): TrendLifecycle[] {
    return trends.map(t => this.classifyLifecycle(t));
  }
}
