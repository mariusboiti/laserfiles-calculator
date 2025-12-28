import type { BoxMetrics, GeneratedLayout } from './types'

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

export function computeBoxMetrics(layout: GeneratedLayout): BoxMetrics {
  const faces = layout.faces ?? []

  let totalAreaMm2 = 0
  let totalCutLengthMm = 0

  for (const face of faces) {
    const w = Number.isFinite(face.width) ? face.width : 0
    const h = Number.isFinite(face.height) ? face.height : 0

    totalAreaMm2 += Math.max(0, w) * Math.max(0, h)
    totalCutLengthMm += 2 * (Math.max(0, w) + Math.max(0, h))
  }

  return {
    totalCutLengthMm: round2(totalCutLengthMm),
    totalAreaMm2: round2(totalAreaMm2),
  }
}
