import type {
  BoxDimensions,
  BoxGenerationResult,
  BoxSettings,
  FacePath,
  FaceName,
  GeneratedFace,
  Vec2,
} from './types'
import type { FingerPattern } from './fingerJoint'
import { buildEdgeVertices, calculateFingerCount, generateFingerPattern } from './fingerJoint'

export type BoxOuterDimensions = {
  outerWidth: number
  outerHeight: number
  outerDepth: number
}

export type BoxSize = {
  outerWidth: number
  outerDepth: number
  outerHeight: number
  innerWidth: number
  innerDepth: number
  innerHeight: number
}

type BoxDimensionData = {
  outerWidth: number
  outerHeight: number
  outerDepth: number
  thickness: number
}

function computeDimensions(settings: BoxSettings): BoxDimensions {
  const t = Math.max(settings.materialThickness, 0.1)

  const heightPadding = settings.lidType === 'none' ? t : 2 * t

  const width = Math.max(settings.width, 1)
  const height = Math.max(settings.height, 1)
  const depth = Math.max(settings.depth, 1)

  let innerWidth: number
  let innerHeight: number
  let innerDepth: number
  let outerWidth: number
  let outerHeight: number
  let outerDepth: number

  if (settings.dimensionReference === 'outside') {
    outerWidth = width
    outerHeight = height
    outerDepth = depth
    innerWidth = Math.max(outerWidth - 2 * t, 0.1)
    innerHeight = Math.max(outerHeight - heightPadding, 0.1)
    innerDepth = Math.max(outerDepth - 2 * t, 0.1)
  } else {
    innerWidth = width
    innerHeight = height
    innerDepth = depth
    outerWidth = innerWidth + 2 * t
    outerHeight = innerHeight + heightPadding
    outerDepth = innerDepth + 2 * t
  }

  return {
    innerWidth,
    innerHeight,
    innerDepth,
    outerWidth,
    outerHeight,
    outerDepth,
  }
}

export function getBoxOuterDimensions(settings: BoxSettings): BoxOuterDimensions {
  const dims = computeDimensions(settings)
  return {
    outerWidth: dims.outerWidth,
    outerHeight: dims.outerHeight,
    outerDepth: dims.outerDepth,
  }
}

export function getBoxSize(settings: BoxSettings): BoxSize {
  const dims = computeDimensions(settings)
  return {
    outerWidth: dims.outerWidth,
    outerDepth: dims.outerDepth,
    outerHeight: dims.outerHeight,
    innerWidth: dims.innerWidth,
    innerDepth: dims.innerDepth,
    innerHeight: dims.innerHeight,
  }
}

export function getBoxDimensionData(settings: BoxSettings): BoxDimensionData {
  const dims = computeDimensions(settings)
  const thickness = Math.max(settings.materialThickness, 0.1)
  return {
    outerWidth: dims.outerWidth,
    outerHeight: dims.outerHeight,
    outerDepth: dims.outerDepth,
    thickness,
  }
}

export type BoxFingerPatterns = {
  width: FingerPattern
  depth: FingerPattern
  height: FingerPattern
}

export function getBoxFingerPatterns(settings: BoxSettings): BoxFingerPatterns {
  const { innerWidth, innerDepth, innerHeight } = getBoxSize(settings)
  const minFinger = settings.fingerMin
  const maxFinger = settings.fingerMax

  return {
    width: generateFingerPattern(innerWidth, minFinger, maxFinger),
    depth: generateFingerPattern(innerDepth, minFinger, maxFinger),
    height: generateFingerPattern(innerHeight, minFinger, maxFinger),
  }
}

function cloneFace(source: GeneratedFace, name: FaceName, idSuffix: string): GeneratedFace {
  return {
    id: `${name}-${idSuffix}`,
    name,
    width: source.width,
    height: source.height,
    outlinePath: source.outlinePath,
    vertices: source.vertices.map((p) => ({ x: p.x, y: p.y })),
    paths: source.paths.map((p) => ({ d: p.d, op: p.op })),
  }
}

