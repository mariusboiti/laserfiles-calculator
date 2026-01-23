/**
 * Gemini Generate API (alias)
 * Kept for compatibility with tools that expect /api/ai/gemini/generate
 */

export const runtime = 'nodejs';
export { GET, POST } from '../../sign-generate/route';
