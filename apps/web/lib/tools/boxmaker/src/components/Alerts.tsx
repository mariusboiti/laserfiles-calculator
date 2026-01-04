import type { FC } from 'react'

interface AlertsProps {
  warnings: string[]
}

export const Alerts: FC<AlertsProps> = ({ warnings }) => {
  if (!warnings.length) return null

  return (
    <div className="space-y-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-100">
      <div className="flex items-center gap-2 font-semibold">
        <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-[10px] font-bold text-slate-950">
          !
        </span>
        <span>Warnings</span>
      </div>
      <ul className="list-disc space-y-1 pl-5">
        {warnings.map((w, idx) => (
          <li key={idx}>{w}</li>
        ))}
      </ul>
    </div>
  )
}