function buildRectFaceVertices(params: {
  width: number
  height: number
  thickness: number
  horizPattern: FingerPattern
  vertPattern: FingerPattern
  useFingers: { bottom: boolean; right: boolean; top: boolean; left: boolean }
  invertTabs: { bottom: boolean; right: boolean; top: boolean; left: boolean }
  outwardSign?: { bottom: 1 | -1; right: 1 | -1; top: 1 | -1; left: 1 | -1 }
  skipCornerNotches?: boolean
}): { vertices: Vec2[]; faceWidth: number; faceHeight: number } {
  const { width, height, thickness: t, horizPattern, vertPattern, useFingers, invertTabs } = params

  const outwardSign =
    params.outwardSign ??
    ({
      bottom: -1,
      right: 1,
      top: 1,
      left: -1,
    } satisfies { bottom: 1 | -1; right: 1 | -1; top: 1 | -1; left: 1 | -1 })

  const x0 = useFingers.left ? t : 0
  const y0 = useFingers.bottom ? t : 0

  const bottomIsTab =
    useFingers.bottom && horizPattern.segments.length > 0
      ? invertTabs.bottom
        ? !horizPattern.segments[0].isTab
        : horizPattern.segments[0].isTab
      : false
  const topIsTab =
    useFingers.top && horizPattern.segments.length > 0
      ? invertTabs.top
        ? !horizPattern.segments[0].isTab
        : horizPattern.segments[0].isTab
      : false
  const leftIsTab =
    useFingers.left && vertPattern.segments.length > 0
      ? invertTabs.left
        ? !vertPattern.segments[0].isTab
        : vertPattern.segments[0].isTab
      : false
  const rightIsTab =
    useFingers.right && vertPattern.segments.length > 0
      ? invertTabs.right
        ? !vertPattern.segments[0].isTab
        : vertPattern.segments[0].isTab
      : false

  const outerBottomY = y0 + outwardSign.bottom * t
  const outerTopY = y0 + height + outwardSign.top * t
  const outerLeftX = x0 + outwardSign.left * t
  const outerRightX = x0 + width + outwardSign.right * t

  const faceWidth = width + (useFingers.left ? t : 0) + (useFingers.right ? t : 0)
  const faceHeight = height + (useFingers.bottom ? t : 0) + (useFingers.top ? t : 0)

  const verts: Vec2[] = []

  const pushPoints = (points: Vec2[]) => {
    for (const p of points) {
      const last = verts.length > 0 ? verts[verts.length - 1] : null
      if (!last || Math.abs(last.x - p.x) > 1e-6 || Math.abs(last.y - p.y) > 1e-6) {
        verts.push(p)
      }
    }
  }

  let bottomPts = useFingers.bottom
    ? buildEdgeVertices({
        pattern: horizPattern,
        materialThickness: t,
        direction: 'horizontal',
        invertTabs: invertTabs.bottom,
        outwardSign: outwardSign.bottom,
        startPoint: { x: x0, y: y0 },
      })
    : [
        { x: x0, y: y0 },
        { x: x0 + width, y: y0 },
      ]

  if (bottomIsTab && leftIsTab) {
    bottomPts = [
      { x: x0, y: y0 },
      { x: outerLeftX, y: y0 },
      { x: outerLeftX, y: outerBottomY },
      { x: x0, y: outerBottomY },
      ...bottomPts.slice(2),
    ]
  }

  if (bottomIsTab && rightIsTab && bottomPts.length >= 2) {
    const last = bottomPts[bottomPts.length - 1]
    const prev = bottomPts[bottomPts.length - 2]
    if (
      Math.abs(prev.x - (x0 + width)) < 1e-6 &&
      Math.abs(prev.y - outerBottomY) < 1e-6 &&
      Math.abs(last.x - (x0 + width)) < 1e-6 &&
      Math.abs(last.y - y0) < 1e-6
    ) {
      bottomPts = [...bottomPts.slice(0, -1), { x: outerRightX, y: outerBottomY }, { x: outerRightX, y: y0 }, last]
    }
  }
  pushPoints(bottomPts)

  const rightStart = { x: x0 + width, y: y0 }
  const rightPts = useFingers.right
    ? buildEdgeVertices({
        pattern: vertPattern,
        materialThickness: t,
        direction: 'vertical',
        invertTabs: invertTabs.right,
        outwardSign: outwardSign.right,
        startPoint: rightStart,
      })
    : [
        rightStart,
        { x: x0 + width, y: y0 + height },
      ]
  pushPoints(rightPts.slice(1))

  const topStart = { x: x0, y: y0 + height }
  let topPtsForward = useFingers.top
    ? buildEdgeVertices({
        pattern: horizPattern,
        materialThickness: t,
        direction: 'horizontal',
        invertTabs: invertTabs.top,
        outwardSign: outwardSign.top,
        startPoint: topStart,
      })
    : [
        topStart,
        { x: x0 + width, y: y0 + height },
      ]

  if (params.skipCornerNotches && topIsTab && leftIsTab) {
    topPtsForward = [
      { x: x0, y: y0 + height },
      { x: outerLeftX, y: y0 + height },
      { x: outerLeftX, y: outerTopY },
      { x: x0, y: outerTopY },
      ...topPtsForward.slice(2),
    ]
  }

  if (params.skipCornerNotches && topIsTab && rightIsTab && topPtsForward.length >= 2) {
    const last = topPtsForward[topPtsForward.length - 1]
    const prev = topPtsForward[topPtsForward.length - 2]
    if (
      Math.abs(prev.x - (x0 + width)) < 1e-6 &&
      Math.abs(prev.y - outerTopY) < 1e-6 &&
      Math.abs(last.x - (x0 + width)) < 1e-6 &&
      Math.abs(last.y - (y0 + height)) < 1e-6
    ) {
      topPtsForward = [...topPtsForward.slice(0, -1), { x: outerRightX, y: outerTopY }, { x: outerRightX, y: y0 + height }, last]
    }
  }

  const topPts = [...topPtsForward].reverse()
  pushPoints(topPts.slice(1))

  const leftStart = { x: x0, y: y0 }
  const leftPtsForward = useFingers.left
    ? buildEdgeVertices({
        pattern: vertPattern,
        materialThickness: t,
        direction: 'vertical',
        invertTabs: invertTabs.left,
        outwardSign: outwardSign.left,
        startPoint: leftStart,
      })
    : [
        leftStart,
        { x: x0, y: y0 + height },
      ]
  const leftPts = [...leftPtsForward].reverse()
  pushPoints(leftPts.slice(1))

  return {
    vertices: popIfClosed(simplifyClosedVertices(verts)),
    faceWidth,
    faceHeight,
  }
}

