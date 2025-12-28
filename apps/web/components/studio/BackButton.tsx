'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export type BackButtonProps = {
  fallbackHref?: string;
  label?: string;
  className?: string;
};

export function BackButton({ fallbackHref = '/studio/tools', label = 'Back', className = '' }: BackButtonProps) {
  const router = useRouter();
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    setCanGoBack(window.history.length > 1);
  }, []);

  const handleBack = () => {
    if (canGoBack) {
      router.back();
    } else {
      router.push(fallbackHref);
    }
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/50 ${className}`}
      aria-label={label}
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
      <span>{label}</span>
    </button>
  );
}
