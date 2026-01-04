'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Sparkles, BookOpen } from 'lucide-react';
import { studioTools } from '@/lib/studio/tools/registry';
import { usePlan } from '@/lib/studio/access/usePlan';
import { hasTutorial } from '@/content/tutorials';

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
  'Image Processing': ['engraveprep', 'ai-depth-photo', 'multilayer-maker'],
  'Utilities': ['price-calculator', 'inlay-offset-calculator'],
  'Games & Puzzles': ['jigsaw-maker'],
} as const;

export function ToolsHub() {
  const { plan } = usePlan();
  const [query, setQuery] = useState('');

  const filteredTools = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return studioTools;

    return studioTools.filter((t) => {
      const hay = `${t.slug} ${t.title} ${t.description}`.toLowerCase();
      return hay.includes(q);
    });
  }, [query]);

  const categorizedTools = useMemo(() => {
    const categories: Record<string, typeof studioTools> = {};
    
    Object.entries(TOOL_CATEGORIES).forEach(([category, slugs]) => {
      categories[category] = filteredTools.filter((t) => (slugs as readonly string[]).includes(t.slug));
    });
    
    return categories;
  }, [filteredTools]);

  const hasSearchQuery = query.trim().length > 0;

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-100 sm:text-4xl">
          LaserFilesPro Studio
        </h1>
        <p className="mt-3 text-lg text-slate-400">
          {studioTools.length} professional tools for laser cutting design and production
        </p>
      </div>

      {/* Search */}
      <div className="mx-auto max-w-md">
        <label className="sr-only" htmlFor="tools-search">
          Search tools
        </label>
        <input
          id="tools-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tools..."
          className="w-full rounded-lg border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-500/70 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
        />
      </div>

      {/* Tools Grid - Categorized or Search Results */}
      {hasSearchQuery ? (
        <div>
          <h2 className="mb-4 text-xl font-semibold text-slate-100">Search Results</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredTools.map((tool) => (
              <ToolCard key={tool.slug} tool={tool} plan={plan} />
            ))}
          </div>
          {filteredTools.length === 0 && (
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-300">
              No tools match your search.
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(categorizedTools).map(([category, tools]) => {
            if (tools.length === 0) return null;
            
            return (
              <div key={category}>
                <h2 className="mb-4 text-xl font-semibold text-slate-100">{category}</h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {tools.map((tool) => (
                    <ToolCard key={tool.slug} tool={tool} plan={plan} />
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

function ToolCard({ tool, plan }: { tool: typeof studioTools[0]; plan: string }) {
  const tutorialAvailable = hasTutorial(tool.slug);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 transition-colors hover:border-slate-700">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-slate-100">{tool.title}</h3>
            {tool.usesAI && (
              <span className="inline-flex items-center gap-1 rounded-full bg-violet-900/40 px-2 py-0.5 text-[10px] font-medium text-violet-300">
                <Sparkles className="h-3 w-3" />
                AI
              </span>
            )}
          </div>
          <p className="mt-1.5 text-sm text-slate-400 leading-relaxed">{tool.description}</p>
          {tool.usesAI && (
            <p className="mt-2 text-xs text-slate-500">1 credit per generation</p>
          )}
        </div>
      </div>

      <div className="mt-5 flex items-center gap-2">
        <Link
          href={`/studio/tools/${tool.slug}`}
          className="inline-flex items-center justify-center rounded-md bg-sky-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-600"
        >
          Open tool
        </Link>
        {tutorialAvailable && (
          <Link
            href={`/studio/tools/${tool.slug}?tutorial=open`}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-slate-800"
          >
            <BookOpen className="h-4 w-4" />
            Tutorial
          </Link>
        )}
      </div>
    </div>
  );
}

