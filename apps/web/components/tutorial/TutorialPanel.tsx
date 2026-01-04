'use client';

import { useEffect, useRef } from 'react';
import { X, BookOpen, ListChecks, Lightbulb, AlertTriangle, Play, ChevronDown, ChevronUp, Clock, BarChart3 } from 'lucide-react';
import { useState } from 'react';
import type { TutorialData, TutorialSection } from './types';
import { SECTION_IDS } from './types';

interface TutorialPanelProps {
  isOpen: boolean;
  onClose: () => void;
  tutorial: TutorialData | null;
  isLoading?: boolean;
}

const SECTION_ICONS: Record<string, React.ReactNode> = {
  [SECTION_IDS.OVERVIEW]: <BookOpen className="h-4 w-4" />,
  [SECTION_IDS.STEP_BY_STEP]: <ListChecks className="h-4 w-4" />,
  [SECTION_IDS.BEST_PRACTICES]: <Lightbulb className="h-4 w-4" />,
  [SECTION_IDS.TROUBLESHOOTING]: <AlertTriangle className="h-4 w-4" />,
  [SECTION_IDS.VIDEO]: <Play className="h-4 w-4" />,
};

const DIFFICULTY_COLORS = {
  beginner: 'bg-green-500/20 text-green-400 border-green-500/30',
  intermediate: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  advanced: 'bg-red-500/20 text-red-400 border-red-500/30',
};

function YouTubeEmbed({ url }: { url: string }) {
  // Extract video ID from various YouTube URL formats
  const getVideoId = (url: string) => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s?]+)/,
      /youtube\.com\/shorts\/([^&\s?]+)/,
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const videoId = getVideoId(url);
  if (!videoId) return <div className="text-sm text-slate-400">Invalid YouTube URL</div>;

  return (
    <div className="relative w-full overflow-hidden rounded-lg" style={{ paddingBottom: '56.25%' }}>
      <iframe
        className="absolute inset-0 h-full w-full"
        src={`https://www.youtube.com/embed/${videoId}`}
        title="Tutorial Video"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}

function Mp4Embed({ url }: { url: string }) {
  return (
    <video
      className="w-full rounded-lg"
      controls
      preload="metadata"
    >
      <source src={url} type="video/mp4" />
      Your browser does not support the video tag.
    </video>
  );
}

function SectionContent({ section }: { section: TutorialSection }) {
  const [expanded, setExpanded] = useState(true);

  const icon = SECTION_ICONS[section.id] || <BookOpen className="h-4 w-4" />;

  return (
    <div className="border-b border-slate-800 last:border-b-0">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-slate-800/50"
      >
        <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
          {icon}
          {section.title}
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-slate-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-slate-400" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-1">
          {/* Text content */}
          {section.content && (
            <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
              {section.content}
            </p>
          )}

          {/* Step-by-step list */}
          {section.steps && section.steps.length > 0 && (
            <ol className="mt-2 space-y-3">
              {section.steps.map((step, idx) => (
                <li key={idx} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-500/20 text-xs font-medium text-sky-400">
                    {idx + 1}
                  </span>
                  <div className="flex-1 pt-0.5">
                    <div className="text-sm font-medium text-slate-200">{step.title}</div>
                    {step.content && (
                      <div className="mt-1 text-xs text-slate-400">{step.content}</div>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}

          {/* Tips list */}
          {section.tips && section.tips.length > 0 && (
            <ul className="mt-2 space-y-2">
              {section.tips.map((tip, idx) => (
                <li key={idx} className="flex gap-2 text-sm text-slate-300">
                  <span className="text-sky-400">•</span>
                  {tip}
                </li>
              ))}
            </ul>
          )}

          {/* Video embed or Coming Soon */}
          {section.id === SECTION_IDS.VIDEO && !section.videoUrl && (
            <div className="mt-3 rounded-lg border-2 border-dashed border-slate-700 bg-slate-800/30 px-6 py-8 text-center">
              <Play className="mx-auto h-8 w-8 text-slate-600" />
              <div className="mt-2 text-sm font-medium text-slate-400">Coming Soon</div>
            </div>
          )}
          {section.videoUrl && (
            <div className="mt-3">
              {section.videoType === 'mp4' ? (
                <Mp4Embed url={section.videoUrl} />
              ) : (
                <YouTubeEmbed url={section.videoUrl} />
              )}
            </div>
          )}

          {/* Image */}
          {section.imageUrl && (
            <div className="mt-3">
              <img
                src={section.imageUrl}
                alt={section.imageAlt || 'Tutorial image'}
                className="w-full rounded-lg border border-slate-700"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function TutorialPanel({ isOpen, onClose, tutorial, isLoading }: TutorialPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node) && isOpen) {
        onClose();
      }
    };
    // Delay to prevent immediate close on button click
    const timer = setTimeout(() => {
      window.addEventListener('mousedown', handleClickOutside);
    }, 100);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" />

      {/* Panel */}
      <div
        ref={panelRef}
        className="fixed right-0 top-0 z-50 h-full w-full max-w-md overflow-hidden border-l border-slate-700 bg-slate-900 shadow-2xl sm:w-[420px]"
        style={{
          animation: 'slideInRight 0.2s ease-out',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700 bg-slate-950/80 px-4 py-3">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-sky-400" />
            <span className="font-semibold text-slate-100">Tutorial</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="h-[calc(100%-56px)] overflow-y-auto">
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-sm text-slate-400">Loading tutorial...</div>
            </div>
          ) : tutorial ? (
            <div>
              {/* Title section */}
              <div className="border-b border-slate-800 bg-slate-950/50 px-4 py-4">
                <h2 className="text-lg font-semibold text-slate-100">{tutorial.title}</h2>
                <p className="mt-1 text-sm text-slate-400">{tutorial.description}</p>

                {/* Meta badges */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {tutorial.estimatedTime && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-800/50 px-2 py-0.5 text-xs text-slate-300">
                      <Clock className="h-3 w-3" />
                      {tutorial.estimatedTime}
                    </span>
                  )}
                  {tutorial.difficulty && (
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${DIFFICULTY_COLORS[tutorial.difficulty]}`}>
                      <BarChart3 className="h-3 w-3" />
                      {tutorial.difficulty.charAt(0).toUpperCase() + tutorial.difficulty.slice(1)}
                    </span>
                  )}
                </div>
              </div>

              {/* Sections */}
              <div>
                {tutorial.sections.map((section) => (
                  <SectionContent key={section.id} section={section} />
                ))}
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center px-4 text-center">
              <BookOpen className="h-12 w-12 text-slate-600" />
              <p className="mt-3 text-sm text-slate-400">
                No tutorial available for this tool yet.
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Check back later for updates.
              </p>
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
      `}</style>
    </>
  );
}
