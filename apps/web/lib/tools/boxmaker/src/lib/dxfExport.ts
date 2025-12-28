import type { GeneratedLayout, ImportedItem, PathOperation } from './types'

type Point = { x: number; y: number }

function opToLayer(op: PathOperation): { layer: string; color: number } {
  if (op === 'cut') return { layer: 'CUT', color: 1 }
  if (op === 'score') return { layer: 'SCORE', color: 5 }
  return { layer: 'ENGRAVE', color: 7 }
}

function splitSvgPathByMove(d: string): string[] {
  const tokens: string[] = []
  const re = /([A-Za-z])|(-?\d*\.?\d+(?:e[-+]?\d+)?)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(d)) !== null) {
    tokens.push(m[1] ?? m[2])
  }

  const isCmd = (t: string) => /^[A-Za-z]$/.test(t)

  const parts: string[] = []
  let current: string[] = []
  let sawMove = false

  for (let i = 0; i < tokens.length; i += 1) {
    const t = tokens[i]
    if (isCmd(t) && (t === 'M' || t === 'm')) {
      if (sawMove && current.length > 0) {
        parts.push(current.join(' '))
        current = []
      }
      sawMove = true
    }
    current.push(t)
  }

  if (current.length > 0) parts.push(current.join(' '))
  return parts.filter((x) => x.trim().length > 0)
}

function samplePathPoints(d: string, stepMm: number): { points: Point[]; closed: boolean } {
  if (typeof document === 'undefined') return { points: [], closed: false }

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  svg.setAttribute('width', '0')
  svg.setAttribute('height', '0')
  svg.style.position = 'absolute'
  svg.style.left = '-100000px'
  svg.style.top = '-100000px'
  svg.style.visibility = 'hidden'

  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  path.setAttribute('d', d)
  svg.appendChild(path)
  document.body.appendChild(svg)

  try {
    const total = path.getTotalLength()
    if (!Number.isFinite(total) || total <= 0) return { points: [], closed: false }

    const steps = Math.max(2, Math.ceil(total / Math.max(stepMm, 0.25)) + 1)
    const points: Point[] = []
    for (let i = 0; i < steps; i += 1) {
      const t = (i / (steps - 1)) * total
      const pt = path.getPointAtLength(t)
      points.push({ x: pt.x, y: pt.y })
    }

    const hasClose = /[Zz]\s*$/.test(d.trim()) || /[Zz]/.test(d)
    const first = points[0]
    const last = points[points.length - 1]
    const dx = last.x - first.x
    const dy = last.y - first.y
    const dist2 = dx * dx + dy * dy
    const closed = hasClose || dist2 < 1e-6

    if (closed && points.length > 1) {
      points[points.length - 1] = { x: first.x, y: first.y }
    }

    return { points, closed }
  } catch {
    return { points: [], closed: false }
  } finally {
    try {
      document.body.removeChild(svg)
    } catch {
      // ignore
    }
  }
}

function writeText(parts: string[], layer: string, x: number, y: number, height: number, text: string) {
  pushGroup(parts, 0, 'TEXT')
  pushGroup(parts, 8, layer)
  pushGroup(parts, 10, x)
  pushGroup(parts, 20, y)
  pushGroup(parts, 40, height)
  pushGroup(parts, 1, text)
}

function pushGroup(parts: string[], code: number | string, value: number | string) {
  parts.push(String(code))
  parts.push(String(value))
}

function layerTableEntry(name: string, color: number): string[] {
  const p: string[] = []
  pushGroup(p, 0, 'LAYER')
  pushGroup(p, 2, name)
  pushGroup(p, 70, 0)
  pushGroup(p, 62, color)
  pushGroup(p, 6, 'CONTINUOUS')
  return p
}

function writeLwPolyline(parts: string[], layer: string, points: Point[], closed: boolean) {
  pushGroup(parts, 0, 'LWPOLYLINE')
  pushGroup(parts, 8, layer)
  pushGroup(parts, 90, points.length)
  pushGroup(parts, 70, closed ? 1 : 0)

  for (const pt of points) {
    pushGroup(parts, 10, pt.x)
    pushGroup(parts, 20, pt.y)
  }
}

