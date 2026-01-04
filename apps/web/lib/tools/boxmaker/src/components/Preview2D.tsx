import type { Dispatch, FC, MouseEvent, ReactNode, SetStateAction, WheelEvent } from 'react'
import { useMemo, useRef, useState } from 'react'
import type { GeneratedLayout, ImportedItem } from '../lib/types'

interface Preview2DProps {
  layout: GeneratedLayout | null
  footer?: ReactNode
  importedItems: ImportedItem[]
  setImportedItems: Dispatch<SetStateAction<ImportedItem[]>>
  selectedImportedId: string | null
  setSelectedImportedId: Dispatch<SetStateAction<string | null>>
  onBeginImportedItemsEdit?: () => void
  onEndImportedItemsEdit?: () => void
}

type DragMode = 'pan' | 'move' | 'scale' | 'rotate'

type DragState =
  | null
  | {
      mode: DragMode
      itemId?: string
      handle?: 'nw' | 'ne' | 'se' | 'sw'
      startClient: { x: number; y: number }
      startPan: { x: number; y: number }
      startPlacement?: { faceId: string | null; x: number; y: number; rotation: number; scale: number }
      startLocal?: { x: number; y: number }
    }

export const Preview2D: FC<Preview2DProps> = ({
  layout,
  footer,
  importedItems,
  setImportedItems,
  selectedImportedId,
  setSelectedImportedId,
  onBeginImportedItemsEdit,
  onEndImportedItemsEdit,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const axisLockRef = useRef<null | 'x' | 'y'>(null)

  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [dragState, setDragState] = useState<DragState>(null)
  const [showGrid, setShowGrid] = useState(true)
  const [snapEnabled, setSnapEnabled] = useState(false)
  const [gridSize, setGridSize] = useState(10)

  type FacePlacement = {
    faceId: string
    bboxX: number
    bboxY: number
    bboxW: number
    bboxH: number
    faceW: number
    faceH: number
    rotation: 0 | 90
  }

  const facePlacementMap = useMemo(() => {
    const map = new Map<string, FacePlacement>()
    const placedFaces = layout?.placedFaces ?? []
    for (const placed of placedFaces) {
      if (placed.overflow) continue
      const ox = placed.face.offset?.x ?? 0
      const oy = placed.face.offset?.y ?? 0
      const rot = (placed.rotation ?? 0) as 0 | 90
      const faceW = placed.face.width
      const faceH = placed.face.height

      const bboxW = rot === 90 ? faceH : faceW
      const bboxH = rot === 90 ? faceW : faceH
      const bboxX = rot === 90 ? placed.x : placed.x + ox
      const bboxY = rot === 90 ? placed.y : placed.y + oy
      map.set(placed.face.id, {
        faceId: placed.face.id,
        bboxX,
        bboxY,
        bboxW,
        bboxH,
        faceW,
        faceH,
        rotation: rot,
      })
    }
    return map
  }, [layout])

  if (!layout || layout.placedFaces.length === 0) {
    return (
      <div className="flex h-full min-h-[320px] items-center justify-center rounded-md border border-dashed border-slate-300 bg-white text-xs text-slate-500">
        Adjust box settings to generate a layout.
      </div>
    )
  }

  const width = Math.max(layout.layoutWidth, 10)
  const height = Math.max(layout.layoutHeight, 10)

  const viewW = width / Math.max(zoom, 0.01)
  const viewH = height / Math.max(zoom, 0.01)

  const clampPan = (next: { x: number; y: number }, vw: number = viewW, vh: number = viewH) => {
    const margin = Math.max(1, Math.min(width, height) * 0.05)
    const maxX = width - vw + margin
    const maxY = height - vh + margin

    const x =
      vw >= width + 2 * margin
        ? (width - vw) / 2
        : Math.min(Math.max(next.x, -margin), maxX)
    const y =
      vh >= height + 2 * margin
        ? (height - vh) / 2
        : Math.min(Math.max(next.y, -margin), maxY)

    return {
      x,
      y,
    }
  }

  const getSvgPoint = (clientX: number, clientY: number): { x: number; y: number } | null => {
    const svg = svgRef.current
    if (!svg) return null
    const pt = svg.createSVGPoint()
    pt.x = clientX
    pt.y = clientY
    const ctm = svg.getScreenCTM()
    if (!ctm) return null
    const inv = ctm.inverse()
    const sp = pt.matrixTransform(inv)
    return { x: sp.x, y: sp.y }
  }

  const faceLocalToGlobal = (fp: FacePlacement, local: { x: number; y: number }) => {
    if (fp.rotation === 90) {
      return {
        x: fp.bboxX + fp.faceH - local.y,
        y: fp.bboxY + local.x,
      }
    }
    return { x: fp.bboxX + local.x, y: fp.bboxY + local.y }
  }

  const globalToFaceLocal = (fp: FacePlacement, global: { x: number; y: number }) => {
    if (fp.rotation === 90) {
      return {
        x: global.y - fp.bboxY,
        y: fp.faceH - (global.x - fp.bboxX),
      }
    }
    return { x: global.x - fp.bboxX, y: global.y - fp.bboxY }
  }

  const findFaceAt = (x: number, y: number): { faceId: string; localX: number; localY: number } | null => {
    for (const v of facePlacementMap.values()) {
      if (x >= v.bboxX && x <= v.bboxX + v.bboxW && y >= v.bboxY && y <= v.bboxY + v.bboxH) {
        const local = globalToFaceLocal(v, { x, y })
        return { faceId: v.faceId, localX: local.x, localY: local.y }
      }
    }
    return null
  }

  const getItemForFace = (faceId: string): ImportedItem[] => {
    return importedItems.filter((it) => it.placement.faceId === faceId)
  }

  const snapToGrid = (v: number) => {
    const g = Math.max(0.1, Number.isFinite(gridSize) ? gridSize : 10)
    return Math.round(v / g) * g
  }

  const SNAP_THRESHOLD_MM = 2

  const computeAabbHalfExtents = (params: { w: number; h: number; scale: number; rotation: number }) => {
    const halfW = (params.w * params.scale) / 2
    const halfH = (params.h * params.scale) / 2
    const c = Math.cos(params.rotation)
    const s = Math.sin(params.rotation)
    const hx = Math.abs(c) * halfW + Math.abs(s) * halfH
    const hy = Math.abs(s) * halfW + Math.abs(c) * halfH
    return { hx, hy }
  }

  const snapToTargets = (value: number, targets: number[]) => {
    let best = value
    let bestDelta = Infinity
    for (const t of targets) {
      const d = Math.abs(t - value)
      if (d < bestDelta) {
        bestDelta = d
        best = t
      }
    }
    if (bestDelta <= SNAP_THRESHOLD_MM) return best
    return value
  }

  const applySnap = (params: {
    x: number
    y: number
    faceW: number
    faceH: number
    itemW: number
    itemH: number
    scale: number
    rotation: number
  }) => {
    if (!snapEnabled) return { x: params.x, y: params.y }

    const { hx, hy } = computeAabbHalfExtents({
      w: params.itemW,
      h: params.itemH,
      scale: params.scale,
      rotation: params.rotation,
    })

    const xTargets = [hx, params.faceW - hx, params.faceW / 2, snapToGrid(params.x)]
    const yTargets = [hy, params.faceH - hy, params.faceH / 2, snapToGrid(params.y)]

    return {
      x: snapToTargets(params.x, xTargets),
      y: snapToTargets(params.y, yTargets),
    }
  }

  const handleMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragState({ mode: 'pan', startClient: { x: event.clientX, y: event.clientY }, startPan: pan, startLocal: undefined })
  }

  const handleMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    if (!dragState) return
    if (!svgRef.current) return

    if (dragState.mode === 'pan') {
      const svgEl = svgRef.current
      const rect = svgEl.getBoundingClientRect()
      const dxPx = event.clientX - dragState.startClient.x
      const dyPx = event.clientY - dragState.startClient.y

      const dx = (-dxPx * viewW) / Math.max(rect.width, 1)
      const dy = (-dyPx * viewH) / Math.max(rect.height, 1)

      setPan(clampPan({ x: dragState.startPan.x + dx, y: dragState.startPan.y + dy }))
      return
    }

    if (!dragState.itemId || !dragState.startPlacement) return

    const mouse = getSvgPoint(event.clientX, event.clientY)
    if (!mouse) return

    const item = importedItems.find((x) => x.id === dragState.itemId)
    if (!item) return

    const faceId = dragState.startPlacement.faceId
    const facePlacement = faceId ? facePlacementMap.get(faceId) : null
    if (!facePlacement) return

    const local = globalToFaceLocal(facePlacement, mouse)
    const centerStart = { x: dragState.startPlacement.x, y: dragState.startPlacement.y }

    if (dragState.mode === 'move') {
      if (!dragState.startLocal) return
      const offset = { x: dragState.startLocal.x - centerStart.x, y: dragState.startLocal.y - centerStart.y }
      const startGlobalCenter = faceLocalToGlobal(facePlacement, centerStart)
      const desiredGlobalCenter = { x: mouse.x - offset.x, y: mouse.y - offset.y }

      if (!event.shiftKey) {
        axisLockRef.current = null
      } else {
        if (!axisLockRef.current) {
          const dx = Math.abs(desiredGlobalCenter.x - startGlobalCenter.x)
          const dy = Math.abs(desiredGlobalCenter.y - startGlobalCenter.y)
          axisLockRef.current = dx >= dy ? 'x' : 'y'
        }
      }

      const globalCenter =
        event.shiftKey && axisLockRef.current
          ? axisLockRef.current === 'x'
            ? { x: desiredGlobalCenter.x, y: startGlobalCenter.y }
            : { x: startGlobalCenter.x, y: desiredGlobalCenter.y }
          : desiredGlobalCenter

      const found = findFaceAt(globalCenter.x, globalCenter.y)

      if (found) {
        const snapped = applySnap({
          x: found.localX,
          y: found.localY,
          faceW: facePlacementMap.get(found.faceId)?.faceW ?? 0,
          faceH: facePlacementMap.get(found.faceId)?.faceH ?? 0,
          itemW: item.face.width,
          itemH: item.face.height,
          scale: item.placement.scale,
          rotation: item.placement.rotation,
        })
        const x = snapped.x
        const y = snapped.y
        const nextPlacement = { ...item.placement, faceId: found.faceId, x, y }
        setImportedItems((prev) => prev.map((p) => (p.id === dragState.itemId ? { ...p, placement: nextPlacement } : p)))
        return
      }

      const currentFaceId = item.placement.faceId
      const currentFacePlacement = currentFaceId ? facePlacementMap.get(currentFaceId) : null
      if (!currentFacePlacement) return
      const nextLocal = globalToFaceLocal(currentFacePlacement, globalCenter)
      const snapped = applySnap({
        x: nextLocal.x,
        y: nextLocal.y,
        faceW: currentFacePlacement.faceW,
        faceH: currentFacePlacement.faceH,
        itemW: item.face.width,
        itemH: item.face.height,
        scale: item.placement.scale,
        rotation: item.placement.rotation,
      })
      const x = snapped.x
      const y = snapped.y
      const nextPlacement = { ...item.placement, x, y }
      setImportedItems((prev) => prev.map((p) => (p.id === dragState.itemId ? { ...p, placement: nextPlacement } : p)))
      return
    }

    if (dragState.mode === 'rotate') {
      const v0 = dragState.startLocal
      if (!v0) return
      const a0 = Math.atan2(v0.y - centerStart.y, v0.x - centerStart.x)
      const a1 = Math.atan2(local.y - centerStart.y, local.x - centerStart.x)
      const nextPlacement = { ...dragState.startPlacement, rotation: dragState.startPlacement.rotation + (a1 - a0) }
      setImportedItems((prev) => prev.map((p) => (p.id === dragState.itemId ? { ...p, placement: nextPlacement } : p)))
      return
    }

    if (dragState.mode === 'scale') {
      const corner = dragState.handle
      if (!corner) return
      const handleStart = dragState.startLocal
      if (!handleStart) return

      const d0 = Math.hypot(handleStart.x - centerStart.x, handleStart.y - centerStart.y)
      const d1 = Math.hypot(local.x - centerStart.x, local.y - centerStart.y)
      const ratio = d0 > 1e-6 ? d1 / d0 : 1
      const nextPlacement = { ...dragState.startPlacement, scale: Math.max(0.05, dragState.startPlacement.scale * ratio) }
      setImportedItems((prev) => prev.map((p) => (p.id === dragState.itemId ? { ...p, placement: nextPlacement } : p)))
      return
    }
  }

  const handleMouseUp = (event: MouseEvent<HTMLDivElement>) => {
    if (!dragState) {
      setDragState(null)
      return
    }

    axisLockRef.current = null

    if (dragState.mode === 'move' && dragState.itemId) {
      const item = importedItems.find((x) => x.id === dragState.itemId)
      if (item) {
        const currentFaceId = item.placement.faceId
        const currentFacePlacement = currentFaceId ? facePlacementMap.get(currentFaceId) : null
        const globalCenter = currentFacePlacement
          ? faceLocalToGlobal(currentFacePlacement, { x: item.placement.x, y: item.placement.y })
          : getSvgPoint(event.clientX, event.clientY)

        if (globalCenter) {
          const found = findFaceAt(globalCenter.x, globalCenter.y)
          if (found) {
            const targetFacePlacement = facePlacementMap.get(found.faceId)
            const snapped = applySnap({
              x: found.localX,
              y: found.localY,
              faceW: targetFacePlacement?.faceW ?? 0,
              faceH: targetFacePlacement?.faceH ?? 0,
              itemW: item.face.width,
              itemH: item.face.height,
              scale: item.placement.scale,
              rotation: item.placement.rotation,
            })

            setImportedItems((prev) =>
              prev.map((p) =>
                p.id === item.id
                  ? {
                      ...p,
                      placement: {
                        ...p.placement,
                        faceId: found.faceId,
                        x: snapped.x,
                        y: snapped.y,
                      },
                    }
                  : p,
              ),
            )
          }
        }
      }
    }

    if (dragState.mode !== 'pan') {
      onEndImportedItemsEdit?.()
    }
    setDragState(null)
  }

  const handleMouseLeave = () => {
    axisLockRef.current = null
    if (dragState && dragState.mode !== 'pan') {
      onEndImportedItemsEdit?.()
    }
    setDragState(null)
  }

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    if (!svgRef.current) return
    event.preventDefault()
    event.stopPropagation()

    const factor = event.deltaY > 0 ? 0.9 : 1.1
    const nextZoom = Math.min(3, Math.max(0.25, zoom * factor))
    if (Math.abs(nextZoom - zoom) < 1e-6) return

    const mouse = getSvgPoint(event.clientX, event.clientY)
    if (!mouse) return

    const nextW = width / Math.max(nextZoom, 0.01)
    const nextH = height / Math.max(nextZoom, 0.01)

    const k = nextZoom / zoom
    const nextPan = {
      x: mouse.x - (mouse.x - pan.x) / k,
      y: mouse.y - (mouse.y - pan.y) / k,
    }

    setZoom(nextZoom)
    setPan(clampPan(nextPan, nextW, nextH))
  }

  return (
    <div className="flex h-full min-h-[360px] flex-col gap-2">
      <div
        className="relative flex-1 overflow-hidden rounded-md border border-slate-300 bg-white"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
      >
        <svg
          ref={svgRef}
          viewBox={`${pan.x} ${pan.y} ${viewW} ${viewH}`}
          preserveAspectRatio="xMidYMid slice"
          className="absolute inset-0 h-full w-full"
        >
            <defs>
              <pattern
                id="gridMinor"
                width={Math.max(0.1, gridSize)}
                height={Math.max(0.1, gridSize)}
                patternUnits="userSpaceOnUse"
              >
                <path d={`M ${Math.max(0.1, gridSize)} 0 L 0 0 0 ${Math.max(0.1, gridSize)}`} fill="none" stroke="#e5e7eb" strokeWidth={0.15} />
              </pattern>
              <pattern
                id="gridMajor"
                width={Math.max(0.1, gridSize) * 5}
                height={Math.max(0.1, gridSize) * 5}
                patternUnits="userSpaceOnUse"
              >
                <path
                  d={`M ${Math.max(0.1, gridSize) * 5} 0 L 0 0 0 ${Math.max(0.1, gridSize) * 5}`}
                  fill="none"
                  stroke="#cbd5e1"
                  strokeWidth={0.2}
                />
              </pattern>
            </defs>

            {showGrid ? (
              <g pointerEvents="none">
                <rect x={pan.x} y={pan.y} width={viewW} height={viewH} fill="url(#gridMinor)" />
                <rect x={pan.x} y={pan.y} width={viewW} height={viewH} fill="url(#gridMajor)" opacity={0.7} />
              </g>
            ) : null}

            <g strokeWidth={0.2} fill="none">
              {layout.placedFaces.map((placed) => {
                if (placed.overflow) return null
                const ox = placed.face.offset?.x ?? 0
                const oy = placed.face.offset?.y ?? 0
                const rot = (placed.rotation ?? 0) as 0 | 90
                const faceH = placed.face.height
                const faceTransform =
                  rot === 90
                    ? `translate(${placed.x + faceH} ${placed.y}) rotate(90) translate(${ox} ${oy})`
                    : `translate(${placed.x + ox} ${placed.y + oy})`
                return (
                  <g key={placed.face.id} transform={faceTransform}>
                    {placed.face.paths.map((p, idx) => (
                      <path
                        key={idx}
                        d={p.d}
                        stroke={p.op === 'cut' ? '#ff0000' : p.op === 'score' ? '#0000ff' : 'none'}
                        fill={p.op === 'engrave' ? '#000000' : 'none'}
                      />
                    ))}

                    {getItemForFace(placed.face.id).map((item) => {
                      const place = item.placement
                      const cx = place.x
                      const cy = place.y
                      const rotDeg = (place.rotation * 180) / Math.PI
                      const s = place.scale
                      const w = item.face.width
                      const h = item.face.height
                      const ox2 = item.face.offset?.x ?? 0
                      const oy2 = item.face.offset?.y ?? 0

                      const scaledW = w * s
                      const scaledH = h * s

                      const selected = selectedImportedId === item.id
                      const boxStroke = selected ? '#0ea5e9' : 'transparent'
                      const handleFill = '#ffffff'
                      const handleStroke = '#0ea5e9'
                      const handleSize = Math.max(1.5, Math.min(4, Math.min(viewW, viewH) * 0.01))
                      const rotateOffset = handleSize * 3

                      return (
                        <g
                          key={item.id}
                          transform={`translate(${cx} ${cy}) rotate(${rotDeg})`}
                          onMouseDown={(e) => {
                            e.stopPropagation()
                            setSelectedImportedId(item.id)
                            onBeginImportedItemsEdit?.()
                            const mouse = getSvgPoint(e.clientX, e.clientY)
                            if (!mouse) return
                            const facePlacement = facePlacementMap.get(placed.face.id)
                            if (!facePlacement) return
                            const local = globalToFaceLocal(facePlacement, mouse)
                            setDragState({
                              mode: 'move',
                              itemId: item.id,
                              startClient: { x: e.clientX, y: e.clientY },
                              startPan: pan,
                              startPlacement: { ...place },
                              startLocal: local,
                            })
                          }}
                        >
                          <rect
                            x={-scaledW / 2}
                            y={-scaledH / 2}
                            width={scaledW}
                            height={scaledH}
                            fill="transparent"
                            stroke="none"
                            pointerEvents="all"
                          />
                          <g transform={`scale(${s}) translate(${-w / 2 + ox2} ${-h / 2 + oy2})`}>
                            {item.face.paths.map((p, idx) => (
                              <path
                                key={idx}
                                d={p.d}
                                stroke={p.op === 'cut' ? '#ff0000' : p.op === 'score' ? '#0000ff' : 'none'}
                                fill={p.op === 'engrave' ? '#000000' : 'none'}
                              />
                            ))}
                          </g>

                          {selected ? (
                            <g>
                              <rect
                                x={-scaledW / 2}
                                y={-scaledH / 2}
                                width={scaledW}
                                height={scaledH}
                                fill="none"
                                stroke={boxStroke}
                                strokeWidth={0.35}
                              />

                              <circle
                                cx={0}
                                cy={-scaledH / 2 - rotateOffset}
                                r={handleSize}
                                fill={handleFill}
                                stroke={handleStroke}
                                strokeWidth={0.35}
                                onMouseDown={(e) => {
                                  e.stopPropagation()
                                  onBeginImportedItemsEdit?.()
                                  const mouse = getSvgPoint(e.clientX, e.clientY)
                                  if (!mouse) return
                                  const facePlacement = facePlacementMap.get(placed.face.id)
                                  if (!facePlacement) return
                                  const local = globalToFaceLocal(facePlacement, mouse)
                                  setDragState({
                                    mode: 'rotate',
                                    itemId: item.id,
                                    startClient: { x: e.clientX, y: e.clientY },
                                    startPan: pan,
                                    startPlacement: { ...place },
                                    startLocal: local,
                                  })
                                }}
                              />

                              {([
                                { k: 'nw', x: -scaledW / 2, y: -scaledH / 2 },
                                { k: 'ne', x: scaledW / 2, y: -scaledH / 2 },
                                { k: 'se', x: scaledW / 2, y: scaledH / 2 },
                                { k: 'sw', x: -scaledW / 2, y: scaledH / 2 },
                              ] as const).map((hnd) => (
                                <rect
                                  key={hnd.k}
                                  x={hnd.x - handleSize}
                                  y={hnd.y - handleSize}
                                  width={handleSize * 2}
                                  height={handleSize * 2}
                                  fill={handleFill}
                                  stroke={handleStroke}
                                  strokeWidth={0.35}
                                  onMouseDown={(e) => {
                                    e.stopPropagation()
                                    onBeginImportedItemsEdit?.()
                                    const mouse = getSvgPoint(e.clientX, e.clientY)
                                    if (!mouse) return
                                    const facePlacement = facePlacementMap.get(placed.face.id)
                                    if (!facePlacement) return
                                    const local = globalToFaceLocal(facePlacement, mouse)
                                    setDragState({
                                      mode: 'scale',
                                      itemId: item.id,
                                      handle: hnd.k,
                                      startClient: { x: e.clientX, y: e.clientY },
                                      startPan: pan,
                                      startPlacement: { ...place },
                                      startLocal: local,
                                    })
                                  }}
                                />
                              ))}
                            </g>
                          ) : null}
                        </g>
                      )
                    })}
                  </g>
                )
              })}
            </g>
        </svg>
      </div>
      {footer ? <div>{footer}</div> : null}
      <div className="flex items-center justify-between gap-2 text-[11px] text-slate-400">
        <div className="flex items-center gap-2">
          <span className="whitespace-nowrap">Zoom</span>
          <input
            type="range"
            min={0.25}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => {
              const nextZoom = Number(e.target.value)
              const prevZoom = zoom
              const prevW = width / Math.max(prevZoom, 0.01)
              const prevH = height / Math.max(prevZoom, 0.01)
              const centerX = pan.x + prevW / 2
              const centerY = pan.y + prevH / 2
              const nextW = width / Math.max(nextZoom, 0.01)
              const nextH = height / Math.max(nextZoom, 0.01)
              setZoom(nextZoom)
              setPan(clampPan({ x: centerX - nextW / 2, y: centerY - nextH / 2 }, nextW, nextH))
            }}
            className="h-1 w-40 cursor-pointer accent-sky-500"
          />
          <span className="tabular-nums">{Math.round(zoom * 100)}%</span>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1 text-[11px] text-slate-400">
            <input type="checkbox" checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} />
            <span>Grid</span>
          </label>
          <label className="flex items-center gap-1 text-[11px] text-slate-400">
            <input type="checkbox" checked={snapEnabled} onChange={(e) => setSnapEnabled(e.target.checked)} />
            <span>Snap</span>
          </label>
          <label className="flex items-center gap-1 text-[11px] text-slate-400">
            <span>Size</span>
            <input
              type="number"
              min={0.1}
              step={0.1}
              value={gridSize}
              onChange={(e) => setGridSize(Math.max(0.1, Number(e.target.value) || 10))}
              className="w-16 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-200"
            />
          </label>
        </div>
        <button
          type="button"
          onClick={() => {
            setZoom(1)
            setPan({ x: 0, y: 0 })
          }}
          className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-200 hover:border-sky-500 hover:text-sky-200"
        >
          Reset view
        </button>
      </div>
    </div>
  )
}
