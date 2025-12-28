import type { BoxDimensions, BoxSettings } from './types'

export function validateBoxSettings(settings: BoxSettings, dims: BoxDimensions): string[] {
  const warnings: string[] = []

  if (dims.innerWidth <= 0 || dims.innerHeight <= 0 || dims.innerDepth <= 0) {
    warnings.push('Internal dimensions are extremely small or negative. Check box size and material thickness.')
  }

  if (dims.innerHeight < settings.materialThickness * 2) {
    warnings.push('Box height is close to 2 × material thickness; walls may overlap.')
  }

  if (settings.materialThickness < 0.5 || settings.materialThickness > 30) {
    warnings.push('Material thickness is outside the typical 0.5–30 mm range.')
  }

  if (settings.kerf < 0 || settings.kerf > 0.5) {
    warnings.push('Kerf value is outside the typical 0–0.5 mm range.')
  }

  if (settings.fingerMin < 2) {
    warnings.push('Fingers smaller than 2 mm might be hard to cut cleanly.')
  }

  if (settings.arrangeOnSheet && (settings.sheetWidth <= 0 || settings.sheetHeight <= 0)) {
    warnings.push('Sheet dimensions must be positive to arrange parts on a sheet.')
  }

  if (settings.dividersEnabled && (settings.dividerCountX < 1 || settings.dividerCountZ < 1)) {
    warnings.push('Divider compartment counts must be at least 1.')
  }

  return warnings
}