function createFaceFromVertices(
  name: FaceName,
  idSuffix: string,
  vertices: Vec2[],
  faceWidth: number,
  faceHeight: number,
): GeneratedFace {
  const outlinePath = verticesToOutlinePath(vertices, faceHeight)
  return {
    id: `${name}-${idSuffix}`,
    name,
    width: faceWidth,
    height: faceHeight,
    outlinePath,
    vertices,
    paths: [{ d: outlinePath, op: 'cut' }],
  }
}

function outlinePathToVertices(outlinePath: string, faceHeight: number): Vec2[] {
  const tokens = outlinePath.trim().split(/\s+/)

  let i = 0
  let cmd = ''
  let x = 0
  let y = 0
  let startX = 0
  let startY = 0

  const raw: Vec2[] = []

  const pushPoint = (nx: number, ny: number) => {
    x = nx
    y = ny
    raw.push({ x, y })
  }

  while (i < tokens.length) {
    const token = tokens[i]

    if (/^[A-Za-z]$/.test(token)) {
      cmd = token
      i += 1

      if (cmd === 'Z' || cmd === 'z') {
        x = startX
        y = startY
      }

      continue
    }

    switch (cmd) {
      case 'M': {
        const nx = Number.parseFloat(tokens[i])
        const ny = Number.parseFloat(tokens[i + 1])
        i += 2
        startX = nx
        startY = ny
        pushPoint(nx, ny)
        break
      }
      case 'm': {
        const dx = Number.parseFloat(tokens[i])
        const dy = Number.parseFloat(tokens[i + 1])
        i += 2
        const nx = x + dx
        const ny = y + dy
        startX = nx
        startY = ny
        pushPoint(nx, ny)
        break
      }
      case 'H': {
        const nx = Number.parseFloat(tokens[i])
        i += 1
        pushPoint(nx, y)
        break
      }
      case 'h': {
        const dx = Number.parseFloat(tokens[i])
        i += 1
        pushPoint(x + dx, y)
        break
      }
      case 'V': {
        const ny = Number.parseFloat(tokens[i])
        i += 1
        pushPoint(x, ny)
        break
      }
      case 'v': {
        const dy = Number.parseFloat(tokens[i])
        i += 1
        pushPoint(x, y + dy)
        break
      }
      case 'L': {
        const nx = Number.parseFloat(tokens[i])
        const ny = Number.parseFloat(tokens[i + 1])
        i += 2
        pushPoint(nx, ny)
        break
      }
      case 'l': {
        const dx = Number.parseFloat(tokens[i])
        const dy = Number.parseFloat(tokens[i + 1])
        i += 2
        pushPoint(x + dx, y + dy)
        break
      }
      default: {
        i += 1
        break
      }
    }
  }

  if (!raw.length) return []

  const first = raw[0]
  const last = raw[raw.length - 1]
  const isClosed = Math.abs(first.x - last.x) < 1e-6 && Math.abs(first.y - last.y) < 1e-6
  const closed = isClosed ? raw.slice(0, -1) : raw

  return closed.map((p) => ({ x: p.x, y: faceHeight - p.y }))
}

function verticesToOutlinePath(vertices: Vec2[], faceHeight: number): string {
  if (vertices.length === 0) return ''
  const pts = vertices.map((p) => ({ x: p.x, y: faceHeight - p.y }))
  const d: string[] = []
  d.push(`M ${pts[0].x.toFixed(3)} ${pts[0].y.toFixed(3)}`)
  for (let i = 1; i < pts.length; i += 1) {
    d.push(`L ${pts[i].x.toFixed(3)} ${pts[i].y.toFixed(3)}`)
  }
  d.push('Z')
  return d.join(' ')
}

function popIfClosed(vertices: Vec2[]): Vec2[] {
  if (vertices.length < 2) return vertices
  const first = vertices[0]
  const last = vertices[vertices.length - 1]
  if (Math.abs(first.x - last.x) < 1e-6 && Math.abs(first.y - last.y) < 1e-6) {
    return vertices.slice(0, -1)
  }
  return vertices
}

function simplifyVertices(vertices: Vec2[]): Vec2[] {
  const eps = 1e-6
  const out: Vec2[] = []

  const eq = (a: Vec2, b: Vec2) => Math.abs(a.x - b.x) < eps && Math.abs(a.y - b.y) < eps

  for (const p of vertices) {
    const last = out.length > 0 ? out[out.length - 1] : null
    if (last && eq(last, p)) continue

    out.push(p)

    while (out.length >= 3) {
      const a = out[out.length - 3]
      const b = out[out.length - 2]
      const c = out[out.length - 1]

      if (eq(a, c)) {
        out.splice(out.length - 2, 2)
        continue
      }

      const colinearX = Math.abs(a.x - b.x) < eps && Math.abs(b.x - c.x) < eps
      const colinearY = Math.abs(a.y - b.y) < eps && Math.abs(b.y - c.y) < eps
      if (colinearX || colinearY) {
        out.splice(out.length - 2, 1)
        continue
      }

      break
    }
  }

  return out
}

