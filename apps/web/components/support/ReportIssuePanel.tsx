'use client';

/**
 * ReportIssuePanel Component
 * Unified "Report a Problem" / "Feedback & Suggestions" panel
 * Simple, friendly, with auto-collected context
 */

import React, { useState, useEffect, useCallback } from 'react';
import { X, Bug, Lightbulb, Loader2, Check, AlertTriangle, Camera, Database } from 'lucide-react';
import { collectContext, submitReport, type ReportContext, type SubmitResult } from '@/lib/support/submitReport';
import { capturePreviewScreenshot } from '@/lib/support/capturePreview';
import { useLanguage } from '@/app/(app)/i18n';
import { getStudioTranslation } from '@/lib/i18n/studioTranslations';
import { toast } from '@/components/system';

export type ReportMode = 'problem' | 'feedback';

interface ReportIssuePanelProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: ReportMode;
  toolSlug?: string;
  toolName?: string;
  getToolState?: () => unknown;
}

type SubmitStatus = 'idle' | 'submitting' | 'success' | 'error';

export function ReportIssuePanel({
  isOpen,
  onClose,
  mode: initialMode = 'problem',
  toolSlug,
  toolName,
  getToolState,
}: ReportIssuePanelProps) {
  const { locale } = useLanguage();
  const t = useCallback((key: string) => getStudioTranslation(locale as any, key), [locale]);
  const [mode, setMode] = useState<ReportMode>(initialMode);
  const [description, setDescription] = useState('');
  const [includeToolState, setIncludeToolState] = useState(true);
  const [includeScreenshot, setIncludeScreenshot] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<SubmitStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [context, setContext] = useState<ReportContext | null>(null);

  // Reset form when opened
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setDescription('');
      setIncludeToolState(true);
      setIncludeScreenshot(false);
      setScreenshotPreview(null);
      setStatus('idle');
      setErrorMessage(null);
      setContext(collectContext(toolSlug, toolName));
    }
  }, [isOpen, initialMode, toolSlug, toolName]);

  // Capture screenshot when checkbox is toggled on
  const handleScreenshotToggle = useCallback(async (checked: boolean) => {
    setIncludeScreenshot(checked);
    
    if (checked && !screenshotPreview) {
      setIsCapturing(true);
      try {
        const dataUrl = await capturePreviewScreenshot();
        setScreenshotPreview(dataUrl);
      } catch (error) {
        console.error('Screenshot capture failed:', error);
      } finally {
        setIsCapturing(false);
      }
    }
  }, [screenshotPreview]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!description.trim()) {
      setErrorMessage('Please describe what happened');
      return;
    }

    if (description.trim().length < 10) {
      setErrorMessage('Please provide a bit more detail (at least 10 characters)');
      return;
    }

    setStatus('submitting');
    setErrorMessage(null);

    // Get tool state if requested
    let toolState: unknown = undefined;
    if (includeToolState && getToolState) {
      try {
        toolState = getToolState();
      } catch {
        // Ignore errors getting tool state
      }
    }

    const result: SubmitResult = await submitReport({
      mode,
      description: description.trim(),
      context: context || collectContext(toolSlug, toolName),
      toolState,
      screenshotDataUrl: includeScreenshot ? screenshotPreview || undefined : undefined,
      includeToolState,
      includeScreenshot,
    });

    if (result.success) {
      setStatus('success');
      toast(t('report.success_title'), 'success');
      // Auto-close after success
      setTimeout(() => {
        onClose();
      }, 2500);
    } else {
      setStatus('error');
      const msg = result.error || 'Something went wrong. Please try again.';
      setErrorMessage(msg);
      toast(msg, 'error');
    }
  };

  if (!isOpen) return null;

  const isProblem = mode === 'problem';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-100">
            {isProblem ? t('report.title_problem') : t('report.title_feedback')}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Success State */}
        {status === 'success' ? (
          <div className="flex flex-col items-center justify-center p-12">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20">
              <Check className="h-8 w-8 text-emerald-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-100">{t('report.success_title')}</h3>
            <p className="mt-1 text-center text-sm text-slate-400">
              {isProblem ? t('report.success_problem') : t('report.success_feedback')}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-6 rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
            >
              {t('report.continue_working')}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6">
            {/* Mode Toggle (only if opened without specific mode) */}
            <div className="mb-4 flex gap-2">
              <button
                type="button"
                onClick={() => setMode('problem')}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                  mode === 'problem'
                    ? 'border-red-500/50 bg-red-500/10 text-red-400'
                    : 'border-slate-700 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <Bug className="h-4 w-4" />
                {t('report.tab_problem')}
              </button>
              <button
                type="button"
                onClick={() => setMode('feedback')}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                  mode === 'feedback'
                    ? 'border-amber-500/50 bg-amber-500/10 text-amber-400'
                    : 'border-slate-700 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <Lightbulb className="h-4 w-4" />
                {t('report.tab_suggestion')}
              </button>
            </div>

            {/* Tool Info (read-only when in tool context) */}
            {toolSlug && (
              <div className="mb-4 rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2">
                <div className="text-[10px] uppercase tracking-wider text-slate-500">{t('report.tool_label')}</div>
                <div className="text-sm text-slate-300">{toolName || toolSlug}</div>
              </div>
            )}

            {/* Description */}
            <div className="mb-4">
              <label className="mb-1.5 block text-xs font-medium text-slate-400">
                {isProblem ? t('report.label_what_happened') : t('report.label_what_to_see')}
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={
                  isProblem
                    ? t('report.placeholder_problem')
                    : t('report.placeholder_feedback')
                }
                rows={4}
                className="w-full resize-none rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-slate-600 focus:outline-none focus:ring-1 focus:ring-slate-600"
                autoFocus
              />
            </div>

            {/* Optional Attachments */}
            <div className="mb-4 space-y-2">
              {/* Include Tool State */}
              {getToolState && (
                <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/30 px-3 py-2.5 hover:bg-slate-900/50">
                  <input
                    type="checkbox"
                    checked={includeToolState}
                    onChange={(e) => setIncludeToolState(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-sky-500 focus:ring-sky-500 focus:ring-offset-slate-900"
                  />
                  <Database className="h-4 w-4 text-slate-400" />
                  <div className="flex-1">
                    <div className="text-sm text-slate-300">{t('report.include_tool_state')}</div>
                    <div className="text-xs text-slate-500">{t('report.include_tool_state_hint')}</div>
                  </div>
                </label>
              )}

              {/* Include Screenshot */}
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/30 px-3 py-2.5 hover:bg-slate-900/50">
                <input
                  type="checkbox"
                  checked={includeScreenshot}
                  onChange={(e) => handleScreenshotToggle(e.target.checked)}
                  disabled={isCapturing}
                  className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-sky-500 focus:ring-sky-500 focus:ring-offset-slate-900"
                />
                <Camera className="h-4 w-4 text-slate-400" />
                <div className="flex-1">
                  <div className="text-sm text-slate-300">
                    {isCapturing ? t('report.capturing') : t('report.include_screenshot')}
                  </div>
                  <div className="text-xs text-slate-500">{t('report.include_screenshot_hint')}</div>
                </div>
              </label>

              {/* Screenshot Preview */}
              {includeScreenshot && screenshotPreview && (
                <div className="rounded-lg border border-slate-800 bg-slate-900/30 p-2">
                  <img
                    src={screenshotPreview}
                    alt="Preview screenshot"
                    className="max-h-32 w-full rounded object-contain"
                  />
                </div>
              )}
            </div>

            {/* Context Info (collapsed) */}
            <details className="mb-4 rounded-lg border border-slate-800 bg-slate-900/30">
              <summary className="cursor-pointer px-3 py-2 text-xs text-slate-500 hover:text-slate-400">
                {t('report.auto_collected_info')}
              </summary>
              <div className="border-t border-slate-800 px-3 py-2 text-xs text-slate-500">
                <div className="grid grid-cols-2 gap-1">
                  <span>{t('report.browser')}:</span>
                  <span className="text-slate-400">{context?.browser}</span>
                  <span>{t('report.os')}:</span>
                  <span className="text-slate-400">{context?.os}</span>
                  <span>{t('report.viewport')}:</span>
                  <span className="text-slate-400">{context?.viewportWidth}×{context?.viewportHeight}</span>
                  <span>{t('report.page')}:</span>
                  <span className="truncate text-slate-400" title={context?.pageUrl}>{context?.pageUrl?.replace(/^https?:\/\/[^/]+/, '')}</span>
                </div>
              </div>
            </details>

            {/* Error */}
            {errorMessage && (
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-900/50 bg-red-950/30 p-3 text-sm text-red-400">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
              >
                {t('report.cancel')}
              </button>
              <button
                type="submit"
                disabled={status === 'submitting'}
                className="flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50"
              >
                {status === 'submitting' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('report.sending')}
                  </>
                ) : (
                  t('report.send')
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
