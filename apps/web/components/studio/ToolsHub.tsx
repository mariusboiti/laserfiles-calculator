'use client';

import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import { Sparkles, BookOpen } from 'lucide-react';
import { studioTools } from '@/lib/studio/tools/registry';
import { usePlan } from '@/lib/studio/access/usePlan';
import { hasTutorial } from '@/content/tutorials';
import { useLanguage } from '@/app/(app)/i18n';
import { getStudioTranslation } from '@/lib/i18n/studioTranslations';

const TOOL_CATEGORIES = {
  'Design & Personalization': [
    'personalised-sign-generator',
    'keychain-generator',
    'round-coaster-generator',
    'product-label-generator',
    'bulk-name-tags',
  ],
  'Boxes & Frames': ['boxmaker', 'curved-photo-frame-v3'],
  'Layout & Production': ['panel-splitter', 'ornament-layout-planner', 'jig-fixture-generator'],
  'Image Processing': ['engraveprep', 'ai-depth-photo'],
  'Utilities': ['price-calculator', 'inlay-offset-calculator'],
  'Games & Puzzles': ['jigsaw-maker'],
} as const;

const CATEGORY_KEY: Record<keyof typeof TOOL_CATEGORIES, string> = {
  'Design & Personalization': 'tools.category.design_personalization',
  'Boxes & Frames': 'tools.category.boxes_frames',
  'Layout & Production': 'tools.category.layout_production',
  'Image Processing': 'tools.category.image_processing',
  Utilities: 'tools.category.utilities',
  'Games & Puzzles': 'tools.category.games_puzzles',
};

export function ToolsHub() {
  const { plan, entitlement, entitlementLoading } = usePlan();
  const [query, setQuery] = useState('');
  const { locale } = useLanguage();
  const t = useCallback((key: string) => getStudioTranslation(locale as any, key), [locale]);

  const isTrialValid = useMemo(() => {
    if (!entitlement) return false;
    if (entitlement.plan !== 'TRIALING') return true;
    if (!entitlement.trialEndsAt) return false;
    const ends = new Date(entitlement.trialEndsAt).getTime();
    return Number.isFinite(ends) && ends > Date.now();
  }, [entitlement]);

  const isLocked = useMemo(() => {
    if (entitlementLoading) return false;
    if (!entitlement) return true;
    if (entitlement.plan === 'INACTIVE' || entitlement.plan === 'CANCELED') return true;
    if (!isTrialValid) return true;
    if (entitlement.plan === 'TRIALING' && entitlement.aiCreditsRemaining <= 0) return true;
    return false;
  }, [entitlement, entitlementLoading, isTrialValid]);

  const filteredTools = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return studioTools;

    return studioTools.filter((tool) => {
      const title = getStudioTranslation(locale as any, tool.titleKey);
      const desc = getStudioTranslation(locale as any, tool.descriptionKey);
      const hay = `${tool.slug} ${title} ${desc}`.toLowerCase();
      return hay.includes(q);
    });
  }, [query, locale]);

  const categorizedTools = useMemo(() => {
    const categories: Record<string, typeof studioTools> = {};
    
    Object.entries(TOOL_CATEGORIES).forEach(([category, slugs]) => {
      categories[category] = filteredTools.filter((t) => (slugs as readonly string[]).includes(t.slug));
    });
    
    return categories;
  }, [filteredTools]);

  const hasSearchQuery = query.trim().length > 0;

  if (entitlementLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-slate-400">{t('common.loading')}</div>
      </div>
    );
  }

  if (isLocked) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-full max-w-xl rounded-xl border border-slate-800 bg-slate-900/40 p-8 text-center">
          <div className="text-xl font-semibold text-slate-100">{t('tools.locked.title')}</div>
          <div className="mt-2 text-sm text-slate-400">
            {t('tools.locked.subtitle')}
          </div>
          <div className="mt-5">
            <Link
              href="/studio/dashboard"
              className="inline-flex items-center justify-center rounded-md bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600"
            >
              {t('tools.locked.go_dashboard')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-100 sm:text-4xl">
          {t('tools.title')}
        </h1>
        <p className="mt-3 text-lg text-slate-400">
          {t('tools.subtitle').replace('{count}', String(studioTools.length))}
        </p>
      </div>

      {/* Search */}
      <div className="mx-auto max-w-md">
        <label className="sr-only" htmlFor="tools-search">
          {t('tools.search_label')}
        </label>
        <input
          id="tools-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('tools.search_placeholder')}
          className="w-full rounded-lg border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-500/70 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
        />
      </div>

      {/* Tools Grid - Categorized or Search Results */}
      {hasSearchQuery ? (
        <div>
          <h2 className="mb-4 text-xl font-semibold text-slate-100">{t('tools.search_results')}</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredTools.map((tool) => (
              <ToolCard key={tool.slug} tool={tool} plan={plan} aiCreditsRemaining={entitlement?.aiCreditsRemaining ?? 0} />
            ))}
          </div>
          {filteredTools.length === 0 && (
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-300">
              {t('tools.search_no_results')}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(categorizedTools).map(([category, tools]) => {
            if (tools.length === 0) return null;
            
            return (
              <div key={category}>
                <h2 className="mb-4 text-xl font-semibold text-slate-100">
                  {t(CATEGORY_KEY[category as keyof typeof TOOL_CATEGORIES] || category)}
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {tools.map((tool) => (
                    <ToolCard key={tool.slug} tool={tool} plan={plan} aiCreditsRemaining={entitlement?.aiCreditsRemaining ?? 0} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ToolCard({
  tool,
  plan,
  aiCreditsRemaining,
}: {
  tool: typeof studioTools[0];
  plan: string;
  aiCreditsRemaining: number;
}) {
  const tutorialAvailable = hasTutorial(tool.slug);
  const aiLocked = Boolean(tool.usesAI) && aiCreditsRemaining <= 0;
  const { locale } = useLanguage();
  const t = useCallback((key: string) => getStudioTranslation(locale as any, key), [locale]);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 transition-colors hover:border-slate-700">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-slate-100">{t(tool.titleKey)}</h3>
            {tool.usesAI && (
              <span className="inline-flex items-center gap-1 rounded-full bg-violet-900/40 px-2 py-0.5 text-[10px] font-medium text-violet-300">
                <Sparkles className="h-3 w-3" />
                AI
              </span>
            )}
          </div>
          <p className="mt-1.5 text-sm text-slate-400 leading-relaxed">{t(tool.descriptionKey)}</p>
          {tool.usesAI && (
            <p className="mt-2 text-xs text-slate-500">{t('tools.credit_per_generation')}</p>
          )}
        </div>
      </div>

      <div className="mt-5 flex items-center gap-2">
        <Link
          href={`/studio/tools/${tool.slug}`}
          className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-white transition-colors ${
            aiLocked ? 'bg-slate-700 cursor-not-allowed pointer-events-none' : 'bg-sky-500 hover:bg-sky-600'
          }`}
        >
          {t('tools.open_tool')}
        </Link>
        {tutorialAvailable && (
          <Link
            href={`/studio/tools/${tool.slug}?tutorial=open`}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-slate-800"
          >
            <BookOpen className="h-4 w-4" />
            {t('tools.tutorial')}
          </Link>
        )}
      </div>
    </div>
  );
}