function simplifyClosedVertices(vertices: Vec2[]): Vec2[] {
  const eps = 1e-6
  const eq = (a: Vec2, b: Vec2) => Math.abs(a.x - b.x) < eps && Math.abs(a.y - b.y) < eps

  let pts = simplifyVertices(vertices)

  let changed = true
  while (changed && pts.length >= 3) {
    changed = false

    if (pts.length >= 2 && eq(pts[0], pts[pts.length - 1])) {
      pts = pts.slice(0, -1)
      changed = true
      continue
    }

    const len = pts.length
    for (let i = 0; i < len; i += 1) {
      const prev = pts[(i - 1 + len) % len]
      const curr = pts[i]
      const next = pts[(i + 1) % len]

      if (eq(prev, next)) {
        pts = [...pts.slice(0, i), ...pts.slice(i + 1)]
        changed = true
        break
      }

      const colinearX = Math.abs(prev.x - curr.x) < eps && Math.abs(curr.x - next.x) < eps
      const colinearY = Math.abs(prev.y - curr.y) < eps && Math.abs(curr.y - next.y) < eps
      if (colinearX || colinearY) {
        pts = [...pts.slice(0, i), ...pts.slice(i + 1)]
        changed = true
        break
      }
    }
  }

  return pts
}

function createRectFace(name: FaceName, width: number, height: number, idSuffix: string): GeneratedFace {
  const safeWidth = Math.max(width, 0.1)
  const safeHeight = Math.max(height, 0.1)
  const outlinePath = `M 0 0 H ${safeWidth.toFixed(3)} V ${safeHeight.toFixed(3)} H 0 Z`
  const vertices = outlinePathToVertices(outlinePath, safeHeight)

  return {
    id: `${name}-${idSuffix}`,
    name,
    width: safeWidth,
    height: safeHeight,
    outlinePath,
    vertices,
    paths: [{ d: outlinePath, op: 'cut' }],
  }
}

function rectPath(x: number, y: number, width: number, height: number): string {
  const safeWidth = Math.max(width, 0.1)
  const safeHeight = Math.max(height, 0.1)

  const x0 = x
  const y0 = y
  const x1 = x + safeWidth
  const y1 = y + safeHeight

  return `M ${x0.toFixed(3)} ${y0.toFixed(3)} H ${x1.toFixed(3)} V ${y1.toFixed(3)} H ${x0.toFixed(3)} Z`
}

function openSlotTopPath(x: number, width: number, depth: number): string {
  const safeWidth = Math.max(width, 0.1)
  const safeDepth = Math.max(depth, 0.1)
  const x0 = x
  const x1 = x + safeWidth
  const y0 = 0
  const y1 = safeDepth
  return `M ${x0.toFixed(3)} ${y0.toFixed(3)} V ${y1.toFixed(3)} H ${x1.toFixed(3)} V ${y0.toFixed(3)}`
}

function openSlotBottomPath(x: number, yTop: number, width: number, depth: number): string {
  const safeWidth = Math.max(width, 0.1)
  const safeDepth = Math.max(depth, 0.1)
  const x0 = x
  const x1 = x + safeWidth
  const y0 = yTop
  const y1 = yTop + safeDepth
  return `M ${x0.toFixed(3)} ${y1.toFixed(3)} V ${y0.toFixed(3)} H ${x1.toFixed(3)} V ${y1.toFixed(3)}`
}

function addExtraPaths(face: GeneratedFace, extra: FacePath[]): GeneratedFace {
  if (extra.length === 0) return face
  return {
    ...face,
    paths: [...face.paths, ...extra],
  }
}

function generateSlidingGroovePaths(
  baseX: number,
  baseY: number,
  baseWidth: number,
  baseHeight: number,
  settings: BoxSettings,
): FacePath[] {
  const grooveHeight = Math.max(settings.grooveDepth, 0)
  const grooveOffset = Math.max(settings.grooveOffset, 0)

  if (grooveHeight <= 0) return []

  const y = baseY + grooveOffset
  const maxY = baseY + baseHeight
  if (y >= maxY) return []

  const clippedHeight = Math.min(grooveHeight, maxY - y)
  if (clippedHeight <= 0) return []

  return [{ d: rectPath(baseX, y, baseWidth, clippedHeight), op: 'score' }]
}

function generateLidFaces(settings: BoxSettings, dims: BoxDimensions): GeneratedFace[] {
  if (settings.lidType === 'none') return []

  const faces: GeneratedFace[] = []
  const t = Math.max(settings.materialThickness, 0.1)

  if (settings.lidType === 'flat_lid' || settings.lidType === 'flat_lid_with_lip') {
    faces.push(createRectFace('lid', dims.outerWidth, dims.outerDepth, 'lid'))
  } else if (settings.lidType === 'sliding_lid') {
    faces.push(createRectFace('lid', dims.innerWidth, dims.innerDepth, 'lid'))
  }

  if (settings.lidType === 'flat_lid_with_lip') {
    const lipOuterWidth = Math.max(dims.innerWidth - 2 * settings.lipInset, 1)
    const lipOuterDepth = Math.max(dims.innerDepth - 2 * settings.lipInset, 1)
    const lipHeight = Math.max(settings.lipHeight, 0)

    if (lipHeight > 0) {
      faces.push(createRectFace('lid_lip', lipOuterWidth, lipHeight, 'lip-front'))
      faces.push(createRectFace('lid_lip', lipOuterWidth, lipHeight, 'lip-back'))

      const sideLength = Math.max(lipOuterDepth - 2 * t, 1)
      faces.push(createRectFace('lid_lip', sideLength, lipHeight, 'lip-left'))
      faces.push(createRectFace('lid_lip', sideLength, lipHeight, 'lip-right'))
    }
  }

  return faces
}

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min
  if (value < min) return min
  if (value > max) return max
  return value
}

