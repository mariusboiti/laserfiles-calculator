import type { AIImageSettings } from '../types/jigsawV3';
import { refreshEntitlements } from '@/lib/entitlements/client';

/**
 * Module D: AI Image Generator Adapter
 * Pluggable adapter for AI image generation
 */

export interface AIImageResponse {
  success: boolean;
  imageUrl?: string;
  imageDataUrl?: string;
  variations?: string[];
  error?: string;
}

/**
 * Generate AI image using controlled prompt template
 */
export async function generateAIImage(
  settings: AIImageSettings
): Promise<AIImageResponse> {
  try {
    // Build controlled prompt
    const enhancedPrompt = buildEnhancedPrompt(settings);

    // Call API endpoint
    const response = await fetch('/api/ai/generate-puzzle-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: enhancedPrompt,
        stylePreset: settings.stylePreset,
        noText: settings.noText,
        transparentBackground: settings.transparentBackground,
        variationCount: settings.variationCount,
        seed: settings.seed,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    const data = await response.json();

    // Refresh credits in UI
    refreshEntitlements();

    return {
      success: true,
      imageDataUrl: data.imageDataUrl,
      variations: data.variations,
    };
  } catch (error) {
    console.error('AI image generation failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Build enhanced prompt with constraints
 */
function buildEnhancedPrompt(settings: AIImageSettings): string {
  const basePrompt = settings.prompt;
  const styleModifiers = getStyleModifiers(settings.stylePreset);

  // Build controlled prompt
  let enhancedPrompt = basePrompt;

  // Add style modifiers
  enhancedPrompt += `, ${styleModifiers}`;

  // Add constraints
  const constraints = [
    'high contrast',
    'minimal noise',
    'clean background',
    'centered subject',
    'no tiny details',
  ];

  if (settings.noText) {
    constraints.push('no text', 'no logos', 'no words');
  }

  enhancedPrompt += `, ${constraints.join(', ')}`;

  // Add technical requirements
  enhancedPrompt += ', optimized for laser engraving, clear edges, good depth variation';

  return enhancedPrompt;
}

/**
 * Get style modifiers for preset
 */
function getStyleModifiers(preset: string): string {
  switch (preset) {
    case 'kids-cute':
      return 'cute cartoon style, simple shapes, bold outlines, child-friendly, playful, bright';
    case 'realistic-portrait':
      return 'photorealistic, detailed portrait, professional lighting, clear features, good contrast';
    case 'line-art':
      return 'clean line art, vector style, minimal shading, clear outlines, simple forms';
    case 'stained-glass':
      return 'stained glass style, bold outlines, distinct color regions, geometric patterns';
    default:
      return 'high quality, clear details';
  }
}

/**
 * Check if AI image generation is available
 */
export async function checkAIAvailability(): Promise<boolean> {
  try {
    const response = await fetch('/api/ai/check-availability');
    const data = await response.json();
    return data.available === true;
  } catch {
    return false;
  }
}

/**
 * Generate placeholder/fallback image
 */
export function generatePlaceholderImage(
  width: number,
  height: number,
  text: string
): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) return '';

  // Gradient background
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#f0f0f0');
  gradient.addColorStop(1, '#d0d0d0');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Text
  ctx.fillStyle = '#666666';
  ctx.font = `${Math.min(width, height) / 10}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, width / 2, height / 2);

  return canvas.toDataURL('image/png');
}

/**
 * Validate AI image settings
 */
export function validateAIImageSettings(settings: AIImageSettings): string[] {
  const warnings: string[] = [];

  if (!settings.prompt || settings.prompt.trim().length === 0) {
    warnings.push('Prompt is required for AI image generation');
  }

  if (settings.prompt.length > 500) {
    warnings.push('Prompt is too long (max 500 characters)');
  }

  if (settings.variationCount < 1 || settings.variationCount > 4) {
    warnings.push('Variation count must be between 1 and 4');
  }

  return warnings;
}
