import { useEffect, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react'
import { BoxForm } from './components/BoxForm'
import { LayoutTabs, type LayoutTabId } from './components/LayoutTabs'
import { Preview2D } from './components/Preview2D'
import { BoxPreview3D } from './components/BoxPreview3D'
import { DownloadButtons } from './components/DownloadButtons'
import { Alerts } from './components/Alerts'
import { SavedDesigns } from './components/SavedDesigns'
import { MetricsBar } from './components/MetricsBar'
import { generateBoxGeometry } from './lib/boxGenerator'
import { generateLayout } from './lib/layout'
import { validateBoxSettings } from './lib/validation'
import { DEFAULT_MATERIAL_PRESETS } from './lib/presets'
import { loadMachinePresets, loadMaterialPresets, loadSavedBoxes, saveMaterialPresets, saveSavedBoxes } from './lib/storage'
import { decodeSettingsFromQuery, encodeSettingsToQuery } from './lib/share'
import { computeBoxMetrics } from './lib/metrics'
import { applySimpleDefaults } from './lib/defaults'
import { importSvgAsFace } from './lib/svgImport'
import type {
  BoxDesignSaved,
  BoxMetrics,
  BoxSettings,
  GeneratedLayout,
  ImportedItem,
  LaserMachinePreset,
  MaterialPreset,
  PathOperation,
} from './lib/types'

type ImportHistory = {
  past: ImportedItem[][]
  present: ImportedItem[]
  future: ImportedItem[][]
}

const DEFAULT_SETTINGS: BoxSettings = {
  width: 100,
  height: 60,
  depth: 80,
  dimensionReference: 'inside',

  materialThickness: 3,
  kerf: 0.1,
  applyKerfCompensation: false,

  boxType: 'finger_all_edges',

  fingerMin: 5,
  fingerMax: 15,
  autoFingerCount: true,
  manualFingerCount: null,

  lidType: 'none',
  grooveDepth: 2,
  grooveOffset: 3,
  lipInset: 2,
  lipHeight: 8,

  dividersEnabled: false,
  dividerCountX: 1,
  dividerCountZ: 1,
  dividerClearance: 0.2,

  arrangeOnSheet: false,
  sheetWidth: 300,
  sheetHeight: 200,
  partSpacing: 3,
  autoRotateParts: false,
}

type AppProps = {
  boxMakerModeSelector?: ReactNode
  unitSystem?: 'mm' | 'in'
  initialSettings?: Partial<BoxSettings>
  lockedSettings?: Partial<BoxSettings>
  hideModeToggle?: boolean
  preserveSimpleDimensionReference?: boolean
}

function App({
  boxMakerModeSelector,
  unitSystem = 'mm',
  initialSettings,
  lockedSettings,
  hideModeToggle,
  preserveSimpleDimensionReference,
}: AppProps) {
  const MM_PER_INCH = 25.4
  const unitLabel = unitSystem
  const toUserLen = (mm: number) => (unitSystem === 'in' ? mm / MM_PER_INCH : mm)
  const fromUserLen = (val: number) => (unitSystem === 'in' ? val * MM_PER_INCH : val)
  const stepLen = unitSystem === 'in' ? 0.01 : 0.1

  const [uiMode, setUiMode] = useState<'simple' | 'advanced'>('simple')
  const initialDecodedSettings = typeof window !== 'undefined' ? decodeSettingsFromQuery(window.location.search) : null
  const initialHasConfig = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).has('config') : false

  const [settings, setSettings] = useState<BoxSettings>(() => {
    const base = initialDecodedSettings ?? DEFAULT_SETTINGS
    return {
      ...base,
      ...(initialSettings ?? {}),
      ...(lockedSettings ?? {}),
    }
  })
  const [layout, setLayout] = useState<GeneratedLayout | null>(null)
  const [metrics, setMetrics] = useState<BoxMetrics | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  const [importWarnings, setImportWarnings] = useState<string[]>([])
  const [urlConfigWarning] = useState<string | null>(() =>
    initialHasConfig && !initialDecodedSettings ? 'Invalid config in URL; using default settings.' : null,
  )
  const [activeTab, setActiveTab] = useState<LayoutTabId>('layout')
  const [materialPresets, setMaterialPresets] = useState<MaterialPreset[]>(() => loadMaterialPresets())
  const [machinePresets] = useState<LaserMachinePreset[]>(() => loadMachinePresets())
  const [savedDesigns, setSavedDesigns] = useState<BoxDesignSaved[]>(() => loadSavedBoxes())
  const [shareFeedback, setShareFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [importOp, setImportOp] = useState<PathOperation>('score')
  const [importHistory, setImportHistory] = useState<ImportHistory>({ past: [], present: [], future: [] })
  const [selectedImportedId, setSelectedImportedId] = useState<string | null>(null)

  const importedItems = importHistory.present
  const importedItemsRef = useRef<ImportedItem[]>(importedItems)
  const importEditStartRef = useRef<ImportedItem[] | null>(null)
  const importIsEditingRef = useRef(false)
  const nudgeEndHandleRef = useRef<number | null>(null)

  useEffect(() => {
    importedItemsRef.current = importedItems
  }, [importedItems])

  const HISTORY_LIMIT = 50

  const commitImportedItemsUpdate = (updater: (items: ImportedItem[]) => ImportedItem[]) => {
    setImportHistory((h) => {
      const next = updater(h.present)
      return {
        past: [...h.past, h.present].slice(-HISTORY_LIMIT),
        present: next,
        future: [],
      }
    })
  }

  const setImportedItemsLive: Dispatch<SetStateAction<ImportedItem[]>> = (update) => {
    setImportHistory((h) => {
      const next = typeof update === 'function' ? (update as (prev: ImportedItem[]) => ImportedItem[])(h.present) : update
      return {
        ...h,
        present: next,
      }
    })
  }

  const undoImports = () => {
    if (importIsEditingRef.current) return
    setImportHistory((h) => {
      if (h.past.length === 0) return h
      const prev = h.past[h.past.length - 1]
      const past = h.past.slice(0, -1)
      return {
        past,
        present: prev,
        future: [h.present, ...h.future].slice(0, HISTORY_LIMIT),
      }
    })
  }

  const redoImports = () => {
    if (importIsEditingRef.current) return
    setImportHistory((h) => {
      if (h.future.length === 0) return h
      const next = h.future[0]
      const future = h.future.slice(1)
      return {
        past: [...h.past, h.present].slice(-HISTORY_LIMIT),
        present: next,
        future,
      }
    })
  }

  const beginImportedItemsEdit = () => {
    if (importIsEditingRef.current) return
    importIsEditingRef.current = true
    importEditStartRef.current = importedItemsRef.current
  }

  const endImportedItemsEdit = () => {
    const start = importEditStartRef.current
    importEditStartRef.current = null
    if (!start) {
      importIsEditingRef.current = false
      return
    }

    setImportHistory((h) => {
      if (h.present === start) {
        importIsEditingRef.current = false
        return h
      }

      const a = JSON.stringify(start)
      const b = JSON.stringify(h.present)
      importIsEditingRef.current = false
      if (a === b) return h

      return {
        past: [...h.past, start].slice(-HISTORY_LIMIT),
        present: h.present,
        future: [],
      }
    })
  }

  const effectiveSettings =
    uiMode === 'simple'
      ? applySimpleDefaults(settings, { preserveDimensionReference: Boolean(preserveSimpleDimensionReference) })
      : settings

  const lockedEffectiveSettings = {
    ...effectiveSettings,
    ...(lockedSettings ?? {}),
  }

  const selectedImportedItem = selectedImportedId ? importedItems.find((x) => x.id === selectedImportedId) ?? null : null
  const selectedFace = selectedImportedItem?.placement.faceId
    ? layout?.faces?.find((f) => f.id === selectedImportedItem.placement.faceId) ?? null
    : null

  const normalizeAngleRad = (rad: number) => {
    const twoPi = Math.PI * 2
    let r = rad % twoPi
    if (r > Math.PI) r -= twoPi
    if (r < -Math.PI) r += twoPi
    return r
  }

  const setSelectedPlacementLive = (patch: Partial<ImportedItem['placement']>) => {
    if (!selectedImportedId) return
    setImportedItemsLive((prev) =>
      prev.map((item) =>
        item.id === selectedImportedId ? { ...item, placement: { ...item.placement, ...patch } } : item,
      ),
    )
  }

  useEffect(() => {
    if (!selectedImportedId) return
    if (importedItems.some((x) => x.id === selectedImportedId)) return
    setSelectedImportedId(null)
  }, [importedItems, selectedImportedId])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const tag = target?.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || (target as HTMLElement | null)?.isContentEditable) return
      if (!selectedImportedId) return
      if (importIsEditingRef.current) return

      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown' && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return

      e.preventDefault()
      e.stopPropagation()

      const stepMm = e.ctrlKey ? 0.1 : e.shiftKey ? 10 : 1
      const dx = e.key === 'ArrowLeft' ? -stepMm : e.key === 'ArrowRight' ? stepMm : 0
      const dy = e.key === 'ArrowUp' ? -stepMm : e.key === 'ArrowDown' ? stepMm : 0

      if (!importIsEditingRef.current) beginImportedItemsEdit()

      setImportedItemsLive((prev) =>
        prev.map((item) =>
          item.id === selectedImportedId
            ? { ...item, placement: { ...item.placement, x: item.placement.x + dx, y: item.placement.y + dy } }
            : item,
        ),
      )

      if (nudgeEndHandleRef.current) window.clearTimeout(nudgeEndHandleRef.current)
      nudgeEndHandleRef.current = window.setTimeout(() => {
        endImportedItemsEdit()
        nudgeEndHandleRef.current = null
      }, 250)
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selectedImportedId])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!e.ctrlKey) return
      const target = e.target as HTMLElement | null
      const tag = target?.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || (target as HTMLElement | null)?.isContentEditable) return
      if (importIsEditingRef.current) return

      if (e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault()
        undoImports()
      } else if (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey)) {
        e.preventDefault()
        redoImports()
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const handleSaveMaterialPreset = (preset: MaterialPreset) => {
    setMaterialPresets((prev) => {
      const next = [...prev, preset]
      saveMaterialPresets(next)
      return next
    })
  }

  const handleChangeSavedDesigns = (next: BoxDesignSaved[]) => {
    setSavedDesigns(next)
    saveSavedBoxes(next)
  }

  const handleDeleteMaterialPreset = (presetId: string) => {
    const defaultIds = new Set(DEFAULT_MATERIAL_PRESETS.map((p) => p.id))
    if (defaultIds.has(presetId)) return

    setMaterialPresets((prev) => {
      const next = prev.filter((p) => p.id !== presetId)
      saveMaterialPresets(next)
      return next
    })
  }

  useEffect(() => {
    const handle = setTimeout(() => {
      try {
        const effectiveSettings =
          uiMode === 'simple'
            ? applySimpleDefaults(settings, { preserveDimensionReference: Boolean(preserveSimpleDimensionReference) })
            : settings
        const result = generateBoxGeometry({ ...effectiveSettings, ...(lockedSettings ?? {}) })
        const generatedLayout = generateLayout(result.faces, {
          arrangeOnSheet: effectiveSettings.arrangeOnSheet,
          sheetWidth: effectiveSettings.sheetWidth,
          sheetHeight: effectiveSettings.sheetHeight,
          spacing: effectiveSettings.partSpacing,
          autoRotateParts: effectiveSettings.autoRotateParts,
        })

        const validationWarnings = validateBoxSettings(effectiveSettings, result.dimensions)
        const allWarnings = [
          ...result.warnings,
          ...generatedLayout.warnings,
          ...validationWarnings,
          ...importWarnings,
          ...(urlConfigWarning ? [urlConfigWarning] : []),
        ]

        setLayout(generatedLayout)
        setMetrics(computeBoxMetrics(generatedLayout))
        setWarnings(allWarnings)
      } catch (error) {
        console.error(error)
        setLayout(null)
        setMetrics(null)
        setWarnings(['An unexpected error occurred while generating the box geometry.'])
      }
    }, 200)

    return () => clearTimeout(handle)
  }, [settings, uiMode, urlConfigWarning, importedItems, importWarnings, lockedSettings, preserveSimpleDimensionReference])

  const handleUploadSvg = async (file: File) => {
    try {
      const text = await file.text()
      const id = `import-${Date.now()}-${Math.random().toString(16).slice(2)}`
      const face = importSvgAsFace({ svgText: text, id, op: importOp, label: file.name })
      if (!face) {
        setImportWarnings((prev) => [...prev, `Failed to import "${file.name}" (unsupported/empty SVG).`])
        return
      }

      // Attach to first available box face (by placement order) and place centered.
      const firstPlaced = layout?.placedFaces?.find((p) => !p.overflow) ?? null
      const faceId = firstPlaced?.face.id ?? null
      const fw = firstPlaced?.face.width ?? 0
      const fh = firstPlaced?.face.height ?? 0
      const x = Math.max(0, fw / 2)
      const y = Math.max(0, fh / 2)

      commitImportedItemsUpdate((prev) => [
        ...prev,
        {
          id,
          fileName: file.name,
          op: importOp,
          face,
          placement: {
            faceId,
            x,
            y,
            rotation: 0,
            scale: 1,
          },
        },
      ])
      setSelectedImportedId(id)
    } catch {
      setImportWarnings((prev) => [...prev, `Failed to read "${file.name}".`])
    }
  }

  const handleModeChange = (nextMode: 'simple' | 'advanced') => {
    if (nextMode === uiMode) return

    if (nextMode === 'simple') {
      if (settings.dimensionReference === 'outside') {
        const t = Math.max(settings.materialThickness, 0.1)
        setSettings({
          ...settings,
          dimensionReference: 'inside',
          width: Math.max(settings.width - 2 * t, 0.1),
          height: Math.max(settings.height - 2 * t, 0.1),
          depth: Math.max(settings.depth - 2 * t, 0.1),
        })
      }
    }

    setUiMode(nextMode)
  }

  const handleCopyShareLink = async () => {
    if (typeof window === 'undefined') return

    const config = encodeSettingsToQuery(settings)
    const url = `${window.location.origin}${window.location.pathname}?config=${config}`

    try {
      await navigator.clipboard.writeText(url)
      setShareFeedback({ type: 'success', text: 'Link copied to clipboard.' })
    } catch {
      setShareFeedback({ type: 'error', text: 'Failed to copy link. Your browser may block clipboard access.' })
    }

    window.setTimeout(() => setShareFeedback(null), 2500)
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      <header className="border-b border-slate-900 bg-slate-950/80">
        <div className="mx-auto flex w-full items-center justify-between gap-4 px-4 py-3">
          <div>
            <h1 className="text-sm font-semibold text-slate-100 md:text-base">LaserFilesPro Box Maker</h1>
            <p className="text-[11px] text-slate-400">
              Parametric laser-cut boxes with finger joints and clean SVG output.
            </p>
          </div>
          <span className="text-[11px] text-slate-500">MVP · browser-only geometry</span>
        </div>
      </header>
      <main className="mx-auto flex w-full flex-1 flex-col gap-4 px-4 py-4 md:flex-row">
        <section className="w-full md:w-80 lg:w-96">
          <div className="max-h-[calc(100vh-96px)] overflow-y-auto rounded-lg border border-slate-800 bg-slate-900/40 p-3 md:p-4">
            <BoxForm
              settings={settings}
              onChange={setSettings}
              mode={uiMode}
              onModeChange={handleModeChange}
              materialPresets={materialPresets}
              machinePresets={machinePresets}
              onSaveMaterialPreset={handleSaveMaterialPreset}
              onDeleteMaterialPreset={handleDeleteMaterialPreset}
              boxMakerModeSelector={boxMakerModeSelector}
              unitSystem={unitSystem}
              lockedSettings={lockedSettings}
              hideModeToggle={hideModeToggle}
            />

            {uiMode === 'advanced' ? (
              <SavedDesigns
                currentSettings={settings}
                savedDesigns={savedDesigns}
                onChangeSavedDesigns={handleChangeSavedDesigns}
                onLoadDesign={setSettings}
              />
            ) : null}
          </div>
        </section>
        <section id="preview-panel" className="mt-2 flex flex-1 flex-col gap-3 md:mt-0">
          <div className="flex flex-1 flex-col rounded-lg border border-slate-800 bg-slate-900/40 p-3 md:p-4">
            <LayoutTabs activeTab={activeTab} onChange={setActiveTab} />
            <div className="mt-3 flex-1">
              {activeTab === 'layout' ? (
                <Preview2D
                  layout={layout}
                  footer={<MetricsBar metrics={metrics} />}
                  importedItems={importedItems}
                  setImportedItems={setImportedItemsLive}
                  selectedImportedId={selectedImportedId}
                  setSelectedImportedId={setSelectedImportedId}
                  onBeginImportedItemsEdit={beginImportedItemsEdit}
                  onEndImportedItemsEdit={endImportedItemsEdit}
                />
              ) : activeTab === 'view3d' ? (
                <BoxPreview3D
                  settings={lockedEffectiveSettings}
                  faces={layout?.faces ?? null}
                  importedItems={importedItems}
                />
              ) : (
                <div className="max-h-[420px] overflow-auto rounded-md border border-slate-800 bg-slate-950 p-2 text-xs text-slate-200">
                  {!layout || !layout.faces.length ? (
                    <p className="text-slate-500">No faces generated yet.</p>
                  ) : (
                    <table className="w-full border-collapse text-[11px]">
                      <thead className="sticky top-0 bg-slate-900">
                        <tr className="text-left text-slate-400">
                          <th className="border-b border-slate-800 px-2 py-1 font-medium">Face</th>
                          <th className="border-b border-slate-800 px-2 py-1 font-medium">Width (mm)</th>
                          <th className="border-b border-slate-800 px-2 py-1 font-medium">Height (mm)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {layout.faces.map((face) => (
                          <tr key={face.id} className="odd:bg-slate-900/40">
                            <td className="border-b border-slate-900 px-2 py-1">{face.name}</td>
                            <td className="border-b border-slate-900 px-2 py-1 tabular-nums">
                              {face.width.toFixed(2)}
                            </td>
                            <td className="border-b border-slate-900 px-2 py-1 tabular-nums">
                              {face.height.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
            <div className="mt-2 space-y-2">
              <DownloadButtons layout={layout} importedItems={importedItems} />
              <div className="rounded-md border border-slate-800 bg-slate-950/40 p-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400">Upload SVG</span>
                    <input
                      type="file"
                      accept="image/svg+xml,.svg"
                      className="block w-[220px] text-[11px] text-slate-300 file:mr-3 file:rounded-md file:border-0 file:bg-slate-800 file:px-3 file:py-1.5 file:text-[11px] file:text-slate-200 hover:file:bg-slate-700"
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        if (!f) return
                        void handleUploadSvg(f)
                        e.currentTarget.value = ''
                      }}
                    />
                    <select
                      value={importOp}
                      onChange={(e) => setImportOp(e.target.value as PathOperation)}
                      className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-200"
                      title="Operation"
                    >
                      <option value="score">SCORE (blue)</option>
                      <option value="engrave">ENGRAVE (black fill)</option>
                      <option value="cut">CUT (red)</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      commitImportedItemsUpdate(() => [])
                      setImportWarnings([])
                    }}
                    disabled={importedItems.length === 0 && importWarnings.length === 0}
                    className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-200 enabled:hover:border-slate-500 disabled:cursor-not-allowed disabled:text-slate-500"
                  >
                    Clear imports
                  </button>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={undoImports}
                    disabled={importHistory.past.length === 0}
                    className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-200 enabled:hover:border-slate-500 disabled:cursor-not-allowed disabled:text-slate-500"
                  >
                    Undo
                  </button>
                  <button
                    type="button"
                    onClick={redoImports}
                    disabled={importHistory.future.length === 0}
                    className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-200 enabled:hover:border-slate-500 disabled:cursor-not-allowed disabled:text-slate-500"
                  >
                    Redo
                  </button>
                </div>

                {importedItems.length > 0 ? (
                  <div className="mt-2 space-y-1">
                    {importedItems.map((item) => (
                      <div key={item.id} className="flex items-center justify-between gap-2 text-[11px]">
                        <span className="truncate text-slate-300" title={item.fileName}>
                          {item.fileName}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            commitImportedItemsUpdate((prev) => prev.filter((x) => x.id !== item.id))
                            setSelectedImportedId((prev) => (prev === item.id ? null : prev))
                          }}
                          className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-200 hover:border-rose-500 hover:text-rose-200"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}

                {selectedImportedItem ? (
                  <div className="mt-3 rounded-md border border-slate-800 bg-slate-950/40 p-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-[11px] text-slate-300">
                        <span className="text-slate-500">Selected:</span> {selectedImportedItem.fileName}
                        {selectedFace ? <span className="text-slate-500"> · Face:</span> : null}{' '}
                        {selectedFace ? selectedFace.name : null}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            beginImportedItemsEdit()
                            setSelectedPlacementLive({ rotation: 0 })
                            endImportedItemsEdit()
                          }}
                          className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-200 hover:border-slate-500"
                        >
                          Reset rotation
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            beginImportedItemsEdit()
                            setSelectedPlacementLive({ scale: 1 })
                            endImportedItemsEdit()
                          }}
                          className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-200 hover:border-slate-500"
                        >
                          Reset scale
                        </button>
                        {selectedFace ? (
                          <button
                            type="button"
                            onClick={() => {
                              beginImportedItemsEdit()
                              setSelectedPlacementLive({ x: selectedFace.width / 2, y: selectedFace.height / 2 })
                              endImportedItemsEdit()
                            }}
                            className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-200 hover:border-slate-500"
                          >
                            Center
                          </button>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <label className="flex items-center justify-between gap-2 text-[11px] text-slate-400">
                        <span>X ({unitLabel})</span>
                        <input
                          type="number"
                          step={stepLen}
                          value={
                            Number.isFinite(selectedImportedItem.placement.x)
                              ? toUserLen(selectedImportedItem.placement.x)
                              : 0
                          }
                          onFocus={beginImportedItemsEdit}
                          onBlur={endImportedItemsEdit}
                          onChange={(e) => setSelectedPlacementLive({ x: fromUserLen(Number(e.target.value)) })}
                          className="w-24 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-200"
                        />
                      </label>
                      <label className="flex items-center justify-between gap-2 text-[11px] text-slate-400">
                        <span>Y ({unitLabel})</span>
                        <input
                          type="number"
                          step={stepLen}
                          value={
                            Number.isFinite(selectedImportedItem.placement.y)
                              ? toUserLen(selectedImportedItem.placement.y)
                              : 0
                          }
                          onFocus={beginImportedItemsEdit}
                          onBlur={endImportedItemsEdit}
                          onChange={(e) => setSelectedPlacementLive({ y: fromUserLen(Number(e.target.value)) })}
                          className="w-24 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-200"
                        />
                      </label>
                      <label className="flex items-center justify-between gap-2 text-[11px] text-slate-400">
                        <span>Rotation (deg)</span>
                        <input
                          type="number"
                          step={1}
                          value={
                            Number.isFinite(selectedImportedItem.placement.rotation)
                              ? (normalizeAngleRad(selectedImportedItem.placement.rotation) * 180) / Math.PI
                              : 0
                          }
                          onFocus={beginImportedItemsEdit}
                          onBlur={(e) => {
                            const deg = Number(e.currentTarget.value)
                            const rad = (deg * Math.PI) / 180
                            setSelectedPlacementLive({ rotation: normalizeAngleRad(rad) })
                            endImportedItemsEdit()
                          }}
                          onChange={(e) => {
                            const deg = Number(e.target.value)
                            const rad = (deg * Math.PI) / 180
                            setSelectedPlacementLive({ rotation: rad })
                          }}
                          className="w-24 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-200"
                        />
                      </label>
                      <label className="flex items-center justify-between gap-2 text-[11px] text-slate-400">
                        <span>Scale</span>
                        <input
                          type="number"
                          step={0.01}
                          min={0.01}
                          value={Number.isFinite(selectedImportedItem.placement.scale) ? selectedImportedItem.placement.scale : 1}
                          onFocus={beginImportedItemsEdit}
                          onBlur={endImportedItemsEdit}
                          onChange={(e) => setSelectedPlacementLive({ scale: Math.max(0.01, Number(e.target.value)) })}
                          className="w-24 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-200"
                        />
                      </label>
                    </div>

                    <div className="mt-2 text-[11px] text-slate-500">
                      Arrow keys move selected import. Shift = {toUserLen(10).toFixed(unitSystem === 'in' ? 2 : 1)}
                      {unitLabel}, Ctrl = {toUserLen(0.1).toFixed(unitSystem === 'in' ? 3 : 1)}
                      {unitLabel}.
                    </div>
                  </div>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handleCopyShareLink}
                  className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 hover:border-sky-500 hover:text-sky-200"
                >
                  Copy shareable link
                </button>
                {shareFeedback ? (
                  <span
                    className={
                      shareFeedback.type === 'success'
                        ? 'text-[11px] text-emerald-200'
                        : 'text-[11px] text-rose-200'
                    }
                  >
                    {shareFeedback.text}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
          <Alerts warnings={warnings} />
        </section>
      </main>
    </div>
  )
}

export default App
