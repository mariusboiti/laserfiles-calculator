'use client';

import { useMemo, useState, useCallback, useEffect, useRef, lazy, Suspense } from 'react';
import { MessageSquare, BookOpen, CornerUpLeft, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { UpgradeModal } from './UpgradeModal';
import { usePlan } from '@/lib/studio/access/usePlan';
import { BackButton } from './BackButton';
import { StudioBreadcrumbs } from './StudioBreadcrumbs';
import { TourLauncher, TourOverlay, TourSuggestion } from '@/components/tours';
import { useTour } from '@/lib/tours/useTour';
import { hasTour } from '@/lib/tours/registry';
import { FeedbackModal } from '@/components/feedback';
import { ReportIssuePanel, type ReportMode } from '@/components/support';
import { ToolErrorBoundary } from '@/components/errors';
import { AIWarningBanner, SaveAIImageButton, AIImageLibraryPanel } from '@/components/ai';
import type { AIImageAsset } from '@/lib/ai/aiImageLibrary';
import { prepareForExport } from '@/lib/export/svgSafety';
import { ExportMiniDisclaimer } from '@/components/legal';
import { hasTutorial, loadTutorial } from '@/content/tutorials';
import type { TutorialData } from '@/components/tutorial/types';
import { getStudioToolMetaBySlug } from '@/lib/studio/tools/meta';
import { ToolUxProvider, useToolUx } from '@/components/ux/ToolUxProvider';
import { ToolEmptyState } from '@/components/ux/ToolEmptyState';
import { clearSession, loadRecentSession, saveSession, type ToolSession } from '@/lib/session/toolSession';
import { downloadTextFile } from '@/lib/studio/export/download';
import { createArtifact, addToPriceCalculator, type Artifact } from '@/lib/artifacts/client';
import { showArtifactSavedToast } from '@/lib/tools/export/useExportArtifact';
import { useLanguage } from '@/app/(app)/i18n';
import { getStudioTranslation } from '@/lib/i18n/studioTranslations';
import { UnitSystemProvider, useUnitSystem } from '@/components/units/UnitSystemProvider';

// Lazy load TutorialPanel for code splitting
const TutorialPanel = lazy(() => import('@/components/tutorial/TutorialPanel').then(m => ({ default: m.TutorialPanel })));

export type ToolShellProps = {
  slug: string;
  titleKey: string;
  descriptionKey: string;
  proFeatures?: string[];
  children: React.ReactNode;
  toolSlug?: string;
  showBack?: boolean;
  onReset?: () => void;
  onExport?: () => void;
  onHelp?: () => void;
  help?: React.ReactNode;
  getExportPayload?: () =>
    | Promise<{ svg: string; name?: string; meta?: any }>
    | { svg: string; name?: string; meta?: any };
};

export function ToolShell({ 
  slug, 
  titleKey, 
  descriptionKey, 
  proFeatures, 
  children,
  toolSlug,
  showBack = true,
  onReset,
  onExport,
  onHelp,
  help,
  getExportPayload,
}: ToolShellProps) {
  return (
    <UnitSystemProvider>
      <ToolUxProvider>
        <ToolShellInner
          slug={slug}
          titleKey={titleKey}
          descriptionKey={descriptionKey}
          proFeatures={proFeatures}
          toolSlug={toolSlug}
          showBack={showBack}
          onReset={onReset}
          onExport={onExport}
          onHelp={onHelp}
          help={help}
          getExportPayload={getExportPayload}
        >
          {children}
        </ToolShellInner>
      </ToolUxProvider>
    </UnitSystemProvider>
  );
}

function UnitSystemToggle() {
  const { unitSystem, setUnitSystem } = useUnitSystem();

  return (
    <div className="inline-flex overflow-hidden rounded-md border border-slate-700 bg-slate-950">
      <button
        type="button"
        onClick={() => setUnitSystem('mm')}
        className={
          unitSystem === 'mm'
            ? 'px-2 py-1 text-[11px] font-medium text-slate-950 bg-sky-300'
            : 'px-2 py-1 text-[11px] text-slate-200 hover:bg-slate-900'
        }
      >
        mm
      </button>
      <button
        type="button"
        onClick={() => setUnitSystem('in')}
        className={
          unitSystem === 'in'
            ? 'px-2 py-1 text-[11px] font-medium text-slate-950 bg-sky-300'
            : 'px-2 py-1 text-[11px] text-slate-200 hover:bg-slate-900'
        }
      >
        in
      </button>
    </div>
  );
}

function ToolShellInner({
  slug,
  titleKey,
  descriptionKey,
  proFeatures,
  children,
  toolSlug,
  showBack = true,
  onReset,
  onExport,
  onHelp,
  help,
  getExportPayload,
}: ToolShellProps) {
  const { plan, canUse, entitlement, entitlementLoading, aiAllowed, canUseStudio } = usePlan();
  const { locale } = useLanguage();
  const t = useCallback((key: string) => getStudioTranslation(locale as any, key), [locale]);
  const title = t(titleKey);
  const description = t(descriptionKey);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState<string | undefined>(undefined);
  const [helpOpen, setHelpOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [reportIssueOpen, setReportIssueOpen] = useState(false);
  const [reportIssueMode, setReportIssueMode] = useState<ReportMode>('problem');
  const [aiLibraryOpen, setAiLibraryOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [lastSavedArtifact, setLastSavedArtifact] = useState<Artifact | null>(null);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [resetNonce, setResetNonce] = useState(0);
  const [restoreCandidate, setRestoreCandidate] = useState<ToolSession | null>(null);
  const autosaveTimeoutRef = useRef<number | null>(null);

  const effectiveToolSlug = toolSlug || slug;

  const { state: toolUxState } = useToolUx();

  const toolMeta = useMemo(() => {
    return getStudioToolMetaBySlug(effectiveToolSlug);
  }, [effectiveToolSlug]);

  const showAIInfo = Boolean(toolMeta?.usesAI);
  const showAiPanels = showAIInfo && aiAllowed;

  const isTrialValid = useMemo(() => {
    if (!entitlement) return false;
    if (entitlement.plan !== 'TRIAL') return true;
    if (!entitlement.trialEndsAt) return true; // Follow authoritative backend
    const ends = new Date(entitlement.trialEndsAt).getTime();
    return Number.isFinite(ends) && ends > Date.now();
  }, [entitlement]);

  const isLocked = useMemo(() => {
    if (entitlementLoading) return false;
    return !canUseStudio;
  }, [canUseStudio, entitlementLoading]);

  const canUseThisTool = useMemo(() => {
    if (isLocked) return false;
    if (!showAIInfo) return true;
    return Boolean(aiAllowed);
  }, [aiAllowed, entitlement?.plan, isLocked, showAIInfo]);

  // Tutorial state
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [tutorialData, setTutorialData] = useState<TutorialData | null>(null);
  const [tutorialLoading, setTutorialLoading] = useState(false);
  const [tutorialLocale, setTutorialLocale] = useState<string | null>(null);
  const tutorialAvailable = hasTutorial(effectiveToolSlug);

  // Tour integration
  const tourAvailable = hasTour(effectiveToolSlug);
  const {
    isOpen: tourOpen,
    currentStepIndex,
    totalSteps,
    currentStep,
    progress: tourProgress,
    targetElement,
    isLoading: tourLoading,
    showSuggestion,
    startTour,
    nextStep,
    prevStep,
    skipTour,
    finishTour,
    closeTour,
    dismissSuggestion,
  } = useTour({ toolSlug: effectiveToolSlug, autoSuggest: tourAvailable });

  const badge = useMemo(() => {
    return plan === 'pro' ? 'PRO' : 'FREE';
  }, [plan]);

  // Listen for custom event to open ReportIssuePanel (from error boundaries)
  useEffect(() => {
    const handleOpenReportIssue = (e: CustomEvent<{ mode?: 'problem' | 'feedback' }>) => {
      setReportIssueMode(e.detail?.mode || 'problem');
      setReportIssueOpen(true);
    };

    window.addEventListener('open-report-issue', handleOpenReportIssue as EventListener);
    return () => {
      window.removeEventListener('open-report-issue', handleOpenReportIssue as EventListener);
    };
  }, []);

  function requestPro(feature?: string) {
    if (canUse(feature)) return;
    setUpgradeFeature(feature);
    setUpgradeOpen(true);
  }

  function ensureCanExport() {
    if (canUse('export')) return true;
    requestPro('export');
    return false;
  }

  function sanitizeFilenamePart(value: string) {
    return String(value || '')
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9._-]+/g, '')
      .slice(0, 64);
  }

  function formatDateYmd(d: Date) {
    const yyyy = String(d.getFullYear());
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  function parseMmDimensions(svg: string): { wMm?: number; hMm?: number } {
    const w = svg.match(/\bwidth\s*=\s*["']\s*([0-9.]+)\s*mm\s*["']/i);
    const h = svg.match(/\bheight\s*=\s*["']\s*([0-9.]+)\s*mm\s*["']/i);
    const wMm = w ? Number(w[1]) : undefined;
    const hMm = h ? Number(h[1]) : undefined;
    return {
      wMm: Number.isFinite(wMm as number) ? (wMm as number) : undefined,
      hMm: Number.isFinite(hMm as number) ? (hMm as number) : undefined,
    };
  }

  async function computeExportSvg() {
    if (!getExportPayload) {
      throw new Error('Export is not available for this tool');
    }

    const payload = await getExportPayload();
    const rawSvg = String(payload?.svg || '');
    if (!rawSvg) {
      throw new Error('No SVG export available');
    }

    const prepared = prepareForExport(rawSvg, { units: 'mm' });
    if (!prepared.validation.ok) {
      throw new Error(prepared.validation.errors[0] || 'Export SVG validation failed');
    }

    const dims = parseMmDimensions(prepared.svg);

    return {
      preparedSvg: prepared.svg,
      warnings: prepared.validation.warnings,
      name: payload?.name,
      meta: payload?.meta,
      dims,
    };
  }

  async function handleDownloadSvg() {
    if (!ensureCanExport()) return;
    setExportBusy(true);
    setExportError(null);
    try {
      const toolId = toolSlug || slug;
      const { preparedSvg, name, dims } = await computeExportSvg();
      const n = sanitizeFilenamePart(name || toolId);
      const dimPart = dims.wMm && dims.hMm ? `${dims.wMm.toFixed(0)}x${dims.hMm.toFixed(0)}mm` : 'size';
      const filename = `${sanitizeFilenamePart(toolId)}_${n}_${dimPart}_${formatDateYmd(new Date())}.svg`;
      downloadTextFile(filename, preparedSvg, 'image/svg+xml');
      setExportOpen(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Export failed';
      setExportError(msg);
    } finally {
      setExportBusy(false);
    }
  }

  async function handleSaveToLibrary() {
    if (!ensureCanExport()) return;
    setExportBusy(true);
    setExportError(null);
    try {
      const toolId = toolSlug || slug;
      const { preparedSvg, name, meta, dims } = await computeExportSvg();
      const resolvedName = (name || title || toolId).trim();
      const artifact = await createArtifact({
        toolSlug: toolId,
        name: resolvedName,
        svg: preparedSvg,
        meta: {
          ...(meta || {}),
          bboxMm: dims.wMm && dims.hMm ? { width: dims.wMm, height: dims.hMm } : (meta?.bboxMm as any),
        },
      });
      setLastSavedArtifact(artifact);
      showArtifactSavedToast(resolvedName);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Save failed';
      setExportError(msg);
    } finally {
      setExportBusy(false);
    }
  }

  async function handleAddToPriceCalculator() {
    if (!ensureCanExport()) return;
    setExportBusy(true);
    setExportError(null);
    try {
      let artifact = lastSavedArtifact;
      if (!artifact) {
        const toolId = toolSlug || slug;
        const { preparedSvg, name, meta, dims } = await computeExportSvg();
        const resolvedName = (name || title || toolId).trim();
        artifact = await createArtifact({
          toolSlug: toolId,
          name: resolvedName,
          svg: preparedSvg,
          meta: {
            ...(meta || {}),
            bboxMm: dims.wMm && dims.hMm ? { width: dims.wMm, height: dims.hMm } : (meta?.bboxMm as any),
          },
        });
        setLastSavedArtifact(artifact);
        showArtifactSavedToast(resolvedName);
      }
      addToPriceCalculator(artifact);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Import failed';
      setExportError(msg);
      setExportBusy(false);
      return;
    }
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

  const handleOpenTutorial = useCallback(async () => {
    setTutorialOpen(true);
    const normalizedLocale = String(locale || '').split('-')[0] || null;
    const needsReload = !tutorialData || tutorialLocale !== normalizedLocale;

    if (needsReload && !tutorialLoading) {
      setTutorialLoading(true);
      try {
        const data = await loadTutorial(effectiveToolSlug, locale);
        setTutorialData(data);
        setTutorialLocale(normalizedLocale);
      } finally {
        setTutorialLoading(false);
      }
    }
  }, [effectiveToolSlug, locale, tutorialData, tutorialLoading, tutorialLocale]);

  const handleCloseTutorial = useCallback(() => {
    setTutorialOpen(false);
  }, []);

  const handleReset = () => {
    if (onReset) {
      onReset();
      return;
    }
  };

  const confirmReset = () => {
    handleReset();
    clearSession(effectiveToolSlug);
    setResetNonce((v) => v + 1);
    setResetConfirmOpen(false);
  };

  const handleExport = () => {
    if (getExportPayload) {
      if (!ensureCanExport()) return;
      setExportOpen((v) => !v);
      return;
    }

    if (onExport) {
      onExport();
    } else {
      requestPro('export');
    }
  };

  useEffect(() => {
    if (!toolUxState.sessionAdapter) return;
    const session = loadRecentSession(effectiveToolSlug, { maxAgeMs: 1000 * 60 * 60 * 24 * 7 });
    if (!session) return;
    if (session.version !== toolUxState.sessionAdapter.version) return;
    setRestoreCandidate(session);
  }, [effectiveToolSlug, toolUxState.sessionAdapter]);

  useEffect(() => {
    if (!toolUxState.sessionAdapter) return;
    if (typeof toolUxState.sessionState === 'undefined') return;

    if (autosaveTimeoutRef.current) {
      window.clearTimeout(autosaveTimeoutRef.current);
      autosaveTimeoutRef.current = null;
    }

    autosaveTimeoutRef.current = window.setTimeout(() => {
      saveSession(effectiveToolSlug, {
        version: toolUxState.sessionAdapter!.version,
        savedAt: Date.now(),
        state: toolUxState.sessionState,
      });
    }, 700);

    return () => {
      if (autosaveTimeoutRef.current) {
        window.clearTimeout(autosaveTimeoutRef.current);
        autosaveTimeoutRef.current = null;
      }
      try {
        saveSession(effectiveToolSlug, {
          version: toolUxState.sessionAdapter!.version,
          savedAt: Date.now(),
          state: toolUxState.sessionState,
        });
      } catch {
        // ignore
      }
    };
  }, [effectiveToolSlug, toolUxState.sessionAdapter, toolUxState.sessionState]);

  const canShowEmptyState = Boolean(toolUxState.isEmpty);
  const emptyStatePrimaryAction =
    toolUxState.primaryAction ?? (tourAvailable ? { label: t('shell.start_tour'), onClick: startTour } : undefined);
  const emptyStateSecondaryAction =
    toolUxState.secondaryAction ??
    (tutorialAvailable
      ? { label: t('tools.tutorial'), onClick: handleOpenTutorial }
      : help
        ? { label: t('shell.help'), onClick: () => setHelpOpen(true) }
        : undefined);
  const showEmptyState = canShowEmptyState && Boolean(emptyStatePrimaryAction);

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

            {showAiPanels && (
              <div className="mt-3 space-y-2">
                <AIWarningBanner />
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <UnitSystemToggle />
                {tourAvailable && (
                  <TourLauncher
                    status={tourProgress.status}
                    isLoading={tourLoading}
                    hasTour={tourAvailable}
                    onStartTour={startTour}
                  />
                )}
                {tutorialAvailable && (
                  <button
                    type="button"
                    onClick={handleOpenTutorial}
                    className="flex items-center gap-1.5 rounded-md border border-slate-700 px-3 py-2 text-xs text-slate-200 hover:bg-slate-900"
                    title={t('shell.open_tutorial')}
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                    {t('tools.tutorial')}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => toolUxState.onUndo?.()}
                  disabled={!toolUxState.onUndo || toolUxState.canUndo === false}
                  className="flex items-center gap-1.5 rounded-md border border-slate-700 px-3 py-2 text-xs text-slate-200 hover:bg-slate-900 disabled:opacity-50"
                  title={
                    toolUxState.onUndo && toolUxState.canUndo !== false
                      ? t('shell.undo_title')
                      : t('shell.undo_unavailable')
                  }
                >
                  <CornerUpLeft className="h-3.5 w-3.5" />
                  {t('shell.undo')}
                </button>
                <button
                  type="button"
                  onClick={() => setResetConfirmOpen(true)}
                  className="rounded-md border border-slate-700 px-3 py-2 text-xs text-slate-200 hover:bg-slate-900"
                >
                  {t('shell.reset')}
                </button>
                {showAiPanels && (
                  <button
                    type="button"
                    onClick={() => setAiLibraryOpen(true)}
                    className="flex items-center gap-1.5 rounded-md border border-violet-800 bg-violet-950/30 px-3 py-2 text-xs text-violet-300 hover:bg-violet-900/40"
                    title={t('shell.ai_library_title')}
                  >
                    <ImageIcon className="h-3.5 w-3.5" />
                    {t('shell.ai_library')}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setReportIssueMode('problem');
                    setReportIssueOpen(true);
                  }}
                  className="flex items-center gap-1.5 rounded-md border border-slate-700 px-3 py-2 text-xs text-slate-200 hover:bg-slate-900"
                  title={t('shell.report_problem_title')}
                >
                  <AlertCircle className="h-3.5 w-3.5" />
                  {t('shell.report')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setReportIssueMode('feedback');
                    setReportIssueOpen(true);
                  }}
                  className="flex items-center gap-1.5 rounded-md border border-slate-700 px-3 py-2 text-xs text-slate-200 hover:bg-slate-900"
                  title={t('shell.feedback_title')}
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  {t('shell.feedback')}
                </button>
                <button
                  type="button"
                  onClick={handleExport}
                  disabled={exportBusy}
                  className="rounded-md bg-sky-500 px-3 py-2 text-xs font-medium text-white hover:bg-sky-600 disabled:opacity-60"
                  data-tour="export"
                >
                  {t('shell.export')}
                </button>
              </div>

              <div className="mt-1 text-right text-[11px] text-slate-500">
                {t('shell.export_disclaimer')}
              </div>
              {onExport && !getExportPayload && <ExportMiniDisclaimer className="mt-1 text-right" />}
            </div>
          </div>
        </div>

        {restoreCandidate && toolUxState.sessionAdapter && toolUxState.isEmpty && (
          <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs text-slate-200">
                {t('shell.restore_found')}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    Promise.resolve(toolUxState.sessionAdapter!.restore(restoreCandidate.state)).catch(() => {
                      // ignore
                    });
                    clearSession(effectiveToolSlug);
                    setRestoreCandidate(null);
                  }}
                  className="rounded-md bg-sky-500 px-3 py-2 text-xs font-medium text-white hover:bg-sky-600"
                >
                  {t('shell.restore')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    clearSession(effectiveToolSlug);
                    setRestoreCandidate(null);
                  }}
                  className="rounded-md border border-slate-700 px-3 py-2 text-xs text-slate-200 hover:bg-slate-900"
                >
                  {t('shell.discard')}
                </button>
              </div>
            </div>
          </div>
        )}

        {getExportPayload && exportOpen && (
          <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950 p-3">
            <div className="grid gap-2">
              <button
                type="button"
                onClick={handleDownloadSvg}
                disabled={exportBusy}
                className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-left text-xs text-slate-200 hover:bg-slate-800 disabled:opacity-60"
              >
                {t('shell.download_svg')}
              </button>
              <button
                type="button"
                onClick={handleSaveToLibrary}
                disabled={exportBusy}
                className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-left text-xs text-slate-200 hover:bg-slate-800 disabled:opacity-60"
              >
                {t('shell.save_to_library')}
              </button>
              <button
                type="button"
                onClick={handleAddToPriceCalculator}
                disabled={exportBusy}
                className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-left text-xs text-slate-200 hover:bg-slate-800 disabled:opacity-60"
              >
                {t('shell.add_to_calculator')}
              </button>

              {lastSavedArtifact && (
                <a
                  href="/studio/library"
                  className="text-xs text-sky-400 hover:text-sky-300"
                >
                  {t('shell.view_in_library')}
                </a>
              )}

              {exportError && (
                <div className="rounded-md border border-red-900/50 bg-red-950/30 p-3 text-xs text-red-300">
                  <div>{exportError}</div>
                  <button
                    type="button"
                    onClick={() => {
                      setReportIssueMode('problem');
                      setReportIssueOpen(true);
                    }}
                    className="mt-2 rounded-md border border-red-900/40 px-2 py-1 text-[11px] text-red-200 hover:bg-red-950/40"
                  >
                    {t('shell.report_this_issue')}
                  </button>
                </div>
              )}
            </div>

            <ExportMiniDisclaimer className="mt-2" />
          </div>
        )}

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

      <div className={`lfs-tool lfs-tool-${slug} flex-1 min-h-0 overflow-x-hidden relative`}>
        <ToolErrorBoundary toolSlug={effectiveToolSlug}>
          {entitlementLoading && !entitlement ? (
            <div className="flex h-full items-center justify-center p-6">
              <div className="text-sm text-slate-400">{t('common.loading')}</div>
            </div>
          ) : !canUseThisTool ? (
            <div className="flex h-full items-center justify-center p-6">
              <div className="w-full max-w-xl rounded-xl border border-slate-800 bg-slate-950 p-6 text-center">
                <div className="text-lg font-semibold text-slate-100">{t('shell.locked.title')}</div>
                <div className="mt-2 text-sm text-slate-400">
                  {showAIInfo
                    ? t('shell.locked.ai_subtitle')
                    : t('shell.locked.subtitle')}
                </div>
                <div className="mt-5 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setUpgradeOpen(true)}
                    className="rounded-md bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600"
                  >
                    {t('shell.locked.view_options')}
                  </button>
                  <button
                    type="button"
                    onClick={() => (window.location.href = '/studio/dashboard')}
                    className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-900"
                  >
                    {t('shell.locked.back_to_dashboard')}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div key={resetNonce} className="h-full relative">
              {children}
              {entitlementLoading && entitlement && (
                <div className="pointer-events-none absolute inset-0 flex items-start justify-end p-3">
                  <div className="rounded-md border border-slate-800 bg-slate-950/80 px-2 py-1 text-[11px] text-slate-300">
                    {t('common.loading')}
                  </div>
                </div>
              )}
            </div>
          )}
        </ToolErrorBoundary>
      </div>

      {resetConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setResetConfirmOpen(false)} />
          <div className="relative w-[min(520px,calc(100vw-2rem))] rounded-xl border border-slate-800 bg-slate-950 p-5 text-slate-100 shadow-xl">
            <div className="text-lg font-semibold">{t('shell.reset_confirm.title')}</div>
            <div className="mt-2 text-sm text-slate-300">{t('shell.reset_confirm.subtitle')}</div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setResetConfirmOpen(false)}
                className="rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-900"
              >
                {t('shell.reset_confirm.cancel')}
              </button>
              <button
                type="button"
                onClick={confirmReset}
                className="rounded-md bg-sky-500 px-3 py-2 text-sm font-medium text-white hover:bg-sky-600"
              >
                {t('shell.reset')}
              </button>
            </div>
          </div>
        </div>
      )}

      <UpgradeModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        feature={upgradeFeature}
      />

      <FeedbackModal
        isOpen={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        defaultToolSlug={effectiveToolSlug}
      />

      <ReportIssuePanel
        isOpen={reportIssueOpen}
        onClose={() => setReportIssueOpen(false)}
        mode={reportIssueMode}
        toolSlug={effectiveToolSlug}
        toolName={title}
        getToolState={toolUxState.sessionState !== undefined ? () => toolUxState.sessionState : undefined}
      />

      {/* AI Image Library Panel */}
      {showAiPanels && (
        <AIImageLibraryPanel
          open={aiLibraryOpen}
          onClose={() => setAiLibraryOpen(false)}
          currentToolSlug={effectiveToolSlug}
          onSelectImage={(asset: AIImageAsset) => {
            toolUxState.aiImageIntegration?.applyImage?.(asset);
          }}
          canUseImages={!!toolUxState.aiImageIntegration?.applyImage}
        />
      )}

      {/* Tour Overlay */}
      {tourOpen && currentStep && (
        <TourOverlay
          step={currentStep}
          stepIndex={currentStepIndex}
          totalSteps={totalSteps}
          targetElement={targetElement}
          onNext={nextStep}
          onPrev={prevStep}
          onSkip={skipTour}
          onFinish={finishTour}
          onClose={closeTour}
        />
      )}

      {/* Tour Suggestion */}
      {showSuggestion && !tourOpen && (
        <TourSuggestion
          onStart={startTour}
          onDismiss={dismissSuggestion}
          onTutorial={tutorialAvailable ? handleOpenTutorial : undefined}
          toolSlug={effectiveToolSlug}
          hasTutorial={tutorialAvailable}
        />
      )}

      {/* Tutorial Panel */}
      {tutorialOpen && (
        <Suspense fallback={null}>
          <TutorialPanel
            isOpen={tutorialOpen}
            onClose={handleCloseTutorial}
            tutorial={tutorialData}
            isLoading={tutorialLoading}
          />
        </Suspense>
      )}
    </div>
  );
}
