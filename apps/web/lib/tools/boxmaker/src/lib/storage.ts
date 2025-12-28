import type { BoxDesignSaved, LaserMachinePreset, MaterialPreset } from './types'
import { DEFAULT_MACHINE_PRESETS, DEFAULT_MATERIAL_PRESETS } from './presets'

const MATERIAL_PRESETS_KEY = 'boxmaker_material_presets_v1'
const MACHINE_PRESETS_KEY = 'boxmaker_machine_presets_v1'
const SAVED_BOXES_KEY = 'boxmaker_saved_boxes_v1'

function hasWindow(): boolean {
  return typeof window !== 'undefined'
}

type StorageReadResult =
  | { status: 'unavailable' }
  | { status: 'missing' }
  | { status: 'error' }
  | { status: 'ok'; value: unknown }

function readUnknownFromStorage(key: string): StorageReadResult {
  if (!hasWindow()) return { status: 'unavailable' }

  let raw: string | null
  try {
    raw = window.localStorage.getItem(key)
  } catch {
    return { status: 'error' }
  }

  if (!raw) return { status: 'missing' }

  try {
    return { status: 'ok', value: JSON.parse(raw) }
  } catch {
    return { status: 'error' }
  }
}

function safeWriteJson<T>(key: string, value: T): void {
  if (!hasWindow()) return

  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // ignore
  }
}

export function loadMaterialPresets(): MaterialPreset[] {
  const result = readUnknownFromStorage(MATERIAL_PRESETS_KEY)
  if (result.status === 'missing' || result.status === 'unavailable') return DEFAULT_MATERIAL_PRESETS
  if (result.status === 'error') return []
  if (!Array.isArray(result.value)) return []

  return result.value
    .filter((item) => item && typeof item === 'object')
    .map((item) => item as MaterialPreset)
    .filter((preset) => typeof preset.id === 'string' && typeof preset.name === 'string')
}

export function saveMaterialPresets(presets: MaterialPreset[]): void {
  safeWriteJson(MATERIAL_PRESETS_KEY, presets)
}

export function loadMachinePresets(): LaserMachinePreset[] {
  const result = readUnknownFromStorage(MACHINE_PRESETS_KEY)
  if (result.status === 'missing' || result.status === 'unavailable') return DEFAULT_MACHINE_PRESETS
  if (result.status === 'error') return []
  if (!Array.isArray(result.value)) return []

  return result.value
    .filter((item) => item && typeof item === 'object')
    .map((item) => item as LaserMachinePreset)
    .filter((preset) => typeof preset.id === 'string' && typeof preset.name === 'string')
}

export function saveMachinePresets(presets: LaserMachinePreset[]): void {
  safeWriteJson(MACHINE_PRESETS_KEY, presets)
}

export function loadSavedBoxes(): BoxDesignSaved[] {
  const result = readUnknownFromStorage(SAVED_BOXES_KEY)
  if (result.status !== 'ok') return []
  if (!Array.isArray(result.value)) return []

  return result.value
    .filter((item) => item && typeof item === 'object')
    .map((item) => item as BoxDesignSaved)
    .filter((box) => typeof box.id === 'string' && typeof box.name === 'string')
}

export function saveSavedBoxes(boxes: BoxDesignSaved[]): void {
  safeWriteJson(SAVED_BOXES_KEY, boxes)
}

export { MATERIAL_PRESETS_KEY, MACHINE_PRESETS_KEY, SAVED_BOXES_KEY }