function generateDividerFaces(settings: BoxSettings, dims: BoxDimensions): GeneratedFace[] {
  if (!settings.dividersEnabled) return []

  const countX = Math.max(1, Math.floor(settings.dividerCountX))
  const countZ = Math.max(1, Math.floor(settings.dividerCountZ))

  const dividerCountX = Math.max(0, countX - 1)
  const dividerCountZ = Math.max(0, countZ - 1)

  if (dividerCountX === 0 && dividerCountZ === 0) return []

  const t = Math.max(settings.materialThickness, 0.1)
  const clearance = Math.max(settings.dividerClearance, 0)
  const slotWidth = Math.max(t + clearance, 0.1)

  const dividerHeight = Math.max(dims.innerHeight, 0.1)
  const slotDepth = Math.max(dividerHeight / 2, 0.1)

  const faces: GeneratedFace[] = []

  const dividerXLength = Math.max(dims.innerDepth, 0.1)
  const dividerZLength = Math.max(dims.innerWidth, 0.1)

  const slotsOnX: number[] = []
  if (countZ > 1) {
    const step = dividerXLength / countZ
    for (let i = 1; i < countZ; i += 1) {
      slotsOnX.push(i * step)
    }
  }

  const slotsOnZ: number[] = []
  if (countX > 1) {
    const step = dividerZLength / countX
    for (let i = 1; i < countX; i += 1) {
      slotsOnZ.push(i * step)
    }
  }

  for (let i = 0; i < dividerCountX; i += 1) {
    const base = createRectFace('divider_x', dividerXLength, dividerHeight, `x-${i + 1}`)
    const slotPaths: FacePath[] = []

    for (const pos of slotsOnX) {
      const x = clamp(pos - slotWidth / 2, 0, dividerXLength - slotWidth)
      slotPaths.push({ d: openSlotTopPath(x, slotWidth, slotDepth), op: 'cut' })
    }

    faces.push(addExtraPaths(base, slotPaths))
  }

  for (let i = 0; i < dividerCountZ; i += 1) {
    const base = createRectFace('divider_z', dividerZLength, dividerHeight, `z-${i + 1}`)
    const slotPaths: FacePath[] = []

    for (const pos of slotsOnZ) {
      const x = clamp(pos - slotWidth / 2, 0, dividerZLength - slotWidth)
      slotPaths.push({ d: openSlotBottomPath(x, dividerHeight - slotDepth, slotWidth, slotDepth), op: 'cut' })
    }

    faces.push(addExtraPaths(base, slotPaths))
  }

  return faces
}

export function buildVerticalEdgeDown(
  height: number,
  thickness: number,
  fingerTabs: number,
  invertPattern: boolean,
  outwardSign: 1 | -1,
): string {
  const tabs = Math.max(1, fingerTabs)
  const cells = tabs * 2
  const segment = height / cells
  const offset = thickness * outwardSign

  let d = ''

  for (let i = 0; i < cells; i += 1) {
    const isTab = invertPattern ? i % 2 === 1 : i % 2 === 0

    if (isTab) {
      d += ` l ${offset.toFixed(3)} 0 l 0 ${segment.toFixed(3)} l ${(-offset).toFixed(3)} 0`
    } else {
      d += ` l 0 ${segment.toFixed(3)}`
    }
  }

  return d
}

export function buildHorizontalEdgeRight(
  length: number,
  thickness: number,
  fingerTabs: number,
  invertPattern: boolean,
  outwardSignY: 1 | -1,
): string {
  const tabs = Math.max(1, fingerTabs)
  const cells = tabs * 2
  const segment = length / cells
  const offsetY = thickness * outwardSignY

  let d = ''

  for (let i = 0; i < cells; i += 1) {
    const isTab = invertPattern ? i % 2 === 1 : i % 2 === 0

    if (isTab) {
      d += ` l 0 ${offsetY.toFixed(3)} l ${segment.toFixed(3)} 0 l 0 ${(-offsetY).toFixed(3)}`
    } else {
      d += ` l ${segment.toFixed(3)} 0`
    }
  }

  return d
}

export function buildHorizontalEdgeLeft(
  length: number,
  thickness: number,
  fingerTabs: number,
  invertPattern: boolean,
  outwardSignY: 1 | -1,
): string {
  const tabs = Math.max(1, fingerTabs)
  const cells = tabs * 2
  const segment = length / cells
  const offsetY = thickness * outwardSignY

  let d = ''

  for (let i = 0; i < cells; i += 1) {
    const isTab = invertPattern ? i % 2 === 1 : i % 2 === 0

    if (isTab) {
      d += ` l 0 ${offsetY.toFixed(3)} l ${(-segment).toFixed(3)} 0 l 0 ${(-offsetY).toFixed(3)}`
    } else {
      d += ` l ${(-segment).toFixed(3)} 0`
    }
  }

  return d
}

