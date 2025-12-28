import type { FC } from 'react'
import type { BoxMetrics } from '../lib/types'

type MetricsBarProps = {
  metrics: BoxMetrics | null
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

export const MetricsBar: FC<MetricsBarProps> = ({ metrics }) => {
  if (!metrics) return null

  const cutLengthM = round2(metrics.totalCutLengthMm / 1000)
  const areaCm2 = round2(metrics.totalAreaMm2 / 100)

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-800 bg-slate-950 px-2 py-1 text-[11px] text-slate-300">
      <div>
        <span className="text-slate-500">Estimated cut length:</span> <span className="tabular-nums">{cutLengthM}</span>{' '}
        <span className="text-slate-500">m</span>
      </div>
      <div>
        <span className="text-slate-500">Total panel area:</span> <span className="tabular-nums">{areaCm2}</span>{' '}
        <span className="text-slate-500">cm²</span>
      </div>
    </div>
  )
}
