'use client';

/**
 * Tour Overlay Component
 * Displays tour popover anchored to target element with highlighting
 */

import { useEffect, useState, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, SkipForward } from 'lucide-react';
import type { TourStep, TourPlacement } from '@/lib/tours/types';

interface TourOverlayProps {
  step: TourStep;
  stepIndex: number;
  totalSteps: number;
  targetElement: HTMLElement | null;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onFinish: () => void;
  onClose: () => void;
}

interface PopoverPosition {
  top: number;
  left: number;
  placement: TourPlacement;
}

function calculatePosition(
  target: HTMLElement | null,
  popover: HTMLElement | null,
  preferredPlacement: TourPlacement = 'auto'
): PopoverPosition {
  if (!target || !popover) {
    return { top: window.innerHeight / 2, left: window.innerWidth / 2, placement: 'bottom' };
  }

  const targetRect = target.getBoundingClientRect();
  const popoverRect = popover.getBoundingClientRect();
  const padding = 12;
  const arrowSize = 8;

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  // Calculate available space in each direction
  const spaceTop = targetRect.top;
  const spaceBottom = viewportHeight - targetRect.bottom;
  const spaceLeft = targetRect.left;
  const spaceRight = viewportWidth - targetRect.right;

  let placement = preferredPlacement;

  // Auto-determine best placement
  if (placement === 'auto') {
    const spaces = [
      { dir: 'bottom' as const, space: spaceBottom },
      { dir: 'top' as const, space: spaceTop },
      { dir: 'right' as const, space: spaceRight },
      { dir: 'left' as const, space: spaceLeft },
    ];
    spaces.sort((a, b) => b.space - a.space);
    placement = spaces[0].dir;
  }

  let top = 0;
  let left = 0;

  switch (placement) {
    case 'top':
      top = targetRect.top - popoverRect.height - padding - arrowSize;
      left = targetRect.left + targetRect.width / 2 - popoverRect.width / 2;
      break;
    case 'bottom':
      top = targetRect.bottom + padding + arrowSize;
      left = targetRect.left + targetRect.width / 2 - popoverRect.width / 2;
      break;
    case 'left':
      top = targetRect.top + targetRect.height / 2 - popoverRect.height / 2;
      left = targetRect.left - popoverRect.width - padding - arrowSize;
      break;
    case 'right':
      top = targetRect.top + targetRect.height / 2 - popoverRect.height / 2;
      left = targetRect.right + padding + arrowSize;
      break;
  }

  // Clamp to viewport
  top = Math.max(padding, Math.min(top, viewportHeight - popoverRect.height - padding));
  left = Math.max(padding, Math.min(left, viewportWidth - popoverRect.width - padding));

  return { top, left, placement };
}

export function TourOverlay({
  step,
  stepIndex,
  totalSteps,
  targetElement,
  onNext,
  onPrev,
  onSkip,
  onFinish,
  onClose,
}: TourOverlayProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<PopoverPosition>({
    top: 0,
    left: 0,
    placement: 'bottom',
  });
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);

  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === totalSteps - 1;

  // Get text content (i18n fallback)
  const title = step.titleFallback;
  const body = step.bodyFallback;

  // Update position when target changes
  useEffect(() => {
    if (!targetElement) {
      setHighlightRect(null);
      return;
    }

    const updatePosition = () => {
      const rect = targetElement.getBoundingClientRect();
      setHighlightRect(rect);

      if (popoverRef.current) {
        const pos = calculatePosition(targetElement, popoverRef.current, step.placement);
        setPosition(pos);
      }
    };

    updatePosition();

    // Update on scroll/resize
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [targetElement, step.placement]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        if (isLastStep) {
          onFinish();
        } else {
          onNext();
        }
      } else if (e.key === 'ArrowLeft') {
        if (!isFirstStep) {
          onPrev();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFirstStep, isLastStep, onNext, onPrev, onFinish, onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[9998] bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* Highlight cutout */}
      {highlightRect && (
        <div
          className="fixed z-[9999] pointer-events-none rounded-lg ring-4 ring-sky-500 ring-offset-2 ring-offset-transparent shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"
          style={{
            top: highlightRect.top - 4,
            left: highlightRect.left - 4,
            width: highlightRect.width + 8,
            height: highlightRect.height + 8,
          }}
        />
      )}

      {/* Popover */}
      <div
        ref={popoverRef}
        className="fixed z-[10000] w-80 rounded-xl border border-slate-700 bg-slate-900 shadow-2xl"
        style={{
          top: position.top,
          left: position.left,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-500 text-xs font-bold text-white">
              {stepIndex + 1}
            </span>
            <span className="text-xs text-slate-400">
              of {totalSteps}
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="text-base font-semibold text-slate-100">{title}</h3>
          <p className="mt-2 text-sm text-slate-400 leading-relaxed">{body}</p>

          {/* Target not found warning */}
          {!targetElement && (
            <p className="mt-2 text-xs text-amber-400">
              ⚠️ Target element not found. Click Next to continue.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-800 px-4 py-3">
          <button
            onClick={onSkip}
            className="text-xs text-slate-500 hover:text-slate-300"
          >
            Skip tour
          </button>

          <div className="flex items-center gap-2">
            {!isFirstStep && (
              <button
                onClick={onPrev}
                className="flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
              >
                <ChevronLeft className="h-3 w-3" />
                Back
              </button>
            )}

            {isLastStep ? (
              <button
                onClick={onFinish}
                className="flex items-center gap-1 rounded-lg bg-sky-500 px-4 py-1.5 text-xs font-medium text-white hover:bg-sky-600"
              >
                Finish
              </button>
            ) : (
              <button
                onClick={onNext}
                className="flex items-center gap-1 rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-600"
              >
                Next
                <ChevronRight className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
