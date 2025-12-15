'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useT } from '../i18n';

type TutorialStep = {
  id: string;
  titleKey: string;
  descriptionKey: string;
  links?: { labelKey: string; href: string }[];
  checklist?: { id: string; labelKey: string }[];
};

type TutorialProgress = {
  completedStepIds: string[];
  completedChecklistItemIds: string[];
  lastStepId?: string;
};

const storageKey = 'tutorialProgress';

const steps: TutorialStep[] = [
  {
    id: 'intro',
    titleKey: 'tutorial.step.intro.title',
    descriptionKey: 'tutorial.step.intro.desc',
    links: [
      { labelKey: 'tutorial.step.intro.link.dashboard', href: '/' },
      { labelKey: 'tutorial.step.intro.link.pricing', href: '/pricing' },
      { labelKey: 'tutorial.step.intro.link.orders', href: '/orders' },
    ],
  },
  {
    id: 'materials',
    titleKey: 'tutorial.step.materials.title',
    descriptionKey: 'tutorial.step.materials.desc',
    links: [
      { labelKey: 'tutorial.step.materials.link.materials', href: '/materials' },
      { labelKey: 'tutorial.step.materials.link.new_order', href: '/orders/new' },
    ],
    checklist: [
      { id: 'm1', labelKey: 'tutorial.step.materials.check.m1' },
      { id: 'm2', labelKey: 'tutorial.step.materials.check.m2' },
      { id: 'm3', labelKey: 'tutorial.step.materials.check.m3' },
    ],
  },
  {
    id: 'customers',
    titleKey: 'tutorial.step.customers.title',
    descriptionKey: 'tutorial.step.customers.desc',
    links: [{ labelKey: 'tutorial.step.customers.link.customers', href: '/customers' }],
    checklist: [
      { id: 'c1', labelKey: 'tutorial.step.customers.check.c1' },
      { id: 'c2', labelKey: 'tutorial.step.customers.check.c2' },
    ],
  },
  {
    id: 'templates',
    titleKey: 'tutorial.step.templates.title',
    descriptionKey: 'tutorial.step.templates.desc',
    links: [
      { labelKey: 'tutorial.step.templates.link.templates', href: '/templates' },
      { labelKey: 'tutorial.step.templates.link.template_products', href: '/template-products' },
    ],
    checklist: [
      { id: 't1', labelKey: 'tutorial.step.templates.check.t1' },
      { id: 't2', labelKey: 'tutorial.step.templates.check.t2' },
    ],
  },
  {
    id: 'pricing',
    titleKey: 'tutorial.step.pricing.title',
    descriptionKey: 'tutorial.step.pricing.desc',
    links: [{ labelKey: 'tutorial.step.pricing.link.pricing', href: '/pricing' }],
    checklist: [
      { id: 'p1', labelKey: 'tutorial.step.pricing.check.p1' },
      { id: 'p2', labelKey: 'tutorial.step.pricing.check.p2' },
    ],
  },
  {
    id: 'quotes',
    titleKey: 'tutorial.step.quotes.title',
    descriptionKey: 'tutorial.step.quotes.desc',
    links: [{ labelKey: 'tutorial.step.quotes.link.quotes', href: '/quotes' }],
    checklist: [
      { id: 'q1', labelKey: 'tutorial.step.quotes.check.q1' },
      { id: 'q2', labelKey: 'tutorial.step.quotes.check.q2' },
    ],
  },
  {
    id: 'orders',
    titleKey: 'tutorial.step.orders.title',
    descriptionKey: 'tutorial.step.orders.desc',
    links: [
      { labelKey: 'tutorial.step.orders.link.orders', href: '/orders' },
      { labelKey: 'tutorial.step.orders.link.new_order', href: '/orders/new' },
      { labelKey: 'tutorial.step.orders.link.today_queue', href: '/today-queue' },
    ],
    checklist: [
      { id: 'o1', labelKey: 'tutorial.step.orders.check.o1' },
      { id: 'o2', labelKey: 'tutorial.step.orders.check.o2' },
      { id: 'o3', labelKey: 'tutorial.step.orders.check.o3' },
    ],
  },
  {
    id: 'production',
    titleKey: 'tutorial.step.production.title',
    descriptionKey: 'tutorial.step.production.desc',
    links: [
      { labelKey: 'tutorial.step.production.link.seasons', href: '/seasons' },
      { labelKey: 'tutorial.step.production.link.batches', href: '/batches' },
    ],
    checklist: [
      { id: 's1', labelKey: 'tutorial.step.production.check.s1' },
      { id: 's2', labelKey: 'tutorial.step.production.check.s2' },
    ],
  },
  {
    id: 'inventory',
    titleKey: 'tutorial.step.inventory.title',
    descriptionKey: 'tutorial.step.inventory.desc',
    links: [
      { labelKey: 'tutorial.step.inventory.link.materials', href: '/materials' },
      { labelKey: 'tutorial.step.inventory.link.offcuts', href: '/offcuts' },
    ],
    checklist: [
      { id: 'i1', labelKey: 'tutorial.step.inventory.check.i1' },
      { id: 'i2', labelKey: 'tutorial.step.inventory.check.i2' },
    ],
  },
  {
    id: 'sales-channels',
    titleKey: 'tutorial.step.sales_channels.title',
    descriptionKey: 'tutorial.step.sales_channels.desc',
    links: [{ labelKey: 'tutorial.step.sales_channels.link.sales_channels', href: '/sales-channels' }],
    checklist: [
      { id: 'sc1', labelKey: 'tutorial.step.sales_channels.check.sc1' },
      { id: 'sc2', labelKey: 'tutorial.step.sales_channels.check.sc2' },
    ],
  },
];

