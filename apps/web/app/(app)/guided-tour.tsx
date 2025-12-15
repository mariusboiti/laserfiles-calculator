'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useT } from './i18n';

type GuidedTourStep = {
  id: string;
  path: string;
  selector: string;
  title: string;
  description: string;
};

type GuidedTourState = {
  active: boolean;
  stepIndex: number;
};

const storageKey = 'guidedTourState';

const steps: GuidedTourStep[] = [
  {
    id: 'welcome',
    path: '/',
    selector: '[data-tour="dashboard-tutorial-card"]',
    title: 'guided_tour.welcome.title',
    description: 'guided_tour.welcome.desc',
  },
  {
    id: 'sidebar',
    path: '/',
    selector: '[data-tour="nav-materials"]',
    title: 'guided_tour.sidebar.title',
    description: 'guided_tour.sidebar.desc',
  },
  {
    id: 'materials-add',
    path: '/materials',
    selector: '[data-tour="materials-low-stock-toggle"]',
    title: 'guided_tour.materials.title',
    description: 'guided_tour.materials.desc',
  },
  {
    id: 'customers',
    path: '/customers',
    selector: '[data-tour="customers-add-form"]',
    title: 'guided_tour.customers.title',
    description: 'guided_tour.customers.desc',
  },
  {
    id: 'pricing',
    path: '/pricing',
    selector: '[data-tour="pricing-calc-button"]',
    title: 'guided_tour.pricing.title',
    description: 'guided_tour.pricing.desc',
  },
  {
    id: 'quotes',
    path: '/quotes',
    selector: '[data-tour="quotes-table"]',
    title: 'guided_tour.quotes.title',
    description: 'guided_tour.quotes.desc',
  },
  {
    id: 'orders',
    path: '/orders',
    selector: '[data-tour="orders-new-order"]',
    title: 'guided_tour.orders.title',
    description: 'guided_tour.orders.desc',
  },
  {
    id: 'finish',
    path: '/',
    selector: '[data-tour="nav-tutorial"]',
    title: 'guided_tour.finish.title',
    description: 'guided_tour.finish.desc',
  },
];

function loadState(): GuidedTourState {
  if (typeof window === 'undefined') return { active: false, stepIndex: 0 };
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return { active: false, stepIndex: 0 };
    const parsed = JSON.parse(raw);
    return {
      active: Boolean(parsed?.active),
      stepIndex: typeof parsed?.stepIndex === 'number' ? parsed.stepIndex : 0,
    };
  } catch {
    return { active: false, stepIndex: 0 };
  }
}

