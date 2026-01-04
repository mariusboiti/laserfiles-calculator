import type { BoxSettings } from './types'

function base64UrlEncodeUtf8(input: string): string {
  const bytes = new TextEncoder().encode(input)
  let binary = ''
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i])
  }

  const base64 = btoa(binary)
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function base64UrlDecodeUtf8(input: string): string {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/')
  const padLength = (4 - (normalized.length % 4)) % 4
  const padded = normalized + '='.repeat(padLength)

  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }

  return new TextDecoder().decode(bytes)
}

function isBoxSettings(value: unknown): value is BoxSettings {
  if (!value || typeof value !== 'object') return false
  const s = value as Record<string, unknown>

  return (
    typeof s.width === 'number' &&
    typeof s.height === 'number' &&
    typeof s.depth === 'number' &&
    (s.dimensionReference === 'inside' || s.dimensionReference === 'outside') &&
    typeof s.materialThickness === 'number' &&
    typeof s.kerf === 'number' &&
    typeof s.applyKerfCompensation === 'boolean' &&
    (s.boxType === 'finger_all_edges' || s.boxType === 'finger_vertical_edges' || s.boxType === 'butt_simple') &&
    typeof s.fingerMin === 'number' &&
    typeof s.fingerMax === 'number' &&
    typeof s.autoFingerCount === 'boolean' &&
    (s.manualFingerCount === null || typeof s.manualFingerCount === 'number') &&
    (s.lidType === 'none' || s.lidType === 'flat_lid' || s.lidType === 'flat_lid_with_lip' || s.lidType === 'sliding_lid') &&
    typeof s.grooveDepth === 'number' &&
    typeof s.grooveOffset === 'number' &&
    typeof s.lipInset === 'number' &&
    typeof s.lipHeight === 'number' &&
    typeof s.dividersEnabled === 'boolean' &&
    typeof s.dividerCountX === 'number' &&
    typeof s.dividerCountZ === 'number' &&
    typeof s.dividerClearance === 'number' &&
    typeof s.arrangeOnSheet === 'boolean' &&
    typeof s.sheetWidth === 'number' &&
    typeof s.sheetHeight === 'number' &&
    typeof s.partSpacing === 'number' &&
    (s.autoRotateParts === undefined || typeof s.autoRotateParts === 'boolean')
  )
}

export function encodeSettingsToQuery(settings: BoxSettings): string {
  try {
    return base64UrlEncodeUtf8(JSON.stringify(settings))
  } catch {
    try {
      return encodeURIComponent(JSON.stringify(settings))
    } catch {
      return ''
    }
  }
}

export function decodeSettingsFromQuery(queryString: string): BoxSettings | null {
  try {
    const params = new URLSearchParams(queryString)
    const raw = params.get('config')
    if (!raw) return null

    // 1) Try plain JSON (when config is directly JSON or already decoded).
    try {
      const parsed = JSON.parse(raw) as unknown
      return isBoxSettings(parsed) ? parsed : null
    } catch {
      // continue
    }

    // 2) Try base64-url (default encoder in this app).
    try {
      const json = base64UrlDecodeUtf8(raw)
      const parsed = JSON.parse(json) as unknown
      return isBoxSettings(parsed) ? parsed : null
    } catch {
      // continue
    }

    // 3) Try URI-decoding and JSON.
    try {
      const decoded = decodeURIComponent(raw)
      const parsed = JSON.parse(decoded) as unknown
      return isBoxSettings(parsed) ? parsed : null
    } catch {
      return null
    }
  } catch {
    return null
  }
}