export function buildVerticalEdgeUp(
  height: number,
  thickness: number,
  fingerTabs: number,
  invertPattern: boolean,
  outwardSign: 1 | -1,
): string {
  const tabs = Math.max(1, fingerTabs)
  const cells = tabs * 2
  const segment = height / cells
  const offset = thickness * outwardSign

  let d = ''

  for (let i = 0; i < cells; i += 1) {
    const isTab = invertPattern ? i % 2 === 1 : i % 2 === 0

    if (isTab) {
      d += ` l ${offset.toFixed(3)} 0 l 0 ${(-segment).toFixed(3)} l ${(-offset).toFixed(3)} 0`
    } else {
      d += ` l 0 ${(-segment).toFixed(3)}`
    }
  }

  return d
}

function createVerticalFingerFace(
  name: FaceName,
  width: number,
  height: number,
  idSuffix: string,
  settings: BoxSettings,
  fingerTabs: number,
  invertLeft: boolean,
  invertRight: boolean,
): GeneratedFace {
  const safeWidth = Math.max(width, 0.1)
  const safeHeight = Math.max(height, 0.1)
  const t = Math.max(settings.materialThickness, 0.1)

  const minFinger = settings.fingerMin
  const maxFinger = settings.fingerMax

  const n = Math.max(1, Math.floor(fingerTabs))
  const heightPattern =
    n > 0
      ? generateFingerPattern(safeHeight, safeHeight / (2 * n), safeHeight / (2 * n))
      : generateFingerPattern(safeHeight, minFinger, maxFinger)

  const verts: Vec2[] = []

  const bottom = buildEdgeVertices({
    pattern: generateFingerPattern(safeWidth, safeWidth, safeWidth),
    materialThickness: 0,
    direction: 'horizontal',
    invertTabs: false,
    outwardSign: 1,
    startPoint: { x: t, y: 0 },
  })
  verts.push(...bottom)

  const right = buildEdgeVertices({
    pattern: heightPattern,
    materialThickness: t,
    direction: 'vertical',
    invertTabs: invertRight,
    outwardSign: 1,
    startPoint: { x: t + safeWidth, y: 0 },
  })
  verts.push(...right.slice(1))

  verts.push({ x: t, y: safeHeight })

  const left = buildEdgeVertices({
    pattern: heightPattern,
    materialThickness: t,
    direction: 'vertical',
    invertTabs: invertLeft,
    outwardSign: -1,
    startPoint: { x: t, y: 0 },
  })
  left.reverse()
  verts.push(...left.slice(1))

  const vertices = popIfClosed(verts)
  const faceWidth = safeWidth + 2 * t
  const outlinePath = verticesToOutlinePath(vertices, safeHeight)

  return {
    id: `${name}-${idSuffix}`,
    name,
    // Include finger protrusions on both left and right edges.
    width: faceWidth,
    height: safeHeight,
    outlinePath,
    vertices,
    paths: [{ d: outlinePath, op: 'cut' }],
  }
}


export function createFullFingerFace(
  name: FaceName,
  width: number,
  height: number,
  idSuffix: string,
  settings: BoxSettings,
  verticalTabs: number,
  horizontalTabsTop: number,
  horizontalTabsBottom: number,
  invertLeft: boolean,
  invertRight: boolean,
  invertTop: boolean,
  invertBottom: boolean,
): GeneratedFace {
  const safeWidth = Math.max(width, 0.1)
  const safeHeight = Math.max(height, 0.1)
  const t = Math.max(settings.materialThickness, 0.1)

  void verticalTabs
  void horizontalTabsTop
  void horizontalTabsBottom

  const minFinger = settings.fingerMin
  const maxFinger = settings.fingerMax

  const widthPattern = generateFingerPattern(safeWidth, minFinger, maxFinger)
  const heightPattern = generateFingerPattern(safeHeight, minFinger, maxFinger)

  const start = { x: t, y: t }
  const verts: Vec2[] = []

  const bottom = buildEdgeVertices({
    pattern: widthPattern,
    materialThickness: t,
    direction: 'horizontal',
    invertTabs: invertBottom,
    outwardSign: -1,
    startPoint: start,
  })
  verts.push(...bottom)

  const right = buildEdgeVertices({
    pattern: heightPattern,
    materialThickness: t,
    direction: 'vertical',
    invertTabs: invertRight,
    outwardSign: 1,
    startPoint: { x: t + safeWidth, y: t },
  })
  verts.push(...right.slice(1))

  const top = buildEdgeVertices({
    pattern: widthPattern,
    materialThickness: t,
    direction: 'horizontal',
    invertTabs: invertTop,
    outwardSign: 1,
    startPoint: { x: t, y: t + safeHeight },
  })
  top.reverse()
  verts.push(...top.slice(1))

  const left = buildEdgeVertices({
    pattern: heightPattern,
    materialThickness: t,
    direction: 'vertical',
    invertTabs: invertLeft,
    outwardSign: -1,
    startPoint: { x: t, y: t },
  })
  left.reverse()
  verts.push(...left.slice(1))

  const vertices = popIfClosed(verts)
  const faceWidth = safeWidth + 2 * t
  const faceHeight = safeHeight + 2 * t
  const outlinePath = verticesToOutlinePath(vertices, faceHeight)

  return {
    id: `${name}-${idSuffix}`,
    name,
    width: faceWidth,
    height: faceHeight,
    outlinePath,
    vertices,
    paths: [{ d: outlinePath, op: 'cut' }],
  }
}

