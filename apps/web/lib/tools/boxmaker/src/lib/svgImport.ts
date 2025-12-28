import type { FacePath, GeneratedFace, PathOperation, Vec2 } from './types'

function getAttrNumber(el: Element, name: string, fallback = 0): number {
  const raw = el.getAttribute(name)
  if (!raw) return fallback
  const n = Number.parseFloat(raw)
  return Number.isFinite(n) ? n : fallback
}

function rectToPath(el: Element): string {
  const x = getAttrNumber(el, 'x', 0)
  const y = getAttrNumber(el, 'y', 0)
  const w = getAttrNumber(el, 'width', 0)
  const h = getAttrNumber(el, 'height', 0)
  return `M ${x} ${y} H ${x + w} V ${y + h} H ${x} Z`
}

function lineToPath(el: Element): string {
  const x1 = getAttrNumber(el, 'x1', 0)
  const y1 = getAttrNumber(el, 'y1', 0)
  const x2 = getAttrNumber(el, 'x2', 0)
  const y2 = getAttrNumber(el, 'y2', 0)
  return `M ${x1} ${y1} L ${x2} ${y2}`
}

function pointsToPath(points: string, close: boolean): string {
  const cleaned = points.trim().replace(/\s+/g, ' ')
  if (!cleaned) return ''

  const nums = cleaned
    .split(/[,\s]/)
    .filter(Boolean)
    .map((s) => Number.parseFloat(s))
    .filter((n) => Number.isFinite(n))

  if (nums.length < 4) return ''

  const pts: Array<{ x: number; y: number }> = []
  for (let i = 0; i + 1 < nums.length; i += 2) {
    pts.push({ x: nums[i], y: nums[i + 1] })
  }

  if (pts.length === 0) return ''

  let d = `M ${pts[0].x} ${pts[0].y}`
  for (let i = 1; i < pts.length; i += 1) {
    d += ` L ${pts[i].x} ${pts[i].y}`
  }
  if (close) d += ' Z'
  return d
}

function computeBBoxFromPathDs(dList: string[]): { minX: number; minY: number; width: number; height: number } {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  svg.setAttribute('width', '0')
  svg.setAttribute('height', '0')
  svg.style.position = 'absolute'
  svg.style.left = '-100000px'
  svg.style.top = '-100000px'
  svg.style.visibility = 'hidden'

  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')
  svg.appendChild(g)
  document.body.appendChild(svg)

  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  for (const d of dList) {
    if (!d) continue
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    p.setAttribute('d', d)
    g.appendChild(p)

    try {
      const bb = p.getBBox()
      minX = Math.min(minX, bb.x)
      minY = Math.min(minY, bb.y)
      maxX = Math.max(maxX, bb.x + bb.width)
      maxY = Math.max(maxY, bb.y + bb.height)
    } catch {
      // ignore
    }
  }

  document.body.removeChild(svg)

  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
    return { minX: 0, minY: 0, width: 0, height: 0 }
  }

  return {
    minX,
    minY,
    width: Math.max(0, maxX - minX),
    height: Math.max(0, maxY - minY),
  }
}

export function importSvgAsFace(params: {
  svgText: string
  id: string
  op: PathOperation
  label?: string
}): GeneratedFace | null {
  const parser = new DOMParser()
  const doc = parser.parseFromString(params.svgText, 'image/svg+xml')
  const root = doc.documentElement

  const parseError = root?.nodeName?.toLowerCase() === 'parsererror'
  if (parseError) return null

  const dList: string[] = []

  root.querySelectorAll('path').forEach((el) => {
    const d = el.getAttribute('d')
    if (d) dList.push(d)
  })

  root.querySelectorAll('rect').forEach((el) => {
    dList.push(rectToPath(el))
  })

  root.querySelectorAll('line').forEach((el) => {
    dList.push(lineToPath(el))
  })

  root.querySelectorAll('polyline').forEach((el) => {
    const pts = el.getAttribute('points')
    if (!pts) return
    const d = pointsToPath(pts, false)
    if (d) dList.push(d)
  })

  root.querySelectorAll('polygon').forEach((el) => {
    const pts = el.getAttribute('points')
    if (!pts) return
    const d = pointsToPath(pts, true)
    if (d) dList.push(d)
  })

  const bbox = computeBBoxFromPathDs(dList)
  const width = Math.max(bbox.width, 0)
  const height = Math.max(bbox.height, 0)

  if (width <= 0 || height <= 0 || dList.length === 0) return null

  const offset: Vec2 = { x: -bbox.minX, y: -bbox.minY }
  const paths: FacePath[] = dList.filter(Boolean).map((d) => ({ d, op: params.op }))

  return {
    id: params.id,
    name: 'imported',
    width,
    height,
    outlinePath: '',
    vertices: [],
    paths,
    offset,
  }
}
