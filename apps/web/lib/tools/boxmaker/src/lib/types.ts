export type BoxType = 'finger_all_edges' | 'finger_vertical_edges'

export type LidType = 'none' | 'flat_lid' | 'flat_lid_with_lip' | 'sliding_lid'

export type DimensionReference = 'inside' | 'outside'

export type Vec2 = { x: number; y: number }

export type FaceName =
  | 'front'
  | 'back'
  | 'left'
  | 'right'
  | 'top'
  | 'bottom'
  | 'lid'
  | 'lid_inner'
  | 'lid_lip'
  | 'divider_x'
  | 'divider_z'
  | 'imported'

export interface BoxSettings {
  // Dimensions (mm)
  width: number
  height: number
  depth: number
  dimensionReference: DimensionReference

  // Material
  materialThickness: number
  kerf: number
  applyKerfCompensation: boolean

  // Box style
  boxType: BoxType

  // Finger joints
  fingerMin: number
  fingerMax: number
  autoFingerCount: boolean
  manualFingerCount: number | null

  // Lid options
  lidType: LidType
  grooveDepth: number
  grooveOffset: number
  lipInset: number
  lipHeight: number

  // Dividers
  dividersEnabled: boolean
  dividerCountX: number
  dividerCountZ: number
  dividerClearance: number

  // Layout / sheet
  arrangeOnSheet: boolean
  sheetWidth: number
  sheetHeight: number
  partSpacing: number
  autoRotateParts?: boolean
}

export interface BoxDimensions {
  innerWidth: number
  innerHeight: number
  innerDepth: number
  outerWidth: number
  outerHeight: number
  outerDepth: number
}

export interface GeneratedFace {
  id: string
  name: FaceName
  width: number
  height: number
  outlinePath: string
  vertices: Vec2[]
  paths: FacePath[]
  offset?: Vec2
  transform?: {
    x: number
    y: number
    rotation: number
    scale: number
  }
}

export type PathOperation = 'cut' | 'score' | 'engrave'

export type FacePath = {
  d: string
  op: PathOperation
}

export interface PlacedFace {
  face: GeneratedFace
  x: number
  y: number
  rotation?: 0 | 90
  overflow?: boolean
}

export type ImportedItemPlacement = {
  faceId: string | null
  x: number
  y: number
  rotation: number
  scale: number
}

export type ImportedItem = {
  id: string
  fileName: string
  op: PathOperation
  face: GeneratedFace
  placement: ImportedItemPlacement
}

export interface GeneratedLayout {
  faces: GeneratedFace[]
  placedFaces: PlacedFace[]
  layoutWidth: number
  layoutHeight: number
  warnings: string[]
}

export interface LayoutOptions {
  arrangeOnSheet: boolean
  sheetWidth: number
  sheetHeight: number
  spacing: number
  autoRotateParts?: boolean
}

export interface BoxGenerationResult {
  faces: GeneratedFace[]
  dimensions: BoxDimensions
  warnings: string[]
}

export type MaterialPreset = {
  id: string
  name: string
  materialThickness: number
  kerf: number
  notes?: string
}

export type LaserMachinePreset = {
  id: string
  name: string
  maxWidthMm: number
  maxHeightMm: number
  notes?: string
}

export type SavedPresetStore = {
  materials: MaterialPreset[]
  machines: LaserMachinePreset[]
}

export type BoxDesignSaved = {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  settings: BoxSettings
}

export type BoxMetrics = {
  totalCutLengthMm: number
  totalAreaMm2: number
}