function generateFingerAllFaces(settings: BoxSettings, dims: BoxDimensions): GeneratedFace[] {
  const faces: GeneratedFace[] = []
  const boxSize = getBoxSize(settings)
  const { innerWidth, innerDepth, innerHeight } = boxSize
  const t = Math.max(settings.materialThickness, 0.1)
  const patterns = getBoxFingerPatterns(settings)

  // Use inner sizes as the base, so after adding finger protrusions (+t per side)
  // the resulting face outline matches the outer box dimensions.
  const wallHeightBase = innerHeight

  const wallUseFingers = {
    bottom: true,
    right: true,
    top: false,
    left: true,
  }

  const frontBackInverts = {
    bottom: false,
    right: false,
    top: false,
    left: false,
  }

  const leftRightInverts = {
    bottom: false,
    right: true,
    top: false,
    left: true,
  }

  const bottomInverts = {
    bottom: true,
    right: true,
    top: true,
    left: true,
  }

  const frontBuilt = buildRectFaceVertices({
    width: innerWidth,
    height: wallHeightBase,
    thickness: t,
    horizPattern: patterns.width,
    vertPattern: patterns.height,
    useFingers: wallUseFingers,
    invertTabs: frontBackInverts,
  })
  const front = createFaceFromVertices('front', 'front', frontBuilt.vertices, frontBuilt.faceWidth, frontBuilt.faceHeight)
  const back = cloneFace(front, 'back', 'back')
  faces.push(front, back)

  const leftBuilt = buildRectFaceVertices({
    width: innerDepth,
    height: wallHeightBase,
    thickness: t,
    horizPattern: patterns.depth,
    vertPattern: patterns.height,
    useFingers: wallUseFingers,
    invertTabs: leftRightInverts,
  })
  const groovePaths =
    settings.lidType === 'sliding_lid' ? generateSlidingGroovePaths(t, t, dims.outerDepth, dims.outerHeight, settings) : []
  const leftBase = createFaceFromVertices('left', 'left', leftBuilt.vertices, leftBuilt.faceWidth, leftBuilt.faceHeight)
  const left = addExtraPaths(leftBase, groovePaths)
  const right = cloneFace(left, 'right', 'right')
  faces.push(left, right)

  const bottomBuilt = buildRectFaceVertices({
    width: innerWidth,
    height: innerDepth,
    thickness: t,
    horizPattern: patterns.width,
    vertPattern: patterns.depth,
    useFingers: { bottom: true, right: true, top: true, left: true },
    invertTabs: bottomInverts,
  })
  const bottom = createFaceFromVertices(
    'bottom',
    'bottom',
    bottomBuilt.vertices,
    bottomBuilt.faceWidth,
    bottomBuilt.faceHeight,
  )
  faces.push(bottom)

  faces.push(...generateDividerFaces(settings, dims))
  faces.push(...generateLidFaces(settings, dims))
  return faces
}

function generateFingerAllFacesOpenFront(settings: BoxSettings, dims: BoxDimensions): GeneratedFace[] {
  const faces: GeneratedFace[] = []
  const boxSize = getBoxSize(settings)
  const { innerWidth, innerDepth, innerHeight } = boxSize
  const t = Math.max(settings.materialThickness, 0.1)
  const patterns = getBoxFingerPatterns(settings)

  const wallHeightBase = innerHeight

  const plateInverts = {
    bottom: true,
    right: true,
    top: true,
    left: true,
  }

  const backInverts = {
    bottom: false,
    right: false,
    top: false,
    left: false,
  }

  const sideInverts = {
    bottom: false,
    right: true,
    top: false,
    left: true,
  }

  const backBuilt = buildRectFaceVertices({
    width: innerWidth,
    height: wallHeightBase,
    thickness: t,
    horizPattern: patterns.width,
    vertPattern: patterns.height,
    useFingers: { bottom: true, right: true, top: true, left: true },
    invertTabs: { bottom: false, right: false, top: false, left: false },
    skipCornerNotches: true,
  })
  const back = createFaceFromVertices('back', 'back', backBuilt.vertices, backBuilt.faceWidth, backBuilt.faceHeight)
  faces.push(back)

  const leftBuilt = buildRectFaceVertices({
    width: innerDepth,
    height: wallHeightBase,
    thickness: t,
    horizPattern: patterns.depth,
    vertPattern: patterns.height,
    useFingers: { bottom: true, right: false, top: true, left: true },
    invertTabs: sideInverts,
  })
  const left = createFaceFromVertices('left', 'left', leftBuilt.vertices, leftBuilt.faceWidth, leftBuilt.faceHeight)
  faces.push(left)

  const right = cloneFace(left, 'right', 'right')
  faces.push(right)

  const bottomBuilt = buildRectFaceVertices({
    width: innerWidth,
    height: innerDepth,
    thickness: t,
    horizPattern: patterns.width,
    vertPattern: patterns.depth,
    useFingers: { bottom: true, right: true, top: false, left: true },
    invertTabs: plateInverts,
  })
  const bottom = createFaceFromVertices(
    'bottom',
    'bottom',
    bottomBuilt.vertices,
    bottomBuilt.faceWidth,
    bottomBuilt.faceHeight,
  )
  faces.push(bottom)

  const topBuilt = buildRectFaceVertices({
    width: innerWidth,
    height: innerDepth,
    thickness: t,
    horizPattern: patterns.width,
    vertPattern: patterns.depth,
    useFingers: { bottom: false, right: true, top: true, left: true },
    invertTabs: plateInverts,
  })
  const top = createFaceFromVertices('top', 'top', topBuilt.vertices, topBuilt.faceWidth, topBuilt.faceHeight)
  faces.push(top)

  return faces
}

