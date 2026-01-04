'use client';

interface AICreditInfoProps {
  className?: string;
  showSecondLine?: boolean;
}

export function AICreditInfo({ className = '', showSecondLine = true }: AICreditInfoProps) {
  return (
    <div className={`text-xs text-slate-400 ${className}`}>
      <div>AI generation uses 1 credit per generation.</div>
      {showSecondLine && (
        <div className="mt-0.5 text-[11px] text-slate-500">Credits are only used when generation is triggered.</div>
      )}
    </div>
  );
}
