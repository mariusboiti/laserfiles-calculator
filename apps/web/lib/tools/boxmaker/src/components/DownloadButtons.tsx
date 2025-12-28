import type { FC } from 'react'
import { useState } from 'react'
import type { GeneratedLayout, ImportedItem } from '../lib/types'
import { generateBoxDxf } from '../lib/dxfExport'
import { generateBoxSvg } from '../lib/svgExport'

interface DownloadButtonsProps {
  layout: GeneratedLayout | null
  importedItems: ImportedItem[]
}

export const DownloadButtons: FC<DownloadButtonsProps> = ({ layout, importedItems }) => {
  const [includeLabels, setIncludeLabels] = useState(false)

  const handleDownloadSvg = () => {
    if (!layout) return
    const svg = generateBoxSvg(layout, importedItems, { includeLabels })
    const blob = new Blob([svg], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = 'laser-box.svg'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleDownloadDxf = () => {
    if (!layout) return
    const dxf = generateBoxDxf(layout, importedItems, { includeLabels })
    const blob = new Blob([dxf], { type: 'application/dxf' })
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = 'laser-box.dxf'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="mt-2 flex flex-col gap-2 text-xs">
      <label className="flex items-center gap-2 text-[11px] text-slate-400">
        <input type="checkbox" checked={includeLabels} onChange={(e) => setIncludeLabels(e.target.checked)} />
        <span>Include labels layer</span>
      </label>
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={handleDownloadSvg}
          disabled={!layout || !layout.placedFaces.length}
          className="rounded-md border border-emerald-500/70 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-100 shadow-sm enabled:hover:border-emerald-400 enabled:hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-900 disabled:text-slate-500"
        >
          Download SVG
        </button>
        <button
          type="button"
          onClick={handleDownloadDxf}
          disabled={!layout || !layout.placedFaces.length}
          className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 shadow-sm enabled:hover:border-slate-500 enabled:hover:bg-slate-800/60 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-900 disabled:text-slate-500"
        >
          Download DXF
        </button>
      </div>
    </div>
  )
}
