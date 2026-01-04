/**
 * Personalised Sign Generator V3 PRO - AI Prompt Templates
 * Templates for Gemini AI generation
 */

import type { AiDetailLevel, AiComplexity } from '../../types/signPro';

/**
 * Base instruction header for all AI prompts
 */
const BASE_INSTRUCTION = `Return ONLY valid SVG code. No markdown, no code fences, no explanations.
The SVG must have a viewBox attribute.
Use only: svg, g, path elements. No text, no images, no filters, no style tags.
All paths must use absolute coordinates.
Do NOT include any letters, numbers, dates, watermarks, or signatures.
Do NOT include random guide lines, stray strokes, frames, borders, or background elements.`;

/**
 * Build engraving sketch prompt
 * Produces line-art style SVG suitable for laser engraving
 */
export function buildEngravingSketchPrompt(
  userPrompt: string,
  detailLevel: AiDetailLevel = 'medium'
): string {
  const detailInstructions = {
    low: 'Very simplified outline only. Aim for 3-8 paths. Maximum ~80 path commands total.',
    medium: 'Moderate detail with some interior contour lines. Aim for 6-15 paths. Maximum ~180 path commands total.',
    high: 'Vintage engraving / etching look with contour lines + cross-hatching (short, directional strokes) for shading. Aim for 12-30 paths. Maximum ~350 path commands total.',
  };

  return `${BASE_INSTRUCTION}

Create a monochrome LINE ART sketch of: "${userPrompt}"

STRICT REQUIREMENTS:
- Style: Laser-friendly line art in a consistent "engraving" style (etching / woodcut). Use confident, intentional strokes.
- NO fills, NO solid shapes - only strokes
- Use contour lines to define form. For shading, use cross-hatching (many short strokes) instead of blobs.
- Do NOT draw abstract/stray lines not belonging to the subject.
- Do NOT include any words or numbers.
- All paths must have: fill="none" stroke="#000000" stroke-width="1"
- Use stroke-linecap="round" stroke-linejoin="round"
- Centered composition, subject occupies ~85% of the viewBox
- ${detailInstructions[detailLevel]}
- Simple, clean lines suitable for laser engraving
- No background elements
- Single subject, clear outline

Output format:
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <path d="..." fill="none" stroke="#000000" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
}

/**
 * Build shape silhouette prompt
 * Produces closed silhouette SVG suitable for laser cutting
 */
export function buildShapeSilhouettePrompt(
  userPrompt: string,
  complexity: AiComplexity = 'simple'
): string {
  const complexityInstructions = {
    simple: 'Single closed path, very simple outline. Maximum 30 path commands.',
    medium: 'Can have 2-3 separate closed paths. Maximum 60 path commands.',
    detailed: 'Can have multiple closed paths for detail. Maximum 100 path commands.',
  };

  return `${BASE_INSTRUCTION}

Create a SOLID SILHOUETTE shape of: "${userPrompt}"

STRICT REQUIREMENTS:
- Style: Clean silhouette, suitable for laser cutting
- ONLY closed paths with fill="#000000" stroke="none"
- NO open paths, NO strokes
- Smooth, clean edges
- Centered composition, occupies ~80% of viewBox
- ${complexityInstructions[complexity]}
- No interior holes unless essential to the shape
- Suitable for cutting from solid material

Output format:
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <path d="M... Z" fill="#000000" stroke="none"/>
</svg>`;
}

/**
 * Prompt suggestions for users
 */
export const PROMPT_SUGGESTIONS = {
  engravingSketch: [
    'deer in forest',
    'mountain landscape',
    'boho sun and moon',
    'floral wreath',
    'lighthouse by the sea',
    'bear silhouette',
    'tree of life',
    'compass rose',
    'feather',
    'butterfly',
  ],
  shapeSilhouette: [
    'heart',
    'star',
    'deer head',
    'tree',
    'mountain range',
    'elephant',
    'cat sitting',
    'bird flying',
    'flower',
    'leaf',
  ],
};

/**
 * Validate user prompt
 */
export function validatePrompt(prompt: string): { valid: boolean; error?: string } {
  if (!prompt || prompt.trim().length === 0) {
    return { valid: false, error: 'Prompt cannot be empty' };
  }

  if (prompt.trim().length < 3) {
    return { valid: false, error: 'Prompt is too short' };
  }

  if (prompt.length > 200) {
    return { valid: false, error: 'Prompt is too long (max 200 characters)' };
  }

  // Check for potentially problematic content
  const blockedPatterns = [
    /script/i,
    /javascript/i,
    /<[^>]+>/,
    /on\w+=/i,
  ];

  for (const pattern of blockedPatterns) {
    if (pattern.test(prompt)) {
      return { valid: false, error: 'Prompt contains invalid characters' };
    }
  }

  return { valid: true };
}
