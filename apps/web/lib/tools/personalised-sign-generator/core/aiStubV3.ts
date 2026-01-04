/**
 * Personalised Sign Generator V3 - AI Stub
 * Local heuristics-based sign configuration generator
 * Can be wired to external AI endpoint later
 */

import type { SignConfigV3, AISignRequest, AISignResult, SignShapeV3 } from '../types/signV3';
import { DEFAULTS_V3 } from '../config/defaultsV3';

interface ParsedIntent {
  keywords: string[];
  names: string[];
  numbers: string[];
  style: 'formal' | 'casual' | 'modern' | 'classic';
  hasDate: boolean;
  category: 'family' | 'workshop' | 'welcome' | 'address' | 'pet' | 'wedding' | 'custom';
}

const KEYWORD_MAP: Record<string, Partial<SignConfigV3>> = {
  workshop: { shape: 'rounded-rect', icon: { ...DEFAULTS_V3.icon, id: 'gear' } },
  garage: { shape: 'rounded-rect', icon: { ...DEFAULTS_V3.icon, id: 'wrench' } },
  family: { shape: 'rounded-rect' },
  welcome: { shape: 'arch', icon: { ...DEFAULTS_V3.icon, id: 'home' } },
  home: { shape: 'rounded-rect', icon: { ...DEFAULTS_V3.icon, id: 'home' } },
  address: { shape: 'plaque' },
  number: { shape: 'plaque' },
  pet: { shape: 'tag', icon: { ...DEFAULTS_V3.icon, id: 'paw' } },
  dog: { shape: 'tag', icon: { ...DEFAULTS_V3.icon, id: 'paw' } },
  cat: { shape: 'tag', icon: { ...DEFAULTS_V3.icon, id: 'paw' } },
  wedding: { shape: 'rounded-arch', icon: { ...DEFAULTS_V3.icon, id: 'heart' } },
  love: { icon: { ...DEFAULTS_V3.icon, id: 'heart' } },
  nature: { icon: { ...DEFAULTS_V3.icon, id: 'tree' } },
  garden: { shape: 'arch', icon: { ...DEFAULTS_V3.icon, id: 'flower' } },
  beach: { icon: { ...DEFAULTS_V3.icon, id: 'anchor' } },
  maker: { shape: 'hex', icon: { ...DEFAULTS_V3.icon, id: 'gear' } },
  studio: { shape: 'hex' },
  modern: { shape: 'stadium' },
  classic: { shape: 'plaque' },
  royal: { shape: 'shield', icon: { ...DEFAULTS_V3.icon, id: 'crown' } },
  badge: { shape: 'shield' },
  round: { shape: 'circle' },
  circle: { shape: 'circle' },
  curved: { text: { ...DEFAULTS_V3.text, curvedModeLine2: 'arcUp', curvedIntensity: 30 } },
  arch: { shape: 'arch' },
  hexagon: { shape: 'hex' },
  oval: { shape: 'oval' },
};

const SHAPE_KEYWORDS: Record<SignShapeV3, string[]> = {
  'rectangle': ['rectangle', 'square', 'simple', 'basic'],
  'rounded-rect': ['rounded', 'soft', 'family', 'workshop'],
  'arch': ['arch', 'arched', 'welcome', 'garden'],
  'rounded-arch': ['wedding', 'elegant', 'fancy'],
  'circle': ['circle', 'round', 'monogram'],
  'oval': ['oval', 'ellipse'],
  'hex': ['hex', 'hexagon', 'modern', 'maker', 'studio'],
  'stadium': ['stadium', 'capsule', 'pill', 'modern', 'minimal'],
  'shield': ['shield', 'badge', 'crest', 'royal', 'heraldic'],
  'tag': ['tag', 'label', 'pet', 'name'],
  'plaque': ['plaque', 'address', 'classic', 'traditional'],
  'ornate-01': ['ornate', 'decorative', 'elegant', 'vintage'],
  'ornate-02': ['ornate', 'decorative', 'elegant', 'vintage'],
  'ornate-03': ['ornate', 'decorative', 'elegant', 'vintage'],
  'ornate-04': ['ornate', 'decorative', 'elegant', 'vintage'],
  'ornate-05': ['ornate', 'decorative', 'elegant', 'vintage'],
  'ornate-06': ['ornate', 'decorative', 'elegant', 'vintage'],
  'ornate-07': ['ornate', 'decorative', 'elegant', 'vintage'],
  'ornate-08': ['ornate', 'decorative', 'elegant', 'vintage'],
  'ornate-09': ['ornate', 'decorative', 'elegant', 'vintage'],
  'ornate-10': ['ornate', 'decorative', 'elegant', 'vintage'],
  'ornate-11': ['ornate', 'decorative', 'elegant', 'vintage'],
  'ornate-12': ['ornate', 'decorative', 'elegant', 'vintage'],
  'ornate-13': ['ornate', 'decorative', 'elegant', 'vintage'],
  'ornate-14': ['ornate', 'decorative', 'elegant', 'vintage'],
  'ornate-15': ['ornate', 'decorative', 'elegant', 'vintage'],
  'ornate-16': ['ornate', 'decorative', 'elegant', 'vintage'],
};

