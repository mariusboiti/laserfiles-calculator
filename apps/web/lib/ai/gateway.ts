'use client';

/**
 * AI Gateway Client
 * Provides functions to call AI through the centralized gateway with credit consumption
 */

export type AiGatewayError = {
  code: 'TRIAL_REQUIRED' | 'TRIAL_EXPIRED' | 'CREDITS_EXHAUSTED' | 'AI_ERROR' | 'NETWORK_ERROR' | 'INVALID_REQUEST';
  message: string;
};

export type AiGatewayResult<T> = 
  | { ok: true; data: T; credits: { used: number; remaining: number } }
  | { ok: false; error: AiGatewayError };

/**
 * Generate an image using AI
 */
export async function generateAiImage(params: {
  toolSlug: string;
  prompt: string;
  mode: 'engravingSketch' | 'shapeSilhouette';
  aspect?: '1:1' | '4:3' | '16:9';
  transparent?: boolean;
}): Promise<AiGatewayResult<{ mime: string; base64: string; promptUsed: string }>> {
  const { toolSlug, prompt, mode, aspect, transparent } = params;

  try {
    const response = await fetch('/api/ai/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        toolSlug,
        actionType: 'image',
        provider: 'gemini',
        payload: { prompt, mode, aspect, transparent },
      }),
    });

    const result = await response.json();

    if (result.ok) {
      return {
        ok: true,
        data: result.data as { mime: string; base64: string; promptUsed: string },
        credits: result.credits,
      };
    }

    return {
      ok: false,
      error: {
        code: result.error?.code || 'AI_ERROR',
        message: result.error?.message || 'AI generation failed',
      },
    };
  } catch (err) {
    return {
      ok: false,
      error: {
        code: 'NETWORK_ERROR',
        message: err instanceof Error ? err.message : 'Network error',
      },
    };
  }
}

/**
 * Generate text using AI
 */
export async function generateAiText(params: {
  toolSlug: string;
  prompt: string;
  systemPrompt?: string;
}): Promise<AiGatewayResult<{ text: string }>> {
  const { toolSlug, prompt, systemPrompt } = params;

  try {
    const response = await fetch('/api/ai/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        toolSlug,
        actionType: 'text',
        provider: 'gemini',
        payload: { prompt, systemPrompt },
      }),
    });

    const result = await response.json();

    if (result.ok) {
      return {
        ok: true,
        data: result.data as { text: string },
        credits: result.credits,
      };
    }

    return {
      ok: false,
      error: {
        code: result.error?.code || 'AI_ERROR',
        message: result.error?.message || 'AI generation failed',
      },
    };
  } catch (err) {
    return {
      ok: false,
      error: {
        code: 'NETWORK_ERROR',
        message: err instanceof Error ? err.message : 'Network error',
      },
    };
  }
}

/**
 * Check if error requires upgrade
 */
export function requiresUpgrade(error: AiGatewayError): boolean {
  return ['TRIAL_REQUIRED', 'TRIAL_EXPIRED', 'CREDITS_EXHAUSTED'].includes(error.code);
}

/**
 * Get user-friendly error message
 */
export function getErrorMessage(error: AiGatewayError): string {
  switch (error.code) {
    case 'TRIAL_REQUIRED':
      return 'Start your free trial to use AI features (25 credits included).';
    case 'TRIAL_EXPIRED':
      return 'Your trial has expired. Subscribe to continue using AI.';
    case 'CREDITS_EXHAUSTED':
      return 'You\'ve used all your AI credits. Upgrade for more.';
    default:
      return error.message;
  }
}
