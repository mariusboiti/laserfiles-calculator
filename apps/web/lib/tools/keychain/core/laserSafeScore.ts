/**
 * Keychain Hub - Laser Safe Score
 * Evaluate if an icon is suitable for laser cutting
 */

import { countPathCommands, getPathDataLength } from './svgCleanup';
import { computeCombinedBBox } from './iconNormalize';

export type LaserSafeLevel = 'good' | 'warning' | 'complex';

export interface LaserSafeScore {
  level: LaserSafeLevel;
  score: number; // 0-100, higher is better
  pathCount: number;
  commandCount: number;
  dataLength: number;
  issues: string[];
  recommendation: string;
}

// Thresholds
const THRESHOLDS = {
  pathCount: {
    good: 6,
    warning: 12,
  },
  commandCount: {
    good: 150,
    warning: 400,
  },
  dataLength: {
    good: 1000,
    warning: 3000,
  },
};

/**
 * Calculate laser safe score for paths
 */
export function calculateLaserSafeScore(paths: string[]): LaserSafeScore {
  const pathCount = paths.length;
  const commandCount = countPathCommands(paths);
  const dataLength = getPathDataLength(paths);
  
  const issues: string[] = [];
  let score = 100;
  
  // Path count scoring
  if (pathCount > THRESHOLDS.pathCount.warning) {
    score -= 25;
    issues.push(`Too many paths (${pathCount})`);
  } else if (pathCount > THRESHOLDS.pathCount.good) {
    score -= 10;
    issues.push(`Many paths (${pathCount})`);
  }
  
  // Command count scoring
  if (commandCount > THRESHOLDS.commandCount.warning) {
    score -= 30;
    issues.push(`Very complex paths (${commandCount} commands)`);
  } else if (commandCount > THRESHOLDS.commandCount.good) {
    score -= 15;
    issues.push(`Complex paths (${commandCount} commands)`);
  }
  
  // Data length scoring
  if (dataLength > THRESHOLDS.dataLength.warning) {
    score -= 20;
    issues.push('Path data very long');
  } else if (dataLength > THRESHOLDS.dataLength.good) {
    score -= 10;
    issues.push('Path data moderately long');
  }
  
  // Check for thin features (heuristic: very small bbox dimension)
  const bbox = computeCombinedBBox(paths);
  if (bbox) {
    const minDimension = Math.min(bbox.width, bbox.height);
    if (minDimension < 5) {
      score -= 15;
      issues.push('Contains very thin features');
    }
  }
  
  // Empty check
  if (paths.length === 0) {
    score = 0;
    issues.push('No paths found');
  }
  
  // Clamp score
  score = Math.max(0, Math.min(100, score));
  
  // Determine level
  let level: LaserSafeLevel = 'good';
  let recommendation = 'Good for laser cutting';
  
  if (score < 50) {
    level = 'complex';
    recommendation = 'Too complex for laser. Try a simpler prompt.';
  } else if (score < 75) {
    level = 'warning';
    recommendation = 'Might be too detailed. Consider simplifying.';
  }
  
  return {
    level,
    score,
    pathCount,
    commandCount,
    dataLength,
    issues,
    recommendation,
  };
}

/**
 * Get emoji indicator for level
 */
export function getLevelEmoji(level: LaserSafeLevel): string {
  switch (level) {
    case 'good': return '✅';
    case 'warning': return '⚠️';
    case 'complex': return '❌';
  }
}

/**
 * Get color class for level
 */
export function getLevelColor(level: LaserSafeLevel): string {
  switch (level) {
    case 'good': return 'text-green-400';
    case 'warning': return 'text-yellow-400';
    case 'complex': return 'text-red-400';
  }
}

/**
 * Get background color class for level
 */
export function getLevelBgColor(level: LaserSafeLevel): string {
  switch (level) {
    case 'good': return 'bg-green-900/30 border-green-700';
    case 'warning': return 'bg-yellow-900/30 border-yellow-700';
    case 'complex': return 'bg-red-900/30 border-red-700';
  }
}