function saveState(state: GuidedTourState) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(storageKey, JSON.stringify(state));
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function GuidedTour() {
  const router = useRouter();
  const pathname = usePathname();
  const t = useT();

  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [targetReady, setTargetReady] = useState(false);

  const rafRef = useRef<number | null>(null);

  const step = useMemo(() => steps[clamp(stepIndex, 0, steps.length - 1)], [stepIndex]);

  useEffect(() => {
    const loaded = loadState();
    setActive(loaded.active);
    setStepIndex(clamp(loaded.stepIndex, 0, steps.length - 1));
  }, []);

  useEffect(() => {
    function onStart() {
      const next = { active: true, stepIndex: 0 };
      saveState(next);
      setActive(true);
      setStepIndex(0);
    }

    function onStop() {
      const next = { active: false, stepIndex: 0 };
      saveState(next);
      setActive(false);
      setStepIndex(0);
    }

    window.addEventListener('guidedTour:start', onStart as any);
    window.addEventListener('guidedTour:stop', onStop as any);
    return () => {
      window.removeEventListener('guidedTour:start', onStart as any);
      window.removeEventListener('guidedTour:stop', onStop as any);
    };
  }, []);

  useEffect(() => {
    if (!active) return;
    saveState({ active, stepIndex });
  }, [active, stepIndex]);

  useEffect(() => {
    if (!active) return;

    setTargetRect(null);
    setTargetReady(false);

    if (!step) return;

    if (pathname !== step.path) {
      router.push(step.path);
      return;
    }

    const start = Date.now();
    const timeoutMs = 4500;

    const tick = () => {
      const el = document.querySelector(step.selector) as HTMLElement | null;
      if (el) {
        const rect = el.getBoundingClientRect();
        setTargetRect(rect);
        setTargetReady(true);
        el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        return;
      }

      if (Date.now() - start > timeoutMs) {
        setTargetRect(null);
        setTargetReady(true);
        return;
      }

      rafRef.current = window.requestAnimationFrame(tick);
    };

    rafRef.current = window.requestAnimationFrame(tick);

    return () => {
      if (rafRef.current != null) {
        window.cancelAnimationFrame(rafRef.current);
      }
    };
  }, [active, pathname, router, step?.path, step?.selector, stepIndex]);

  useEffect(() => {
    if (!active) return;

    function onResize() {
      if (!step) return;
      const el = document.querySelector(step.selector) as HTMLElement | null;
      if (!el) return;
      setTargetRect(el.getBoundingClientRect());
    }

    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
    };
  }, [active, step]);

  if (!active || !step) return null;

  const hasPrev = stepIndex > 0;
  const hasNext = stepIndex < steps.length - 1;

  const padding = 8;
  const rect = targetRect;
  const highlight = rect
    ? {
        left: Math.max(0, rect.left - padding),
        top: Math.max(0, rect.top - padding),
        width: Math.min(window.innerWidth, rect.width + padding * 2),
        height: Math.min(window.innerHeight, rect.height + padding * 2),
      }
    : null;

  let popoverTop = 96;
  let popoverLeft = 24;

  if (highlight) {
    const preferredTop = highlight.top + highlight.height + 12;
    const preferredLeft = highlight.left;

    const popoverWidth = 360;
    const popoverHeight = 170;

    const fitsBelow = preferredTop + popoverHeight <= window.innerHeight - 16;
    popoverTop = fitsBelow ? preferredTop : Math.max(16, highlight.top - popoverHeight - 12);

    popoverLeft = clamp(preferredLeft, 16, window.innerWidth - popoverWidth - 16);
  }

  return (
    <div className="fixed inset-0 z-[9999]">
      <div className="absolute inset-0 bg-black/60" />

      {highlight && (
        <div
          className="absolute rounded-lg border border-sky-500/70"
          style={{
            left: highlight.left,
            top: highlight.top,
            width: highlight.width,
            height: highlight.height,
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.60)',
            background: 'transparent',
          }}
        />
      )}

      <div
        className="absolute w-[360px] rounded-xl border border-slate-700 bg-slate-950 p-4 text-xs text-slate-200 shadow-xl"
        style={{ left: popoverLeft, top: popoverTop }}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
              {t('guided_tour.title')}
            </div>
            <div className="mt-1 text-base font-semibold text-slate-50">{t(step.title)}</div>
          </div>
          <button
            type="button"
            onClick={() => {
              saveState({ active: false, stepIndex: 0 });
              setActive(false);
              setStepIndex(0);
            }}
            className="rounded-md border border-slate-700 px-2 py-1 text-[11px] text-slate-200 hover:bg-slate-800"
          >
            {t('guided_tour.close')}
          </button>
        </div>

        <div className="mt-2 text-[11px] text-slate-300">{t(step.description)}</div>

        {!targetReady && (
          <div className="mt-2 text-[11px] text-slate-500">{t('guided_tour.finding')}</div>
        )}

        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            disabled={!hasPrev}
            onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
            className="rounded-md border border-slate-700 px-3 py-1 text-[11px] text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t('guided_tour.back')}
          </button>

          <div className="text-[11px] text-slate-500">
            {t('guided_tour.step')} {stepIndex + 1} / {steps.length}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                saveState({ active: false, stepIndex: 0 });
                setActive(false);
                setStepIndex(0);
              }}
              className="rounded-md border border-slate-700 px-3 py-1 text-[11px] text-slate-200 hover:bg-slate-800"
            >
              {t('guided_tour.skip')}
            </button>
            <button
              type="button"
              disabled={!hasNext}
              onClick={() => setStepIndex((i) => Math.min(steps.length - 1, i + 1))}
              className="rounded-md bg-sky-500 px-3 py-1 text-[11px] font-medium text-white hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t('guided_tour.next')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
