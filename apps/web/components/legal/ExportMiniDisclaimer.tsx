'use client';

export type ExportMiniDisclaimerProps = {
  className?: string;
};

export function ExportMiniDisclaimer({ className = '' }: ExportMiniDisclaimerProps) {
  return (
    <div className={`text-[11px] text-slate-400 ${className}`}>
      Always review the exported file before cutting. LaserFilesPro is a design assistance tool.
    </div>
  );
}
