import type { BoxSettings } from './types'

export const DEFAULT_MATERIAL_THICKNESS = 3
export const DEFAULT_KERF = 0.15
export const DEFAULT_MIN_FINGER = 6
export const DEFAULT_MAX_FINGER = 15

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  if (value < min) return min
  if (value > max) return max
  return value
}

function defaultKerfForThickness(thickness: number): number {
  const t = Math.round(thickness * 10) / 10
  if (t <= 2) return 0.12
  if (t <= 3) return 0.15
  if (t <= 4) return 0.2
  return 0.25
}

export function applySimpleDefaults(
  settings: BoxSettings,
  options?: { preserveDimensionReference?: boolean },
): BoxSettings {
  const thickness = clampNumber(settings.materialThickness, 0.5, 30)

  const preserveDimensionReference = Boolean(options?.preserveDimensionReference)

  const rawInsideWidth = settings.dimensionReference === 'outside' ? settings.width - 2 * thickness : settings.width
  const rawInsideHeight = settings.dimensionReference === 'outside' ? settings.height - 2 * thickness : settings.height
  const rawInsideDepth = settings.dimensionReference === 'outside' ? settings.depth - 2 * thickness : settings.depth

  const width = clampNumber(preserveDimensionReference ? settings.width : rawInsideWidth, 20, 1000)
  const height = clampNumber(preserveDimensionReference ? settings.height : rawInsideHeight, 20, 1000)
  const depth = clampNumber(preserveDimensionReference ? settings.depth : rawInsideDepth, 20, 1000)

  const looksUntouchedKerf = !settings.applyKerfCompensation && Math.abs(settings.kerf - 0.1) < 1e-6
  const kerf = looksUntouchedKerf ? defaultKerfForThickness(thickness) : clampNumber(settings.kerf, 0, 1)

  const fingerMin = settings.fingerMin > 0 ? settings.fingerMin : DEFAULT_MIN_FINGER
  const fingerMax = settings.fingerMax > 0 ? settings.fingerMax : DEFAULT_MAX_FINGER

  const grooveDepth = settings.grooveDepth > 0 ? settings.grooveDepth : thickness
  const grooveOffset = settings.grooveOffset > 0 ? settings.grooveOffset : thickness

  const sheetWidth = settings.sheetWidth > 0 ? settings.sheetWidth : 300
  const sheetHeight = settings.sheetHeight > 0 ? settings.sheetHeight : 200
  const partSpacing = settings.partSpacing >= 0 ? settings.partSpacing : 3

  return {
    ...settings,
    dimensionReference: preserveDimensionReference ? settings.dimensionReference : 'inside',
    width,
    height,
    depth,
    materialThickness: thickness,
    kerf,
    applyKerfCompensation: true,
    fingerMin,
    fingerMax,
    grooveDepth,
    grooveOffset,
    sheetWidth,
    sheetHeight,
    partSpacing,
  }
}
