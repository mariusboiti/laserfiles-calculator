/**
 * Personalised Sign Generator V3 - Template Gallery
 */

import type { SignTemplate, SignConfigV3 } from '../types/signV3';
import { DEFAULTS_V3 } from '../config/defaultsV3';

export const SIGN_TEMPLATES: SignTemplate[] = [];

export function getTemplateById(id: string): SignTemplate | null {
  return SIGN_TEMPLATES.find((t) => t.id === id) || null;
}

export function getTemplatesByCategory(category: SignTemplate['category']): SignTemplate[] {
  return SIGN_TEMPLATES.filter((t) => t.category === category);
}

export function applyTemplate(templateId: string, currentConfig: SignConfigV3): SignConfigV3 {
  const template = getTemplateById(templateId);
  if (!template) return currentConfig;

  return {
    ...currentConfig,
    ...template.config,
    templateId: template.id,
    text: template.config.text ? { ...currentConfig.text, ...template.config.text } : currentConfig.text,
    holes: template.config.holes ? { ...currentConfig.holes, ...template.config.holes } : currentConfig.holes,
    icon: template.config.icon ? { ...currentConfig.icon, ...template.config.icon } : currentConfig.icon,
    monogram: template.config.monogram ? { ...currentConfig.monogram, ...template.config.monogram } : currentConfig.monogram,
  };
}

export function resetToDefaults(): SignConfigV3 {
  return { ...DEFAULTS_V3 };
}
