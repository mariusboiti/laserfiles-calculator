'use client';

import type { ReactNode } from 'react';

export type ToolEmptyStateAction = {
  label: string;
  onClick: () => void;
};

export type ToolEmptyStateQuickAction = {
  label: string;
  onClick: () => void;
};

export type ToolEmptyStateProps = {
  title: string;
  description: string;
  primaryAction: ToolEmptyStateAction;
  secondaryAction?: ToolEmptyStateAction;
  quickActions?: ToolEmptyStateQuickAction[];
  icon?: ReactNode;
};

export function ToolEmptyState({
  title,
  description,
  primaryAction,
  secondaryAction,
  quickActions,
  icon,
}: ToolEmptyStateProps) {
  return (
    <div className="pointer-events-auto w-[min(560px,calc(100vw-2rem))] rounded-xl border border-slate-800 bg-slate-950/80 p-5 shadow-xl backdrop-blur">
      <div className="flex items-start gap-3">
        {icon ? (
          <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/60">
            {icon}
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="text-base font-semibold text-slate-100">{title}</div>
          <div className="mt-1 text-sm text-slate-300">{description}</div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={primaryAction.onClick}
          className="rounded-md bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600"
        >
          {primaryAction.label}
        </button>

        {secondaryAction ? (
          <button
            type="button"
            onClick={secondaryAction.onClick}
            className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-900"
          >
            {secondaryAction.label}
          </button>
        ) : null}
      </div>

      {quickActions && quickActions.length > 0 ? (
        <div className="mt-4">
          <div className="text-xs font-medium text-slate-400">Example preset</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {quickActions.map((qa) => (
              <button
                key={qa.label}
                type="button"
                onClick={qa.onClick}
                className="rounded-full border border-slate-800 bg-slate-900/60 px-3 py-1 text-xs text-slate-200 hover:bg-slate-900"
              >
                {qa.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