export async function generateSignFromPrompt(request: AISignRequest): Promise<AISignResult> {
  const { prompt } = request;
  const intent = parseIntent(prompt);
  const config = buildConfigFromIntent(intent, prompt);

  return {
    config,
    confidence: calculateConfidence(intent),
    explanation: generateExplanation(intent, config),
  };
}

function parseIntent(prompt: string): ParsedIntent {
  const lower = prompt.toLowerCase();
  const words = lower.split(/\s+/);

  const keywords = Object.keys(KEYWORD_MAP).filter((kw) => lower.includes(kw));

  const namePattern = /(?:for|named?|called?|family|the)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi;
  const names: string[] = [];
  let match;
  while ((match = namePattern.exec(prompt)) !== null) {
    names.push(match[1].trim());
  }

  const numberPattern = /\b(\d{1,5})\b/g;
  const numbers: string[] = [];
  while ((match = numberPattern.exec(prompt)) !== null) {
    numbers.push(match[1]);
  }

  let style: ParsedIntent['style'] = 'casual';
  if (lower.includes('modern') || lower.includes('minimal')) style = 'modern';
  else if (lower.includes('classic') || lower.includes('traditional')) style = 'classic';
  else if (lower.includes('formal') || lower.includes('elegant')) style = 'formal';

  const hasDate = /\b(est\.?|since|established|\d{4})\b/i.test(prompt);

  let category: ParsedIntent['category'] = 'custom';
  if (keywords.includes('family') || names.length > 0) category = 'family';
  else if (keywords.includes('workshop') || keywords.includes('garage')) category = 'workshop';
  else if (keywords.includes('welcome') || keywords.includes('home')) category = 'welcome';
  else if (keywords.includes('address') || numbers.length > 0) category = 'address';
  else if (keywords.includes('pet') || keywords.includes('dog') || keywords.includes('cat')) category = 'pet';
  else if (keywords.includes('wedding') || keywords.includes('love')) category = 'wedding';

  return { keywords, names, numbers, style, hasDate, category };
}

function buildConfigFromIntent(intent: ParsedIntent, prompt: string): Partial<SignConfigV3> {
  let config: Partial<SignConfigV3> = {};

  for (const kw of intent.keywords) {
    if (KEYWORD_MAP[kw]) {
      config = { ...config, ...KEYWORD_MAP[kw] };
    }
  }

  if (!config.shape) {
    config.shape = inferShapeFromCategory(intent.category);
  }

  const textConfig = { ...DEFAULTS_V3.text };

  if (intent.names.length > 0) {
    textConfig.line2 = { ...textConfig.line2, text: intent.names[0].toUpperCase() };
    if (intent.category === 'family') {
      textConfig.line1 = { ...textConfig.line1, text: 'THE' };
      textConfig.line3 = { ...textConfig.line3, text: 'FAMILY' };
    }
  }

  if (intent.numbers.length > 0 && intent.category === 'address') {
    textConfig.line2 = { ...textConfig.line2, text: intent.numbers[0] };
    textConfig.line3 = { ...textConfig.line3, text: '' };
  }

  if (intent.hasDate) {
    const yearMatch = prompt.match(/\b(19|20)\d{2}\b/);
    if (yearMatch) {
      textConfig.line3 = { ...textConfig.line3, text: `EST. ${yearMatch[0]}` };
    }
  }

  if (intent.style === 'modern') {
    textConfig.line2.weight = '600';
  } else if (intent.style === 'formal') {
    textConfig.line2.weight = '700';
  }

  config.text = textConfig;

  if (intent.category === 'welcome' || intent.category === 'wedding') {
    config.text = {
      ...config.text,
      curvedModeLine2: 'arcUp',
      curvedIntensity: 25,
    };
  }

  return config;
}

function inferShapeFromCategory(category: ParsedIntent['category']): SignShapeV3 {
  switch (category) {
    case 'family': return 'rounded-rect';
    case 'workshop': return 'rounded-rect';
    case 'welcome': return 'arch';
    case 'address': return 'plaque';
    case 'pet': return 'tag';
    case 'wedding': return 'rounded-arch';
    default: return 'rounded-rect';
  }
}

function calculateConfidence(intent: ParsedIntent): number {
  let confidence = 0.5;

  if (intent.keywords.length > 0) confidence += 0.1 * Math.min(intent.keywords.length, 3);
  if (intent.names.length > 0) confidence += 0.15;
  if (intent.numbers.length > 0 && intent.category === 'address') confidence += 0.1;
  if (intent.hasDate) confidence += 0.05;
  if (intent.category !== 'custom') confidence += 0.1;

  return Math.min(confidence, 0.95);
}

function generateExplanation(intent: ParsedIntent, config: Partial<SignConfigV3>): string {
  const parts: string[] = [];

  if (config.shape) {
    parts.push(`Using ${config.shape} shape`);
  }

  if (intent.category !== 'custom') {
    parts.push(`detected ${intent.category} category`);
  }

  if (intent.names.length > 0) {
    parts.push(`found name: ${intent.names[0]}`);
  }

  if (config.icon?.id) {
    parts.push(`added ${config.icon.id} icon`);
  }

  if (config.text?.curvedModeLine2 !== 'straight') {
    parts.push('applied curved text');
  }

  return parts.length > 0 ? parts.join(', ') : 'Using default settings';
}

export function suggestTemplateFromPrompt(prompt: string): string | null {
  return null;
}
