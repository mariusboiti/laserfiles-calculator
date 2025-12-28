import type { FC } from 'react'

export type LayoutTabId = 'layout' | 'faces' | 'view3d'

interface LayoutTabsProps {
  activeTab: LayoutTabId
  onChange: (tab: LayoutTabId) => void
}

export const LayoutTabs: FC<LayoutTabsProps> = ({ activeTab, onChange }) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
      <div className="inline-flex overflow-hidden rounded-md border border-slate-800 bg-slate-950">
        <button
          type="button"
          onClick={() => onChange('layout')}
          className={
            activeTab === 'layout'
              ? 'px-3 py-1 text-[11px] font-medium text-slate-950 bg-sky-300'
              : 'px-3 py-1 text-[11px] text-slate-200 hover:bg-slate-900'
          }
        >
          2D Panels
        </button>
        <button
          type="button"
          onClick={() => onChange('faces')}
          className={
            activeTab === 'faces'
              ? 'px-3 py-1 text-[11px] font-medium text-slate-950 bg-sky-300'
              : 'px-3 py-1 text-[11px] text-slate-200 hover:bg-slate-900'
          }
        >
          Faces list
        </button>
        <button
          type="button"
          onClick={() => onChange('view3d')}
          className={
            activeTab === 'view3d'
              ? 'px-3 py-1 text-[11px] font-medium text-slate-950 bg-sky-300'
              : 'px-3 py-1 text-[11px] text-slate-200 hover:bg-slate-900'
          }
        >
          3D
        </button>
      </div>
      <span className="text-[11px] text-slate-500">Box Maker preview</span>
    </div>
  )
}
