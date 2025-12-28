import type { DifficultySettings } from '../types/jigsawV3';
import type { KnobStyle } from '../types/jigsaw';

/**
 * Module E: Difficulty Control
 * Adjusts knob generation parameters based on difficulty level
 */

export interface KnobGenerationParams {
  neckStart: number;
  neckEnd: number;
  neckWidth: number;
  knobHeight: number;
  knobWidth: number;
  curveTension: number;
  jitter: number; // Position jitter along edge
}

/**
 * Get knob generation parameters adjusted for difficulty
 */
export function getKnobParamsForDifficulty(
  style: KnobStyle,
  edgeLength: number,
  random: () => number,
  kidsMode: boolean,
  difficulty: DifficultySettings
): KnobGenerationParams {
  const baseKnobSize = edgeLength * (kidsMode ? 0.25 : 0.2);
  const difficultyFactor = difficulty.level / 10; // 0.1 to 1.0
  
  // Variation increases with difficulty
  const variationMultiplier = difficulty.knobVariation === 'auto' 
    ? difficultyFactor 
    : difficulty.knobVariation === 'low' ? 0.3 
    : difficulty.knobVariation === 'medium' ? 0.6 
    : 0.9;
  
  // Jitter increases with difficulty (makes pieces less predictable)
  const jitter = difficulty.level <= 3 ? 0 : (difficulty.level - 3) * 0.01;
  
  // Base ranges
  let neckStartMin = 0.35;
  let neckStartMax = 0.42;
  let neckEndMin = 0.58;
  let neckEndMax = 0.65;
  
  // Apply difficulty adjustments
  if (difficulty.level <= 3 && difficulty.edgeSymmetryLock) {
    // Low difficulty: more uniform, predictable
    neckStartMin = 0.38;
    neckStartMax = 0.40;
    neckEndMin = 0.60;
    neckEndMax = 0.62;
  } else if (difficulty.level >= 7 && difficulty.ambiguousEdges) {
    // High difficulty: more variation, similar-looking knobs
    neckStartMin = 0.32;
    neckStartMax = 0.48;
    neckEndMin = 0.52;
    neckEndMax = 0.68;
  }
  
  switch (style) {
    case 'classic':
      return {
        neckStart: neckStartMin + random() * (neckStartMax - neckStartMin) + jitter * (random() - 0.5),
        neckEnd: neckEndMin + random() * (neckEndMax - neckEndMin) + jitter * (random() - 0.5),
        neckWidth: baseKnobSize * (0.4 + variationMultiplier * 0.1 * (random() - 0.5)),
        knobHeight: baseKnobSize * (kidsMode ? 0.8 : 1.0) * (1 + variationMultiplier * 0.2 * (random() - 0.5)),
        knobWidth: baseKnobSize * (0.9 + variationMultiplier * 0.2 * (random() - 0.5)),
        curveTension: 0.4 + variationMultiplier * 0.1 * (random() - 0.5),
        jitter,
      };
      
    case 'organic':
      return {
        neckStart: neckStartMin + random() * (neckStartMax - neckStartMin) + jitter * (random() - 0.5),
        neckEnd: neckEndMin + random() * (neckEndMax - neckEndMin) + jitter * (random() - 0.5),
        neckWidth: baseKnobSize * (0.35 + variationMultiplier * 0.15 * random()),
        knobHeight: baseKnobSize * (0.85 + variationMultiplier * 0.3 * random()),
        knobWidth: baseKnobSize * (0.8 + variationMultiplier * 0.3 * random()),
        curveTension: 0.3 + variationMultiplier * 0.2 * random(),
        jitter,
      };
      
    case 'simple':
      // Simple style is less affected by difficulty
      return {
        neckStart: 0.4,
        neckEnd: 0.6,
        neckWidth: baseKnobSize * 0.5,
        knobHeight: baseKnobSize * 0.7,
        knobWidth: baseKnobSize * 0.7,
        curveTension: 0.2,
        jitter: jitter * 0.5, // Less jitter for simple style
      };
      
    default:
      return getKnobParamsForDifficulty('classic', edgeLength, random, kidsMode, difficulty);
  }
}

/**
 * Validate difficulty settings
 */
export function validateDifficultySettings(settings: DifficultySettings): string[] {
  const warnings: string[] = [];
  
  if (settings.level < 1 || settings.level > 10) {
    warnings.push('Difficulty level must be between 1 and 10');
  }
  
  if (settings.level <= 3 && !settings.edgeSymmetryLock) {
    warnings.push('Edge symmetry lock recommended for difficulty ≤3 (kids-friendly)');
  }
  
  if (settings.level >= 8 && !settings.ambiguousEdges) {
    warnings.push('Ambiguous edges recommended for difficulty ≥8 (challenging)');
  }
  
  return warnings;
}