function loadProgress(): TutorialProgress {
  if (typeof window === 'undefined') {
    return { completedStepIds: [], completedChecklistItemIds: [] };
  }
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return { completedStepIds: [], completedChecklistItemIds: [] };
    const parsed = JSON.parse(raw);
    return {
      completedStepIds: Array.isArray(parsed?.completedStepIds) ? parsed.completedStepIds : [],
      completedChecklistItemIds: Array.isArray(parsed?.completedChecklistItemIds)
        ? parsed.completedChecklistItemIds
        : [],
      lastStepId: typeof parsed?.lastStepId === 'string' ? parsed.lastStepId : undefined,
    };
  } catch {
    return { completedStepIds: [], completedChecklistItemIds: [] };
  }
}

function saveProgress(progress: TutorialProgress) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(storageKey, JSON.stringify(progress));
}

export default function TutorialPage() {
  const t = useT();
  const [progress, setProgress] = useState<TutorialProgress>({
    completedStepIds: [],
    completedChecklistItemIds: [],
  });

  const [activeStepId, setActiveStepId] = useState<string>(steps[0]?.id ?? 'intro');

  useEffect(() => {
    const loaded = loadProgress();
    setProgress(loaded);
    if (loaded.lastStepId && steps.some((s) => s.id === loaded.lastStepId)) {
      setActiveStepId(loaded.lastStepId);
    }
  }, []);

  const activeIndex = useMemo(() => {
    const idx = steps.findIndex((s) => s.id === activeStepId);
    return idx >= 0 ? idx : 0;
  }, [activeStepId]);

  const activeStep = steps[activeIndex] ?? steps[0];

  const completion = useMemo(() => {
    const totalChecklistItems = steps.reduce((sum, s) => sum + (s.checklist?.length ?? 0), 0);
    const checklistDone = progress.completedChecklistItemIds.length;

    const total = steps.length + totalChecklistItems;
    const done = progress.completedStepIds.length + checklistDone;

    const percent = total > 0 ? Math.round((done / total) * 100) : 0;
    return {
      total,
      done,
      percent,
      checklistDone,
      totalChecklistItems,
    };
  }, [progress.completedChecklistItemIds.length, progress.completedStepIds.length]);

  function updateProgress(patch: Partial<TutorialProgress>) {
    setProgress((prev) => {
      const next: TutorialProgress = {
        completedStepIds: patch.completedStepIds ?? prev.completedStepIds,
        completedChecklistItemIds:
          patch.completedChecklistItemIds ?? prev.completedChecklistItemIds,
        lastStepId: patch.lastStepId ?? prev.lastStepId,
      };
      saveProgress(next);
      return next;
    });
  }

  function toggleStepCompleted(stepId: string) {
    updateProgress({
      completedStepIds: progress.completedStepIds.includes(stepId)
        ? progress.completedStepIds.filter((id) => id !== stepId)
        : [...progress.completedStepIds, stepId],
    });
  }

  function toggleChecklistItemCompleted(itemId: string) {
    updateProgress({
      completedChecklistItemIds: progress.completedChecklistItemIds.includes(itemId)
        ? progress.completedChecklistItemIds.filter((id) => id !== itemId)
        : [...progress.completedChecklistItemIds, itemId],
    });
  }

  function goToStep(stepId: string) {
    setActiveStepId(stepId);
    updateProgress({ lastStepId: stepId });
  }

  function goNext() {
    const next = steps[activeIndex + 1];
    if (!next) return;
    goToStep(next.id);
  }

  function goPrev() {
    const prev = steps[activeIndex - 1];
    if (!prev) return;
    goToStep(prev.id);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Link href="/" className="text-sky-400 hover:underline">
              {t('tutorial.breadcrumb_dashboard')}
            </Link>
            <span>/</span>
            <span>{t('tutorial.breadcrumb_tutorial')}</span>
          </div>
          <h1 className="mt-1 text-xl font-semibold tracking-tight">{t('tutorial.title')}</h1>
          <p className="text-xs text-slate-400">
            {t('tutorial.subtitle')}
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-xs">
          <div className="flex items-center justify-between gap-3">
            <div className="text-slate-300">{t('tutorial.progress')}</div>
            <div className="text-slate-200 font-medium">{completion.percent}%</div>
          </div>
          <div className="mt-2 h-2 w-56 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full bg-sky-500"
              style={{ width: `${completion.percent}%` }}
            />
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            {completion.done} / {completion.total} {t('tutorial.done_suffix')}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveStepId(steps[0]?.id ?? 'intro');
                updateProgress({
                  completedStepIds: [],
                  completedChecklistItemIds: [],
                  lastStepId: steps[0]?.id ?? 'intro',
                });
              }}
              className="rounded-md border border-slate-700 px-2 py-1 text-[11px] text-slate-200 hover:bg-slate-800"
            >
              {t('tutorial.reset')}
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
          <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-slate-400">
            {t('tutorial.steps')}
          </div>
          <ol className="space-y-1 text-xs">
            {steps.map((step, idx) => {
              const isActive = step.id === activeStepId;
              const isDone = progress.completedStepIds.includes(step.id);
              return (
                <li key={step.id}>
                  <button
                    type="button"
                    onClick={() => goToStep(step.id)}
                    className={`w-full rounded-md px-2 py-2 text-left transition ${
                      isActive
                        ? 'bg-slate-800 text-sky-300'
                        : 'text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-700 text-[11px] text-slate-300">
                          {idx + 1}
                        </span>
                        <span className="font-medium">{t(step.titleKey)}</span>
                      </div>
                      {isDone && (
                        <span className="inline-flex rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-300">
                          {t('tutorial.done_badge')}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-[11px] text-slate-500 line-clamp-2">
                      {t(step.descriptionKey)}
                    </div>
                  </button>
                </li>
              );
            })}
          </ol>
        </aside>

        <section className="space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold tracking-tight text-slate-100">
                  {t(activeStep.titleKey)}
                </h2>
                <p className="mt-1 text-xs text-slate-400">{t(activeStep.descriptionKey)}</p>
              </div>
              <button
                type="button"
                onClick={() => toggleStepCompleted(activeStep.id)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                  progress.completedStepIds.includes(activeStep.id)
                    ? 'bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30'
                    : 'bg-sky-500 text-white hover:bg-sky-600'
                }`}
              >
                {progress.completedStepIds.includes(activeStep.id)
                  ? t('tutorial.mark_as_not_done')
                  : t('tutorial.mark_step_done')}
              </button>
            </div>

            {activeStep.links && activeStep.links.length > 0 && (
              <div className="mt-4">
                <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                  {t('tutorial.quick_links')}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {activeStep.links.map((l) => (
                    <Link
                      key={l.href}
                      href={l.href}
                      className="rounded-md border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:bg-slate-800"
                    >
                      {t(l.labelKey)}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {activeStep.checklist && activeStep.checklist.length > 0 && (
              <div className="mt-4">
                <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                  {t('tutorial.checklist')}
                </div>
                <div className="mt-2 space-y-2 text-xs">
                  {activeStep.checklist.map((item) => {
                    const checked = progress.completedChecklistItemIds.includes(item.id);
                    return (
                      <label
                        key={item.id}
                        className="flex items-start gap-2 rounded-md border border-slate-800 bg-slate-900/40 px-3 py-2"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleChecklistItemCompleted(item.id)}
                          className="mt-0.5 h-3 w-3 rounded border-slate-600 bg-slate-900 text-sky-500 focus:ring-sky-500"
                        />
                        <span className={checked ? 'text-slate-200' : 'text-slate-300'}>
                          {t(item.labelKey)}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={goPrev}
              disabled={activeIndex === 0}
              className="rounded-md border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t('tutorial.previous')}
            </button>
            <div className="text-[11px] text-slate-500">
              {t('tutorial.step_of')} {activeIndex + 1} {t('tutorial.of')} {steps.length}
            </div>
            <button
              type="button"
              onClick={goNext}
              disabled={activeIndex === steps.length - 1}
              className="rounded-md bg-sky-500 px-3 py-1 text-xs font-medium text-white hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t('tutorial.next')}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
