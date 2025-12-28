'use client';

import { useMemo, useState } from 'react';
import { UpgradeModal } from './UpgradeModal';
import { usePlan } from '@/lib/studio/access/usePlan';
import { BackButton } from './BackButton';
import { StudioBreadcrumbs } from './StudioBreadcrumbs';

export type ToolShellProps = {
  slug: string;
  title: string;
  description: string;
  proFeatures?: string[];
  children: React.ReactNode;
  toolSlug?: string;
  showBack?: boolean;
  onReset?: () => void;
  onExport?: () => void;
  onHelp?: () => void;
  help?: React.ReactNode;
};

export function ToolShell({ 
  slug, 
  title, 
  description, 
  proFeatures, 
  children,
  toolSlug,
  showBack = true,
  onReset,
  onExport,
  onHelp,
  help,
}: ToolShellProps) {
  const { plan, canUse } = usePlan();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState<string | undefined>(undefined);
  const [helpOpen, setHelpOpen] = useState(false);

  const badge = useMemo(() => {
    return plan === 'pro' ? 'PRO' : 'FREE';
  }, [plan]);

  function requestPro(feature?: string) {
    if (canUse(feature)) return;
    setUpgradeFeature(feature);
    setUpgradeOpen(true);
  }

  const handleHelp = () => {
    if (onHelp) {
      onHelp();
      return;
    }

    if (help) {
      setHelpOpen((v) => !v);
    } else {
      requestPro('help');
    }
  };

  const handleReset = () => {
    if (onReset) {
      onReset();
      return;
    }

    requestPro('reset');
  };

  const handleExport = () => {
    if (onExport) {
      onExport();
    } else {
      requestPro('export');
    }
  };

  return (
    <div className="w-full h-[calc(100vh-6.5rem)] min-h-0 flex flex-col overflow-x-hidden">
      <div className="border-b border-slate-800 bg-slate-950/60 px-4 py-3 text-slate-100">
        {/* Back Button + Breadcrumbs */}
        {showBack && (
          <div className="mb-3 flex items-center gap-3">
            <BackButton />
            <StudioBreadcrumbs toolSlug={toolSlug || slug} />
          </div>
        )}

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="text-base font-semibold leading-6">{title}</div>
              <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-xs text-slate-200">
                {badge}
              </span>
            </div>
            <div className="mt-1 text-sm text-slate-300">{description}</div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="rounded-md border border-slate-700 px-3 py-2 text-xs text-slate-200 hover:bg-slate-900"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={handleHelp}
              className="rounded-md border border-slate-700 px-3 py-2 text-xs text-slate-200 hover:bg-slate-900"
            >
              Help
            </button>
            <button
              type="button"
              onClick={handleExport}
              className="rounded-md bg-sky-500 px-3 py-2 text-xs font-medium text-white hover:bg-sky-600"
            >
              Export
            </button>
          </div>
        </div>

        {help && helpOpen && (
          <div className="mt-3 rounded-lg border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-200">
            {help}
          </div>
        )}

        {proFeatures && proFeatures.length > 0 && plan !== 'pro' && (
          <div className="mt-3 flex flex-wrap gap-2">
            {proFeatures.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => requestPro(f)}
                className="rounded-full border border-slate-800 bg-slate-900/60 px-3 py-1 text-xs text-slate-300 hover:text-slate-100"
              >
                {f}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className={`lfs-tool lfs-tool-${slug} flex-1 min-h-0 overflow-x-hidden`}>{children}</div>

      <UpgradeModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        feature={upgradeFeature}
      />
    </div>
  );
}
