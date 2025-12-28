import type { GeneratedFace, GeneratedLayout, LayoutOptions, PlacedFace } from './types'

function computeAutoSheetWidth(faces: GeneratedFace[]): number {
  if (faces.length === 0) return 100
  const totalArea = faces.reduce((sum, f) => sum + f.width * f.height, 0)
  const approxSide = Math.sqrt(totalArea)
  return approxSide * 1.5
}

/**
 * Simple left-to-right, top-to-bottom flow layout.
 * If arrangeOnSheet is disabled, we still use a virtual sheet width
 * to keep parts in a readable grid.
 */
export function generateLayout(faces: GeneratedFace[], options: LayoutOptions): GeneratedLayout {
  const placedFaces: PlacedFace[] = []
  const warnings: string[] = []

  if (faces.length === 0) {
    return {
      faces,
      placedFaces: [],
      layoutWidth: 100,
      layoutHeight: 100,
      warnings,
    }
  }

  const spacing = Math.max(options.spacing, 0)

  const virtualSheetWidth = options.arrangeOnSheet ? options.sheetWidth : computeAutoSheetWidth(faces)
  const virtualSheetHeight = options.arrangeOnSheet ? options.sheetHeight : Number.POSITIVE_INFINITY

  const autoRotateParts = Boolean(options.autoRotateParts)

  let x = 0
  let y = 0
  let rowHeight = 0

  let maxRight = 0
  let maxBottom = 0

  const facesToPlace = [...faces].sort((a, b) => {
    const areaA = a.width * a.height
    const areaB = b.width * b.height
    if (areaB !== areaA) return areaB - areaA
    if (b.height !== a.height) return b.height - a.height
    return b.width - a.width
  })

  const choosePlacement = (face: GeneratedFace) => {
    const candidates: Array<{ rotation: 0 | 90; w: number; h: number }> = [{ rotation: 0, w: face.width, h: face.height }]
    if (autoRotateParts && Math.abs(face.width - face.height) > 1e-6) {
      candidates.push({ rotation: 90, w: face.height, h: face.width })
    }

    type CandidateResult = {
      rotation: 0 | 90
      w: number
      h: number
      px: number
      py: number
      wrapped: boolean
      nextRowHeight: number
      score: number
    }

    let best: CandidateResult | null = null

    for (const c of candidates) {
      if (options.arrangeOnSheet) {
        if (c.w > options.sheetWidth || c.h > options.sheetHeight) continue
      }

      let px = x
      let py = y
      let wrapped = false
      let nextRowHeight = rowHeight

      if (x > 0 && x + c.w > virtualSheetWidth) {
        px = 0
        py = y + rowHeight + spacing
        wrapped = true
        nextRowHeight = 0
      }

      if (py + c.h > virtualSheetHeight) continue

      nextRowHeight = Math.max(nextRowHeight, c.h)

      // Prefer staying on the current row, then prefer minimizing row height increase.
      const score = (wrapped ? 1_000_000 : 0) + nextRowHeight

      if (!best || score < best.score) {
        best = {
          rotation: c.rotation,
          w: c.w,
          h: c.h,
          px,
          py,
          wrapped,
          nextRowHeight,
          score,
        }
      }
    }

    return best
  }

  for (const face of facesToPlace) {
    const chosen = choosePlacement(face)

    if (!chosen) {
      placedFaces.push({ face, x: 0, y: 0, overflow: true })
      warnings.push(
        `Part "${face.name}" (${face.width.toFixed(1)} × ${face.height.toFixed(1)} mm) does not fit on the configured sheet size.`,
      )
      continue
    }

    if (chosen.wrapped) {
      x = 0
      y = chosen.py
      rowHeight = 0
    }

    placedFaces.push({ face, x: chosen.px, y: chosen.py, rotation: chosen.rotation })

    maxRight = Math.max(maxRight, chosen.px + chosen.w)
    maxBottom = Math.max(maxBottom, chosen.py + chosen.h)

    x = chosen.px + chosen.w + spacing
    rowHeight = chosen.nextRowHeight
  }

  const layoutWidth = Math.max(maxRight + spacing, 10)
  const layoutHeight = Math.max(maxBottom + spacing, 10)

  return {
    faces,
    placedFaces,
    layoutWidth,
    layoutHeight,
    warnings,
  }
}
