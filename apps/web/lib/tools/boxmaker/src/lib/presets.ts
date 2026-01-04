import type { LaserMachinePreset, MaterialPreset } from './types'

export const DEFAULT_MATERIAL_PRESETS: MaterialPreset[] = [
  { id: 'plywood3-glowforge', name: 'Plywood 3mm – Glowforge', materialThickness: 3, kerf: 0.15 },
  { id: 'plywood4-k40', name: 'Plywood 4mm – K40', materialThickness: 4, kerf: 0.2 },
  { id: 'acrylic3-xtool', name: 'Clear Acrylic 3mm – xTool', materialThickness: 3, kerf: 0.12 },
]

export const DEFAULT_MACHINE_PRESETS: LaserMachinePreset[] = [
  { id: 'glowforge-basic', name: 'Glowforge Basic', maxWidthMm: 495, maxHeightMm: 279 },
  { id: 'xtool-d1', name: 'xTool D1', maxWidthMm: 430, maxHeightMm: 400 },
]
