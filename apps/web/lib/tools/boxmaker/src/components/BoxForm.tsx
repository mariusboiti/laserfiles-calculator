import { useMemo, useState, type ChangeEvent, type FC, type ReactNode } from 'react'
import type { BoxSettings, LaserMachinePreset, MaterialPreset } from '../lib/types'
import { BOX_TYPES, LID_TYPES } from '../lib/boxTypes'
import { DEFAULT_MATERIAL_PRESETS } from '../lib/presets'

interface BoxFormProps {
  settings: BoxSettings
  onChange: (next: BoxSettings) => void
  mode: 'simple' | 'advanced'
  onModeChange: (mode: 'simple' | 'advanced') => void
  materialPresets: MaterialPreset[]
  machinePresets: LaserMachinePreset[]
  onSaveMaterialPreset: (preset: MaterialPreset) => void
  onDeleteMaterialPreset: (presetId: string) => void
  boxMakerModeSelector?: ReactNode
  unitSystem?: 'mm' | 'in'
  lockedSettings?: Partial<BoxSettings>
  hideModeToggle?: boolean
}

function update<T extends object, K extends keyof T>(obj: T, key: K, value: T[K]): T {
  return { ...obj, [key]: value }
}

export const BoxForm: FC<BoxFormProps> = ({
  settings,
  onChange,
  mode,
  onModeChange,
  materialPresets,
  machinePresets,
  onSaveMaterialPreset,
  onDeleteMaterialPreset,
  boxMakerModeSelector,
  unitSystem = 'mm',
  lockedSettings,
  hideModeToggle,
}) => {
  const value = settings
  const [selectedMaterialPresetId, setSelectedMaterialPresetId] = useState<string>('manual')
  const [selectedMachinePresetId, setSelectedMachinePresetId] = useState<string>('manual')

  const [savingMaterialPreset, setSavingMaterialPreset] = useState(false)
  const [materialPresetName, setMaterialPresetName] = useState('')

  const defaultMaterialPresetIds = new Set(DEFAULT_MATERIAL_PRESETS.map((p) => p.id))
  const selectedMaterialPreset =
    selectedMaterialPresetId === 'manual'
      ? null
      : materialPresets.find((preset) => preset.id === selectedMaterialPresetId) ?? null
  const selectedMachinePreset =
    selectedMachinePresetId === 'manual'
      ? null
      : machinePresets.find((preset) => preset.id === selectedMachinePresetId) ?? null

  const isSelectedMaterialPresetDefault =
    selectedMaterialPresetId !== 'manual' && defaultMaterialPresetIds.has(selectedMaterialPresetId)

  const createId = (prefix: string): string => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `${prefix}-${crypto.randomUUID()}`
    }

    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
  }

  const handleNumberChange = (key: keyof BoxSettings) => (event: ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value
    const parsed = raw === '' ? 0 : Number(raw)
    if (Number.isNaN(parsed)) return

    if (key === 'materialThickness' || key === 'kerf') {
      setSelectedMaterialPresetId('manual')
    }

    onChange(update(value, key, parsed as never))
  }

  const MM_PER_INCH = 25.4
  const unitLabel = unitSystem
  const toUserLen = (mm: number) => (unitSystem === 'in' ? mm / MM_PER_INCH : mm)
  const fromUserLen = (val: number) => (unitSystem === 'in' ? val * MM_PER_INCH : val)
  const stepLen = unitSystem === 'in' ? 0.01 : 0.1
  const stepKerf = unitSystem === 'in' ? 0.001 : 0.01

  const handleLengthChange = (key: keyof BoxSettings) => (event: ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value
    const parsed = raw === '' ? 0 : Number(raw)
    if (Number.isNaN(parsed)) return

    if (key === 'materialThickness' || key === 'kerf') {
      setSelectedMaterialPresetId('manual')
    }

    onChange(update(value, key, fromUserLen(parsed) as never))
  }

  const handleCheckboxChange = (key: keyof BoxSettings) => (event: ChangeEvent<HTMLInputElement>) => {
    const checked = event.target.checked

    if (key === 'arrangeOnSheet' && checked && selectedMachinePreset) {
      onChange({
        ...value,
        arrangeOnSheet: checked,
        sheetWidth: selectedMachinePreset.maxWidthMm,
        sheetHeight: selectedMachinePreset.maxHeightMm,
      })
      return
    }

    if (key === 'dividersEnabled' && checked) {
      onChange({
        ...value,
        dividersEnabled: true,
        dividerCountX: Math.max(2, Math.floor(value.dividerCountX || 0)),
        dividerCountZ: Math.max(2, Math.floor(value.dividerCountZ || 0)),
      })
      return
    }

    onChange(update(value, key, checked as never))
  }

  const handleSelectChange = (key: keyof BoxSettings) => (event: ChangeEvent<HTMLSelectElement>) => {
    onChange(update(value, key, event.target.value as never))
  }

  const handleRadioChange = (key: keyof BoxSettings, option: string) => () => {
    onChange(update(value, key, option as never))
  }

  const handleMaterialPresetChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const id = event.target.value
    setSelectedMaterialPresetId(id)
    if (id === 'manual') return

    const preset = materialPresets.find((p) => p.id === id)
    if (!preset) return

    onChange({
      ...value,
      materialThickness: preset.materialThickness,
      kerf: preset.kerf,
    })
  }

  const handleMachinePresetChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const id = event.target.value
    setSelectedMachinePresetId(id)
    if (id === 'manual') return

    const preset = machinePresets.find((p) => p.id === id)
    if (!preset) return

    if (!value.arrangeOnSheet) return

    onChange({
      ...value,
      sheetWidth: preset.maxWidthMm,
      sheetHeight: preset.maxHeightMm,
    })
  }

  const simpleThicknessOption = useMemo(() => {
    const t = Math.round(value.materialThickness * 10) / 10
    if (t === 2 || t === 3 || t === 4 || t === 6) return String(t)
    return 'custom'
  }, [value.materialThickness])

  const simpleMachineOption = useMemo(() => {
    if (!value.arrangeOnSheet) return 'other'
    const w = Math.round(value.sheetWidth)
    const h = Math.round(value.sheetHeight)
    if (w === 495 && h === 279) return 'glowforge'
    if (w === 430 && h === 400) return 'xtool_d1'
    return 'other'
  }, [value.arrangeOnSheet, value.sheetHeight, value.sheetWidth])


  const simpleLidOption = useMemo(() => {
    if (value.lidType === 'none') return 'none'
    if (value.lidType === 'sliding_lid') return 'sliding'
    return 'flat'
  }, [value.lidType])

  const handleSimpleDimensionChange =
    (key: 'width' | 'height' | 'depth') => (event: ChangeEvent<HTMLInputElement>) => {
      const raw = event.target.value
      const parsed = raw === '' ? 0 : Number(raw)
      if (Number.isNaN(parsed)) return

      onChange({
        ...value,
        dimensionReference: 'inside',
        [key]: fromUserLen(parsed),
      })
    }

  const handleSimpleDimensionBlur = (key: 'width' | 'height' | 'depth') => () => {
    const current = value[key]
    if (!Number.isFinite(current)) return

    const clamped = Math.min(1000, Math.max(20, current))
    const snapped = Math.round(clamped * 2) / 2

    if (snapped === current && value.dimensionReference === 'inside') return

    onChange({
      ...value,
      dimensionReference: 'inside',
      [key]: snapped,
    })
  }

  const handleSimpleThicknessChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const opt = event.target.value
    if (opt === 'custom') return
    const thickness = Number(opt)
    if (!Number.isFinite(thickness)) return

    onChange({
      ...value,
      materialThickness: thickness,
    })
  }


  const handleSimpleLidChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const opt = event.target.value
    if (opt === 'none') {
      onChange({
        ...value,
        lidType: 'none',
      })
      return
    }

    if (opt === 'sliding') {
      const t = Math.max(value.materialThickness, 0.1)
      onChange({
        ...value,
        lidType: 'sliding_lid',
        grooveDepth: t,
        grooveOffset: t,
      })
      return
    }

    onChange({
      ...value,
      lidType: 'flat_lid',
    })
  }

  const handleSimpleMachineChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const opt = event.target.value
    if (opt === 'glowforge') {
      onChange({
        ...value,
        arrangeOnSheet: true,
        sheetWidth: 495,
        sheetHeight: 279,
      })
      return
    }

    if (opt === 'xtool_d1') {
      onChange({
        ...value,
        arrangeOnSheet: true,
        sheetWidth: 430,
        sheetHeight: 400,
      })
      return
    }

    onChange({
      ...value,
      arrangeOnSheet: false,
    })
  }

  return (
    <form className="flex flex-col gap-4 text-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="inline-flex overflow-hidden rounded-md border border-slate-800 bg-slate-950">
          <button
            type="button"
            onClick={() => onModeChange('simple')}
            className={
              mode === 'simple'
                ? 'px-3 py-1 text-[11px] font-medium text-slate-950 bg-sky-300'
                : 'px-3 py-1 text-[11px] text-slate-200 hover:bg-slate-900'
            }
          >
            Simple
          </button>
          <button
            type="button"
            onClick={() => onModeChange('advanced')}
            className={
              mode === 'advanced'
                ? 'px-3 py-1 text-[11px] font-medium text-slate-950 bg-sky-300'
                : 'px-3 py-1 text-[11px] text-slate-200 hover:bg-slate-900'
            }
          >
            Advanced
          </button>
        </div>
        <span className="text-[11px] text-slate-500">Configure → preview → download</span>
      </div>

      {mode === 'simple' ? (
        <section className="space-y-3">
          <p className="text-[11px] text-slate-400">
            1. Choose a box model, 2. Adjust dimensions, 3. Download the SVG and cut it on your laser.
          </p>

          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-300">Box model</div>
            {boxMakerModeSelector ? <div>{boxMakerModeSelector}</div> : null}
          </div>

          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-300">Internal dimensions ({unitLabel})</div>
            <div className="grid grid-cols-3 gap-2">
              <label className="flex flex-col gap-1">
                <span className="text-xs text-slate-400">Width</span>
                <input
                  type="number"
                  min={toUserLen(20)}
                  max={toUserLen(1000)}
                  step={stepLen}
                  value={toUserLen(value.dimensionReference === 'inside' ? value.width : value.width)}
                  onChange={handleSimpleDimensionChange('width')}
                  onBlur={handleSimpleDimensionBlur('width')}
                  className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs focus:border-sky-500 focus:outline-none"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-slate-400">Height</span>
                <input
                  type="number"
                  min={toUserLen(20)}
                  max={toUserLen(1000)}
                  step={stepLen}
                  value={toUserLen(value.height)}
                  onChange={handleSimpleDimensionChange('height')}
                  onBlur={handleSimpleDimensionBlur('height')}
                  className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs focus:border-sky-500 focus:outline-none"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-slate-400">Depth</span>
                <input
                  type="number"
                  min={toUserLen(20)}
                  max={toUserLen(1000)}
                  step={stepLen}
                  value={toUserLen(value.depth)}
                  onChange={handleSimpleDimensionChange('depth')}
                  onBlur={handleSimpleDimensionBlur('depth')}
                  className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs focus:border-sky-500 focus:outline-none"
                />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1 text-xs">
              <span className="text-slate-400">Material thickness</span>
              <select
                className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs focus:border-sky-500 focus:outline-none"
                value={simpleThicknessOption}
                onChange={handleSimpleThicknessChange}
              >
                <option value="2">{unitSystem === 'in' ? `${toUserLen(2).toFixed(2)} in` : '2 mm'}</option>
                <option value="3">{unitSystem === 'in' ? `${toUserLen(3).toFixed(2)} in` : '3 mm'}</option>
                <option value="4">{unitSystem === 'in' ? `${toUserLen(4).toFixed(2)} in` : '4 mm'}</option>
                <option value="6">{unitSystem === 'in' ? `${toUserLen(6).toFixed(2)} in` : '6 mm'}</option>
                <option value="custom">Custom</option>
              </select>
            </label>
            {simpleThicknessOption === 'custom' ? (
              <label className="flex flex-col gap-1 text-xs">
                <span className="text-slate-400">Custom thickness</span>
                <input
                  type="number"
                  min={toUserLen(0.5)}
                  max={toUserLen(30)}
                  step={stepLen}
                  value={toUserLen(value.materialThickness)}
                  onChange={handleLengthChange('materialThickness')}
                  className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs focus:border-sky-500 focus:outline-none"
                />
              </label>
            ) : (
              <div />
            )}
          </div>

          <label className="flex flex-col gap-1 text-xs">
            <span className="text-slate-400">Lid</span>
            <select
              className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs focus:border-sky-500 focus:outline-none"
              value={simpleLidOption}
              onChange={handleSimpleLidChange}
            >
              <option value="none">No lid</option>
              <option value="flat">Flat lid</option>
              <option value="sliding">Sliding lid</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-xs">
            <span className="text-slate-400">Machine</span>
            <select
              className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs focus:border-sky-500 focus:outline-none"
              value={simpleMachineOption}
              onChange={handleSimpleMachineChange}
            >
              <option value="glowforge">Glowforge</option>
              <option value="xtool_d1">xTool D1</option>
              <option value="other">Other</option>
            </select>
          </label>

          <div className="space-y-2">
            <button
              type="button"
              onClick={() => {
                document.getElementById('preview-panel')?.scrollIntoView({ behavior: 'smooth' })
              }}
              className="w-full rounded-md border border-sky-500/70 bg-sky-500/15 px-3 py-2 text-xs font-semibold text-sky-100 hover:border-sky-400 hover:bg-sky-500/25"
            >
              Update preview &amp; download
            </button>
            <p className="text-[11px] text-slate-500">The SVG will be ready for LightBurn, Glowforge, xTool, and other laser cutters.</p>
          </div>
        </section>
      ) : null}

      {mode === 'advanced' ? (
        <div className="space-y-3">
      {/* Dimensions */}
      <details open className="rounded-md border border-slate-800 bg-slate-950 p-2">
        <summary className="cursor-pointer select-none text-xs font-semibold uppercase tracking-wide text-slate-300">
          Dimensions
        </summary>
        <div className="mt-2 space-y-2">
        <div className="grid grid-cols-3 gap-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-400">Width (X)</span>
            <input
              type="number"
              min={toUserLen(1)}
              step={stepLen}
              value={toUserLen(value.width)}
              onChange={handleLengthChange('width')}
              className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs focus:border-sky-500 focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-400">Height (Y)</span>
            <input
              type="number"
              min={toUserLen(1)}
              step={stepLen}
              value={toUserLen(value.height)}
              onChange={handleLengthChange('height')}
              className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs focus:border-sky-500 focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-400">Depth (Z)</span>
            <input
              type="number"
              min={toUserLen(1)}
              step={stepLen}
              value={toUserLen(value.depth)}
              onChange={handleLengthChange('depth')}
              className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs focus:border-sky-500 focus:outline-none"
            />
          </label>
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-slate-300">
          <span className="text-[11px] font-medium text-slate-400">Dimension reference</span>
          <label className="inline-flex items-center gap-1">
            <input
              type="radio"
              className="h-3 w-3"
              checked={value.dimensionReference === 'inside'}
              onChange={handleRadioChange('dimensionReference', 'inside')}
            />
            <span>Inside (clear)</span>
          </label>
          <label className="inline-flex items-center gap-1">
            <input
              type="radio"
              className="h-3 w-3"
              checked={value.dimensionReference === 'outside'}
              onChange={handleRadioChange('dimensionReference', 'outside')}
            />
            <span>Outside (overall)</span>
          </label>
        </div>
        </div>
      </details>

      {/* Material */}
      <details open className="rounded-md border border-slate-800 bg-slate-950 p-2">
        <summary className="cursor-pointer select-none text-xs font-semibold uppercase tracking-wide text-slate-300">
          Material &amp; Kerf
        </summary>
        <div className="mt-2 space-y-2">
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-slate-400">Material preset</span>
            <select
              className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs focus:border-sky-500 focus:outline-none"
              value={selectedMaterialPresetId}
              onChange={handleMaterialPresetChange}
            >
              <option value="manual">None (manual)</option>
              {materialPresets.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name}
                </option>
              ))}
            </select>
          </label>
          {selectedMaterialPreset?.notes ? (
            <p className="text-[11px] text-slate-500">{selectedMaterialPreset.notes}</p>
          ) : null}

          <label className="flex flex-col gap-1 text-xs">
            <span className="text-slate-400">Machine preset</span>
            <select
              className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs focus:border-sky-500 focus:outline-none"
              value={selectedMachinePresetId}
              onChange={handleMachinePresetChange}
            >
              <option value="manual">None (manual)</option>
              {machinePresets.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name}
                </option>
              ))}
            </select>
          </label>
          {selectedMachinePreset?.notes ? (
            <p className="text-[11px] text-slate-500">{selectedMachinePreset.notes}</p>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setSavingMaterialPreset(true)
                setMaterialPresetName('')
              }}
              className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-200 hover:border-sky-500 hover:text-sky-200"
            >
              Save current material as preset
            </button>
            <button
              type="button"
              disabled={selectedMaterialPresetId === 'manual' || isSelectedMaterialPresetDefault}
              onClick={() => {
                if (selectedMaterialPresetId === 'manual') return
                if (isSelectedMaterialPresetDefault) return

                const ok = window.confirm('Delete selected material preset?')
                if (!ok) return

                onDeleteMaterialPreset(selectedMaterialPresetId)
                setSelectedMaterialPresetId('manual')
              }}
              className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-200 enabled:hover:border-rose-500 enabled:hover:text-rose-200 disabled:cursor-not-allowed disabled:text-slate-500"
            >
              Delete selected preset
            </button>
          </div>

          {savingMaterialPreset ? (
            <div className="space-y-2 rounded-md border border-slate-800 bg-slate-950 p-2">
              <label className="flex flex-col gap-1 text-xs">
                <span className="text-slate-400">Preset name</span>
                <input
                  type="text"
                  value={materialPresetName}
                  onChange={(e) => setMaterialPresetName(e.target.value)}
                  className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs focus:border-sky-500 focus:outline-none"
                />
              </label>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSavingMaterialPreset(false)}
                  className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-200 hover:border-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const name = materialPresetName.trim()
                    if (!name) return

                    const preset: MaterialPreset = {
                      id: createId('material'),
                      name,
                      materialThickness: value.materialThickness,
                      kerf: value.kerf,
                    }

                    onSaveMaterialPreset(preset)
                    setSelectedMaterialPresetId(preset.id)
                    setSavingMaterialPreset(false)
                    setMaterialPresetName('')
                  }}
                  className="rounded-md border border-emerald-500/70 bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-100 hover:border-emerald-400 hover:bg-emerald-500/20"
                >
                  Save
                </button>
              </div>
            </div>
          ) : null}
        <div className="grid grid-cols-3 gap-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-400">Thickness</span>
            <input
              type="number"
              min={toUserLen(0.5)}
              max={toUserLen(30)}
              step={stepLen}
              value={toUserLen(value.materialThickness)}
              onChange={handleLengthChange('materialThickness')}
              className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs focus:border-sky-500 focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-400">Kerf</span>
            <input
              type="number"
              min={0}
              max={toUserLen(0.5)}
              step={stepKerf}
              value={toUserLen(value.kerf)}
              onChange={handleLengthChange('kerf')}
              className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs focus:border-sky-500 focus:outline-none"
            />
          </label>
          <label className="mt-4 inline-flex items-center gap-2 text-xs text-slate-300">
            <input
              type="checkbox"
              className="h-3 w-3"
              checked={value.applyKerfCompensation}
              onChange={handleCheckboxChange('applyKerfCompensation')}
            />
            <span>Apply kerf compensation</span>
          </label>
        </div>
        </div>
      </details>

      {/* Box style & joints */}
      <details className="rounded-md border border-slate-800 bg-slate-950 p-2">
        <summary className="cursor-pointer select-none text-xs font-semibold uppercase tracking-wide text-slate-300">
          Joints &amp; style
        </summary>
        <div className="mt-2 space-y-2">
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-slate-400">Box type</span>
          <select
            className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs focus:border-sky-500 focus:outline-none"
            value={value.boxType}
            onChange={handleSelectChange('boxType')}
          >
            {BOX_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </label>

        {(value.boxType === 'finger_all_edges' || value.boxType === 'finger_vertical_edges') && (
          <div className="space-y-2 rounded-md bg-slate-900/60 p-2">
            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1">
                <span className="text-xs text-slate-400">Min finger size</span>
                <input
                  type="number"
                  min={toUserLen(1)}
                  step={stepLen}
                  value={toUserLen(value.fingerMin)}
                  onChange={handleLengthChange('fingerMin')}
                  className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs focus:border-sky-500 focus:outline-none"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-slate-400">Max finger size</span>
                <input
                  type="number"
                  min={toUserLen(1)}
                  step={stepLen}
                  value={toUserLen(value.fingerMax)}
                  onChange={handleLengthChange('fingerMax')}
                  className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs focus:border-sky-500 focus:outline-none"
                />
              </label>
            </div>
            <label className="inline-flex items-center gap-2 text-xs text-slate-300">
              <input
                type="checkbox"
                className="h-3 w-3"
                checked={value.autoFingerCount}
                onChange={handleCheckboxChange('autoFingerCount')}
              />
              <span>Auto-calculate finger count</span>
            </label>
            {!value.autoFingerCount && (
              <label className="flex flex-col gap-1">
                <span className="text-xs text-slate-400">Fingers per edge</span>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={value.manualFingerCount ?? ''}
                  onChange={handleNumberChange('manualFingerCount')}
                  className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs focus:border-sky-500 focus:outline-none"
                />
              </label>
            )}
          </div>
        )}
        </div>
      </details>

      {/* Lid options */}
      <details className="rounded-md border border-slate-800 bg-slate-950 p-2">
        <summary className="cursor-pointer select-none text-xs font-semibold uppercase tracking-wide text-slate-300">
          Lid &amp; grooves
        </summary>
        <div className="mt-2 space-y-2">
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-slate-400">Lid type</span>
          <select
            className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs focus:border-sky-500 focus:outline-none"
            value={value.lidType}
            onChange={handleSelectChange('lidType')}
          >
            {LID_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </label>

        {value.lidType === 'sliding_lid' && (
          <div className="mt-1 grid grid-cols-2 gap-2 text-xs">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-slate-400">Groove depth</span>
              <input
                type="number"
                min={0}
                step={stepLen}
                value={toUserLen(value.grooveDepth)}
                onChange={handleLengthChange('grooveDepth')}
                className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs focus:border-sky-500 focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-slate-400">Groove offset</span>
              <input
                type="number"
                min={0}
                step={stepLen}
                value={toUserLen(value.grooveOffset)}
                onChange={handleLengthChange('grooveOffset')}
                className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs focus:border-sky-500 focus:outline-none"
              />
            </label>
          </div>
        )}

        {value.lidType === 'flat_lid_with_lip' && (
          <div className="mt-1 grid grid-cols-2 gap-2 text-xs">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-slate-400">Lip inset</span>
              <input
                type="number"
                min={0}
                step={stepLen}
                value={toUserLen(value.lipInset)}
                onChange={handleLengthChange('lipInset')}
                className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs focus:border-sky-500 focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-slate-400">Lip height</span>
              <input
                type="number"
                min={0}
                step={stepLen}
                value={toUserLen(value.lipHeight)}
                onChange={handleLengthChange('lipHeight')}
                className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs focus:border-sky-500 focus:outline-none"
              />
            </label>
          </div>
        )}
        </div>
      </details>

      {/* Dividers */}
      <details className="rounded-md border border-slate-800 bg-slate-950 p-2">
        <summary className="cursor-pointer select-none text-xs font-semibold uppercase tracking-wide text-slate-300">
          Dividers
        </summary>
        <div className="mt-2 space-y-2">
          <div className="flex items-center justify-between text-xs">
          <label className="inline-flex items-center gap-2 text-xs text-slate-300">
            <input
              type="checkbox"
              className="h-3 w-3"
              checked={value.dividersEnabled}
              onChange={handleCheckboxChange('dividersEnabled')}
            />
            <span>Add internal grid dividers</span>
          </label>
          </div>

        {value.dividersEnabled && (
          <div className="grid grid-cols-3 gap-2 text-xs">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-slate-400">Compartments X</span>
              <input
                type="number"
                min={1}
                step={1}
                value={value.dividerCountX}
                onChange={handleNumberChange('dividerCountX')}
                className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs focus:border-sky-500 focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-slate-400">Compartments Z</span>
              <input
                type="number"
                min={1}
                step={1}
                value={value.dividerCountZ}
                onChange={handleNumberChange('dividerCountZ')}
                className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs focus:border-sky-500 focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-slate-400">Slot clearance</span>
              <input
                type="number"
                min={0}
                step={unitSystem === 'in' ? 0.01 : 0.05}
                value={toUserLen(value.dividerClearance)}
                onChange={handleLengthChange('dividerClearance')}
                className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs focus:border-sky-500 focus:outline-none"
              />
            </label>
          </div>
        )}
        </div>
      </details>

      {/* Layout / sheet */}
      <details className="rounded-md border border-slate-800 bg-slate-950 p-2">
        <summary className="cursor-pointer select-none text-xs font-semibold uppercase tracking-wide text-slate-300">
          Layout on sheet
        </summary>
        <div className="mt-2 space-y-2">
          <div className="flex items-center justify-between text-xs">
          <label className="inline-flex items-center gap-2 text-xs text-slate-300">
            <input
              type="checkbox"
              className="h-3 w-3"
              checked={value.arrangeOnSheet}
              onChange={handleCheckboxChange('arrangeOnSheet')}
            />
            <span>Arrange parts on sheet</span>
          </label>
          </div>

        {value.arrangeOnSheet && (
          <div className="grid grid-cols-3 gap-2 text-xs">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-slate-400">Sheet width</span>
              <input
                type="number"
                min={toUserLen(10)}
                step={stepLen}
                value={toUserLen(value.sheetWidth)}
                onChange={handleLengthChange('sheetWidth')}
                className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs focus:border-sky-500 focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-slate-400">Sheet height</span>
              <input
                type="number"
                min={toUserLen(10)}
                step={stepLen}
                value={toUserLen(value.sheetHeight)}
                onChange={handleLengthChange('sheetHeight')}
                className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs focus:border-sky-500 focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-slate-400">Part spacing</span>
              <input
                type="number"
                min={0}
                step={stepLen}
                value={toUserLen(value.partSpacing)}
                onChange={handleLengthChange('partSpacing')}
                className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs focus:border-sky-500 focus:outline-none"
              />
            </label>
            <label className="col-span-3 inline-flex items-center gap-2 text-xs text-slate-300">
              <input
                type="checkbox"
                className="h-3 w-3"
                checked={Boolean(value.autoRotateParts)}
                onChange={handleCheckboxChange('autoRotateParts')}
              />
              <span>Auto-rotate parts</span>
            </label>
          </div>
        )}
        </div>
      </details>
        </div>
      ) : null}
    </form>
  )
}
