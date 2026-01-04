/**
 * Server-only Gemini AI helper
 * DO NOT import this file in client-side code
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

let genAI: GoogleGenerativeAI | null = null;

/**
 * Get Gemini API key from environment
 * Throws clear error if not configured
 */
function getApiKey(): string {
  const key = process.env.GEMINI_API_KEY || process.env.AI_API_KEY;
  
  if (!key) {
    throw new Error(
      'GEMINI_API_KEY not configured. ' +
      'Set GEMINI_API_KEY in .env.local for development or environment variables for production.'
    );
  }
  
  return key;
}

/**
 * Get model name from environment with fallback
 */
function getModelName(): string {
  return process.env.GEMINI_MODEL || 'gemini-1.5-flash';
}

/**
 * Get or create Gemini client instance (singleton)
 */
function getClient(): GoogleGenerativeAI {
  if (!genAI) {
    genAI = new GoogleGenerativeAI(getApiKey());
  }
  return genAI;
}

/**
 * Get Gemini generative model for content generation
 */
export function getGeminiModel() {
  const client = getClient();
  const modelName = getModelName();
  
  return client.getGenerativeModel({
    model: modelName,
    generationConfig: {
      responseMimeType: 'text/plain',
      temperature: 0.7,
      maxOutputTokens: 2048,
    },
  });
}

/**
 * Check if Gemini is configured
 */
export function isGeminiConfigured(): boolean {
  try {
    getApiKey();
    return true;
  } catch {
    return false;
  }
}

/**
 * Get configuration status for diagnostics
 */
export function getGeminiStatus(): { configured: boolean; model: string; message?: string } {
  try {
    getApiKey();
    return {
      configured: true,
      model: getModelName(),
    };
  } catch (e) {
    return {
      configured: false,
      model: getModelName(),
      message: e instanceof Error ? e.message : 'Gemini not configured',
    };
  }
}
