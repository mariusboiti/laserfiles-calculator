import type { Vec2 } from './types'

export type EdgeDirection = 'horizontal' | 'vertical'

export type EdgeSide = 'bottom' | 'top' | 'left' | 'right'

export type FingerSegment = {
  start: number
  end: number
  isTab: boolean
}

export type FingerPattern = {
  length: number
  segments: FingerSegment[]
  fingerWidth: number
}

export type EdgeBuildOptions = {
  pattern: FingerPattern
  materialThickness: number
  direction: EdgeDirection
  invertTabs: boolean
  outwardSign: 1 | -1
  startPoint: Vec2
}

export interface FingerEdgeOptions {
  length: number
  materialThickness: number
  kerf: number
  minFinger: number
  maxFinger: number
  inside: boolean
  invertPattern?: boolean
  fingerCountOverride?: number | null
}

export interface FingerEdgePath {
  path: string
  fingerCount: number
  fingerWidth: number
}

export function generateFingerPattern(length: number, minFinger: number, maxFinger: number): FingerPattern {
  // Basic safety
  const L = Math.max(length, 1)

  const target = (minFinger + maxFinger) / 2 // target finger width
  let n = Math.round(L / target) // number of segments

  // enforce at least 3 segments
  if (n < 3) n = 3

  // enforce odd number of segments (Tab-Gap-Tab-...-Tab)
  if (n % 2 === 0) n += 1

  // clamp width inside [minFinger, maxFinger] by adjusting n
  let w = L / n
  if (w < minFinger) {
    // segments too small → decrease n until within range or to 3
    while (n > 3 && w < minFinger) {
      n -= 2 // keep n odd
      w = L / n
    }
  } else if (w > maxFinger) {
    // segments too big → increase n
    while (w > maxFinger) {
      n += 2 // keep n odd
      w = L / n
    }
  }

  // Recompute final width after adjustments
  w = L / n

  const segments: FingerSegment[] = []
  for (let i = 0; i < n; i++) {
    const start = i * w
    const end = (i + 1) * w
    segments.push({
      start,
      end,
      isTab: i % 2 === 0, // start with TAB, alternate
    })
  }

  // Ensure last end is EXACTLY == length (within floating point tolerance)
  const last = segments[segments.length - 1]
  if (last) {
    last.end = L
  }

  return {
    length: L,
    segments,
    fingerWidth: w,
  }
}

export function buildEdgeVertices({
  pattern,
  materialThickness,
  direction,
  invertTabs,
  outwardSign,
  startPoint,
}: EdgeBuildOptions): Vec2[] {
  const pts: Vec2[] = []
  const sign = outwardSign === -1 ? -1 : 1

  let lastX = startPoint.x
  let lastY = startPoint.y
  pts.push({ x: lastX, y: lastY })

  pattern.segments.forEach((seg) => {
    const isTab = invertTabs ? !seg.isTab : seg.isTab

    if (direction === 'horizontal') {
      const nextX = startPoint.x + seg.end
      if (isTab) {
        pts.push({ x: lastX, y: lastY + sign * materialThickness })
        pts.push({ x: nextX, y: lastY + sign * materialThickness })
        pts.push({ x: nextX, y: lastY })
      } else {
        pts.push({ x: nextX, y: lastY })
      }
      lastX = nextX
    } else {
      const nextY = startPoint.y + seg.end
      if (isTab) {
        pts.push({ x: lastX + sign * materialThickness, y: lastY })
        pts.push({ x: lastX + sign * materialThickness, y: nextY })
        pts.push({ x: lastX, y: nextY })
      } else {
        pts.push({ x: lastX, y: nextY })
      }
      lastY = nextY
    }
  })

  return pts
}

/**
 * Choose a number of finger tabs so that the resulting finger width
 * (length / (2 * tabs)) lies as closely as possible between the
 * provided min/max bounds.
 */
export function calculateFingerCount(length: number, minFinger: number, maxFinger: number): number {
  const safeLength = Math.max(length, 1)
  const safeMin = Math.max(minFinger, 0.5)
  const safeMax = Math.max(maxFinger, safeMin)

  // Tabs must be at least 1. Each tab has one gap of similar width,
  // so the effective finger width is length / (2 * tabs).
  const maxTabs = Math.floor(safeLength / (2 * safeMin))
  const minTabs = Math.max(1, Math.ceil(safeLength / (2 * safeMax)))

  if (maxTabs <= 0) return 1

  let best = minTabs
  if (best > maxTabs) best = maxTabs

  return Math.max(1, best)
}

/**
 * Generate a relative SVG path fragment for a horizontal edge with
 * finger joints. The caller is expected to start at (0, 0) and append
 * the returned `path` to the main outline. The edge runs from left to
 * right and ends at (length, 0); tabs are extruded in the negative Y
 * direction ("outside" of the panel when using a top edge).
 */
export function generateFingerEdge(options: FingerEdgeOptions): FingerEdgePath {
  const length = Math.max(options.length, 1)
  const tabsOverride = options.fingerCountOverride ?? null

  const tabCount =
    tabsOverride && tabsOverride > 0
      ? Math.floor(tabsOverride)
      : calculateFingerCount(length, options.minFinger, options.maxFinger)

  const fingerCount = Math.max(1, tabCount)
  const cells = fingerCount * 2
  const cellWidth = length / cells
  const fingerWidth = cellWidth
  const tabHeight = Math.max(options.materialThickness, 0.1)

  let d = ''

  for (let i = 0; i < cells; i += 1) {
    const isTab = options.invertPattern ? i % 2 === 1 : i % 2 === 0

    if (isTab) {
      // Move outwards (negative Y), across, then back.
      d += ` l 0 ${(-tabHeight).toFixed(3)} l ${cellWidth.toFixed(3)} 0 l 0 ${tabHeight.toFixed(3)}`
    } else {
      // Simple straight segment.
      d += ` l ${cellWidth.toFixed(3)} 0`
    }
  }

  return {
    path: d.trim(),
    fingerCount,
    fingerWidth,
  }
}
