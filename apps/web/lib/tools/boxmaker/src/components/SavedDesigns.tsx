import type { FC } from 'react'
import { useMemo, useState } from 'react'
import type { BoxDesignSaved, BoxSettings } from '../lib/types'

export type SavedDesignsProps = {
  currentSettings: BoxSettings
  savedDesigns: BoxDesignSaved[]
  onChangeSavedDesigns: (next: BoxDesignSaved[]) => void
  onLoadDesign: (settings: BoxSettings) => void
}

function createId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`
  }

  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}

function defaultDesignName(settings: BoxSettings): string {
  const w = Number.isFinite(settings.width) ? settings.width : 0
  const d = Number.isFinite(settings.depth) ? settings.depth : 0
  const h = Number.isFinite(settings.height) ? settings.height : 0
  return `Box ${w}×${d}×${h} mm`
}

export const SavedDesigns: FC<SavedDesignsProps> = ({
  currentSettings,
  savedDesigns,
  onChangeSavedDesigns,
  onLoadDesign,
}) => {
  const [saving, setSaving] = useState(false)
  const [designName, setDesignName] = useState('')

  const sortedDesigns = useMemo(() => {
    return [...savedDesigns].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }, [savedDesigns])

  const handleSave = () => {
    const name = designName.trim()
    if (!name) return

    const now = new Date().toISOString()
    const existing = savedDesigns.find((d) => d.name === name)

    if (existing) {
      const ok = window.confirm(`Overwrite existing design "${name}"?`)
      if (!ok) return

      const updated: BoxDesignSaved = {
        ...existing,
        updatedAt: now,
        settings: currentSettings,
      }

      const next = savedDesigns.map((d) => (d.id === existing.id ? updated : d))
      onChangeSavedDesigns(next)
      setSaving(false)
      return
    }

    const created: BoxDesignSaved = {
      id: createId('design'),
      name,
      createdAt: now,
      updatedAt: now,
      settings: currentSettings,
    }

    const next = [created, ...savedDesigns]
    onChangeSavedDesigns(next)
    setSaving(false)
  }

  const handleDelete = (id: string) => {
    const design = savedDesigns.find((d) => d.id === id)
    if (!design) return

    const ok = window.confirm(`Delete saved design "${design.name}"?`)
    if (!ok) return

    const next = savedDesigns.filter((d) => d.id !== id)
    onChangeSavedDesigns(next)
  }

  return (
    <section className="mt-4 space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-300">Saved designs</h2>
        <button
          type="button"
          onClick={() => {
            setSaving(true)
            setDesignName(defaultDesignName(currentSettings))
          }}
          className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-200 hover:border-sky-500 hover:text-sky-200"
        >
          Save current design
        </button>
      </div>

      {saving ? (
        <div className="space-y-2 rounded-md border border-slate-800 bg-slate-950 p-2">
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-slate-400">Design name</span>
            <input
              type="text"
              value={designName}
              onChange={(e) => setDesignName(e.target.value)}
              className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs focus:border-sky-500 focus:outline-none"
            />
          </label>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setSaving(false)}
              className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-200 hover:border-slate-500"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="rounded-md border border-emerald-500/70 bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-100 hover:border-emerald-400 hover:bg-emerald-500/20"
            >
              Save
            </button>
          </div>
        </div>
      ) : null}

      {!sortedDesigns.length ? (
        <p className="text-[11px] text-slate-500">No saved designs yet.</p>
      ) : (
        <div className="space-y-2">
          {sortedDesigns.map((design) => {
            const w = design.settings.width
            const d = design.settings.depth
            const h = design.settings.height
            const t = design.settings.materialThickness

            return (
              <div
                key={design.id}
                className="rounded-md border border-slate-800 bg-slate-950 p-2 text-[11px] text-slate-200"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium text-slate-100">{design.name}</div>
                    <div className="mt-0.5 text-slate-500">
                      {w}×{d}×{h} mm | {t} mm
                    </div>
                    <div className="mt-0.5 text-slate-500">{new Date(design.updatedAt).toLocaleString()}</div>
                  </div>
                  <div className="flex shrink-0 flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => onLoadDesign(design.settings)}
                      className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-200 hover:border-sky-500 hover:text-sky-200"
                    >
                      Load
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(design.id)}
                      className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-200 hover:border-rose-500 hover:text-rose-200"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
