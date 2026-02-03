import type { GeneratedLayout, ImportedItem } from './types'

/**
 * Generate an SVG string for the provided layout.
 * The SVG uses mm-like units so it can be imported into laser software.
 */
export function generateBoxSvg(
  layout: GeneratedLayout | null,
  importedItems: ImportedItem[] = [],
  options: { includeLabels?: boolean } = {},
): string {
  if (!layout || layout.placedFaces.length === 0) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" />'
  }

  const width = Math.max(layout.layoutWidth, 10)
  const height = Math.max(layout.layoutHeight, 10)
  const includeLabels = Boolean(options.includeLabels)

  const parts: string[] = []
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" version="1.1" width="${width}mm" height="${height}mm" viewBox="0 0 ${width} ${height}">`,
  )

  const ops = ['cut', 'score', 'engrave'] as const
  for (const op of ops) {
    const label = op.toUpperCase()
    parts.push(`<g inkscape:groupmode="layer" inkscape:label="${label}" id="${label}">`)

    for (const placed of layout.placedFaces) {
      if (placed.overflow) continue

      const ox = placed.face.offset?.x ?? 0
      const oy = placed.face.offset?.y ?? 0
      parts.push(`<g transform="translate(${placed.x + ox} ${placed.y + oy})">`)

      for (const path of placed.face.paths) {
        if (path.op !== op) continue
        const stroke = path.op === 'cut' ? '#ff0000' : path.op === 'score' ? '#0000ff' : 'none'
        const fill = path.op === 'engrave' ? '#000000' : 'none'
        const strokeWidth = path.op === 'engrave' ? 0 : 0.2
        parts.push(`<path d="${path.d}" stroke="${stroke}" fill="${fill}" stroke-width="${strokeWidth}" />`)
      }

      const itemsForFace = importedItems.filter((it) => it.placement.faceId === placed.face.id)
      for (const item of itemsForFace) {
        const place = item.placement
        const w = item.face.width
        const h = item.face.height
        const ox2 = item.face.offset?.x ?? 0
        const oy2 = item.face.offset?.y ?? 0
        const rotDeg = (place.rotation * 180) / Math.PI
        const s = Math.max(place.scale, 0.01)

        const matchingPaths = item.face.paths.filter((p) => p.op === op)
        if (matchingPaths.length === 0) continue

        parts.push(
          `<g transform="translate(${place.x} ${place.y}) rotate(${rotDeg}) scale(${s}) translate(${-w / 2 + ox2} ${-h / 2 + oy2})">`,
        )
        for (const path of matchingPaths) {
          const stroke = path.op === 'cut' ? '#ff0000' : path.op === 'score' ? '#0000ff' : 'none'
          const fill = path.op === 'engrave' ? '#000000' : 'none'
          const strokeWidth = path.op === 'engrave' ? 0 : 0.2
          parts.push(`<path d="${path.d}" stroke="${stroke}" fill="${fill}" stroke-width="${strokeWidth}" />`)
        }
        parts.push('</g>')
      }

      parts.push('</g>')
    }

    parts.push('</g>')
  }

  if (includeLabels) {
    parts.push('<g inkscape:groupmode="layer" inkscape:label="LABELS" id="LABELS">')
    for (const placed of layout.placedFaces) {
      if (placed.overflow) continue
      const ox = placed.face.offset?.x ?? 0
      const oy = placed.face.offset?.y ?? 0
      const cx = placed.x + ox + placed.face.width / 2
      const cy = placed.y + oy + placed.face.height / 2
      parts.push(
        `<text x="${cx}" y="${cy}" font-size="4" text-anchor="middle" dominant-baseline="middle" fill="#000000">${placed.face.name}</text>`,
      )

      const itemsForFace = importedItems.filter((it) => it.placement.faceId === placed.face.id)
      for (const item of itemsForFace) {
        const x = placed.x + ox + item.placement.x
        const y = placed.y + oy + item.placement.y
        parts.push(
          `<text x="${x}" y="${y}" font-size="3" text-anchor="middle" dominant-baseline="middle" fill="#000000">${item.fileName}</text>`,
        )
      }
    }
    parts.push('</g>')
  }

  parts.push('</svg>')

  return parts.join('')
}