export function generateBoxDxf(
  layout: GeneratedLayout | null,
  importedItems: ImportedItem[] = [],
  options: { includeLabels?: boolean } = {},
): string {
  const parts: string[] = []
  const includeLabels = Boolean(options.includeLabels)

  pushGroup(parts, 0, 'SECTION')
  pushGroup(parts, 2, 'HEADER')
  pushGroup(parts, 0, 'ENDSEC')

  pushGroup(parts, 0, 'SECTION')
  pushGroup(parts, 2, 'TABLES')

  pushGroup(parts, 0, 'TABLE')
  pushGroup(parts, 2, 'LAYER')
  pushGroup(parts, 70, includeLabels ? 4 : 3)

  for (const { layer, color } of [opToLayer('cut'), opToLayer('score'), opToLayer('engrave')]) {
    parts.push(...layerTableEntry(layer, color))
  }

  if (includeLabels) {
    parts.push(...layerTableEntry('LABELS', 7))
  }

  pushGroup(parts, 0, 'ENDTAB')
  pushGroup(parts, 0, 'ENDSEC')

  pushGroup(parts, 0, 'SECTION')
  pushGroup(parts, 2, 'ENTITIES')

  if (layout) {
    const H = Math.max(layout.layoutHeight, 0)
    const stepMm = 0.5

    for (const placed of layout.placedFaces) {
      if (placed.overflow) continue

      const ox = placed.face.offset?.x ?? 0
      const oy = placed.face.offset?.y ?? 0

      for (const p of placed.face.paths) {
        const { layer } = opToLayer(p.op)
        const subDs = splitSvgPathByMove(p.d)

        for (const subD of subDs) {
          const sampled = samplePathPoints(subD, stepMm)
          const pts: Point[] = sampled.points.map((pt) => {
            const x = placed.x + ox + pt.x
            const ySvg = placed.y + oy + pt.y
            const y = H - ySvg
            return { x, y }
          })

          if (pts.length >= 2) writeLwPolyline(parts, layer, pts, sampled.closed)
        }
      }

      const itemsForFace = importedItems.filter((it) => it.placement.faceId === placed.face.id)
      for (const item of itemsForFace) {
        const place = item.placement
        const a = place.rotation
        const cos = Math.cos(a)
        const sin = Math.sin(a)
        const s = Math.max(place.scale, 0.01)

        const w = item.face.width
        const h = item.face.height
        const iox = item.face.offset?.x ?? 0
        const ioy = item.face.offset?.y ?? 0

        for (const ip of item.face.paths) {
          const { layer } = opToLayer(ip.op)
          const subDs = splitSvgPathByMove(ip.d)

          for (const subD of subDs) {
            const sampled = samplePathPoints(subD, stepMm)
            const pts: Point[] = sampled.points.map((pt) => {
              const nx = pt.x + iox
              const ny = pt.y + ioy

              let x = nx - w / 2
              let y = ny - h / 2

              x *= s
              y *= s

              const rx = x * cos - y * sin
              const ry = x * sin + y * cos

              const fx = place.x + rx
              const fy = place.y + ry

              const xAbs = placed.x + ox + fx
              const ySvg = placed.y + oy + fy
              const yAbs = H - ySvg
              return { x: xAbs, y: yAbs }
            })

            if (pts.length >= 2) writeLwPolyline(parts, layer, pts, sampled.closed)
          }
        }
      }

      if (includeLabels) {
        const faceCx = placed.x + ox + placed.face.width / 2
        const faceCySvg = placed.y + oy + placed.face.height / 2
        const faceCy = H - faceCySvg
        writeText(parts, 'LABELS', faceCx, faceCy, 4, placed.face.name)

        for (const item of itemsForFace) {
          const xAbs = placed.x + ox + item.placement.x
          const ySvg = placed.y + oy + item.placement.y
          const yAbs = H - ySvg
          writeText(parts, 'LABELS', xAbs, yAbs, 3, item.fileName)
        }
      }
    }
  }

  pushGroup(parts, 0, 'ENDSEC')
  pushGroup(parts, 0, 'EOF')

  return parts.join('\n')
}