function generateFingerVerticalFaces(settings: BoxSettings, dims: BoxDimensions): GeneratedFace[] {
  const faces: GeneratedFace[] = []

  const { innerWidth, innerDepth, outerWidth, outerHeight, outerDepth } = dims
  const t = Math.max(settings.materialThickness, 0.1)
  const baseTabs =
    !settings.autoFingerCount && settings.manualFingerCount && settings.manualFingerCount > 0
      ? Math.floor(settings.manualFingerCount)
      : calculateFingerCount(outerHeight, settings.fingerMin, settings.fingerMax)

  const fingerTabs = Math.max(1, baseTabs)

  // Front and back panels: width × height, tabs pattern.
  faces.push(
    createVerticalFingerFace('front', innerWidth, outerHeight, 'front', settings, fingerTabs, false, false),
  )
  faces.push(
    createVerticalFingerFace('back', innerWidth, outerHeight, 'back', settings, fingerTabs, false, false),
  )

  // Left and right panels: depth × height, complementary pattern.
  const groovePaths =
    settings.lidType === 'sliding_lid' ? generateSlidingGroovePaths(t, 0, outerDepth, outerHeight, settings) : []

  faces.push(
    addExtraPaths(
      createVerticalFingerFace('left', innerDepth, outerHeight, 'left', settings, fingerTabs, true, true),
      groovePaths,
    ),
  )
  faces.push(
    addExtraPaths(
      createVerticalFingerFace('right', innerDepth, outerHeight, 'right', settings, fingerTabs, true, true),
      groovePaths,
    ),
  )

  // Bottom panel: simple rectangle for now.
  faces.push(createRectFace('bottom', outerWidth, outerDepth, 'bottom'))

  faces.push(...generateDividerFaces(settings, dims))

  faces.push(...generateLidFaces(settings, dims))

  return faces
}

/**
 * Main entry point for generating box geometry.
 * Currently implements simple butt-joint panels; finger joints and
 * divider plates will be added on top of this.
 */
export function generateBoxGeometry(settings: BoxSettings): BoxGenerationResult {
  const dimensions = computeDimensions(settings)
  let faces: GeneratedFace[]

  if (settings.boxType === 'finger_vertical_edges') {
    faces = generateFingerVerticalFaces(settings, dimensions)
  } else {
    faces = generateFingerAllFaces(settings, dimensions)
  }

  const warnings: string[] = []

  if (settings.boxType === 'finger_all_edges') {
    const bottom = faces.find((f) => f.name === 'bottom')
    const front = faces.find((f) => f.name === 'front')
    const back = faces.find((f) => f.name === 'back')
    const left = faces.find((f) => f.name === 'left')
    const right = faces.find((f) => f.name === 'right')

    const eps = 0.01

    if (bottom && front && Math.abs(bottom.width - front.width) > eps) {
      warnings.push('Bottom/front width mismatch → finger joints may not align.')
    }
    if (bottom && back && Math.abs(bottom.width - back.width) > eps) {
      warnings.push('Bottom/back width mismatch → finger joints may not align.')
    }
    if (bottom && left && Math.abs(bottom.height - left.width) > eps) {
      warnings.push('Bottom/left depth mismatch → finger joints may not align.')
    }
    if (bottom && right && Math.abs(bottom.height - right.width) > eps) {
      warnings.push('Bottom/right depth mismatch → finger joints may not align.')
    }
  }

  return {
    faces,
    dimensions,
    warnings,
  }
}

export function generateBoxGeometryOpenFront(settings: BoxSettings): BoxGenerationResult {
  const dimensions = computeDimensions(settings)
  let faces: GeneratedFace[]

  if (settings.boxType === 'finger_vertical_edges') {
    faces = generateFingerVerticalFaces(settings, dimensions)
  } else {
    faces = generateFingerAllFacesOpenFront(settings, dimensions)
  }

  const warnings: string[] = []

  if (settings.boxType === 'finger_all_edges') {
    const bottom = faces.find((f) => f.name === 'bottom')
    const back = faces.find((f) => f.name === 'back')
    const left = faces.find((f) => f.name === 'left')
    const right = faces.find((f) => f.name === 'right')

    const eps = 0.01

    if (bottom && back && Math.abs(bottom.width - back.width) > eps) {
      warnings.push('Bottom/back width mismatch → finger joints may not align.')
    }
    if (bottom && left && Math.abs(bottom.height - left.width) > eps) {
      warnings.push('Bottom/left depth mismatch → finger joints may not align.')
    }
    if (bottom && right && Math.abs(bottom.height - right.width) > eps) {
      warnings.push('Bottom/right depth mismatch → finger joints may not align.')
    }
  }

  return {
    faces,
    dimensions,
    warnings,
  }
}
