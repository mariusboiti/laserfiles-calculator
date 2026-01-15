'use client';

/**
 * FeedbackModal Component
 * Modal for submitting bug reports and feature requests
 */

import React, { useState, useCallback, useRef } from 'react';
import { X, Bug, Lightbulb, Upload, Loader2, Check, AlertTriangle, Trash2 } from 'lucide-react';

export type FeedbackType = 'bug' | 'feature';
export type FeedbackSeverity = 'low' | 'medium' | 'high';

interface Attachment {
  id: string;
  file: File;
  preview?: string;
}

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultToolSlug?: string;
  defaultType?: FeedbackType;
}

const TOOLS = [
  { slug: '', label: 'General / Not specific' },
  { slug: 'boxmaker', label: 'BoxMaker' },
  { slug: 'panel-splitter', label: 'Panel Splitter' },
  { slug: 'bulk-name-tags', label: 'Bulk Name Tags' },
  { slug: 'engraveprep', label: 'EngravePrep' },
  { slug: 'personalised-sign-generator', label: 'Personalised Sign Generator' },
  { slug: 'jigsaw-maker', label: 'Jigsaw Maker' },
  { slug: 'ai-depth-photo', label: 'AI Depth Photo' },
  { slug: 'price-calculator', label: 'Price Calculator' },
];

const MAX_ATTACHMENTS = 5;
const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8MB

export function FeedbackModal({ isOpen, onClose, defaultToolSlug, defaultType = 'bug' }: FeedbackModalProps) {
  const [type, setType] = useState<FeedbackType>(defaultType);
  const [toolSlug, setToolSlug] = useState(defaultToolSlug || '');
  const [severity, setSeverity] = useState<FeedbackSeverity>('medium');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return;
    
    const newAttachments: Attachment[] = [];
    
    for (const file of Array.from(files)) {
      if (attachments.length + newAttachments.length >= MAX_ATTACHMENTS) break;
      if (file.size > MAX_FILE_SIZE) continue;
      
      const att: Attachment = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
      };
      
      if (file.type.startsWith('image/')) {
        att.preview = URL.createObjectURL(file);
      }
      
      newAttachments.push(att);
    }
    
    setAttachments(prev => [...prev, ...newAttachments]);
  }, [attachments.length]);

  const removeAttachment = useCallback((id: string) => {
    setAttachments(prev => {
      const att = prev.find(a => a.id === id);
      if (att?.preview) URL.revokeObjectURL(att.preview);
      return prev.filter(a => a.id !== id);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !message.trim()) {
      setError('Please fill in the title and message');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Convert attachments to base64
      const attachmentData = await Promise.all(
        attachments.map(async (att) => {
          const arrayBuffer = await att.file.arrayBuffer();
          const bytes = new Uint8Array(arrayBuffer);
          let binary = '';
          for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          const base64 = btoa(binary);
          
          return {
            filename: att.file.name,
            mimeType: att.file.type,
            base64,
          };
        })
      );
      
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          toolSlug: toolSlug || undefined,
          pageUrl: window.location.href,
          title: title.trim(),
          message: message.trim(),
          severity: type === 'bug' ? severity : undefined,
          attachments: attachmentData,
          metadata: {
            userAgent: navigator.userAgent,
            screenWidth: window.innerWidth,
            screenHeight: window.innerHeight,
          },
        }),
      });

      const contentType = response.headers.get('content-type') || '';
      let data: any = null;
      let rawText: string | null = null;

      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        rawText = await response.text();
      }

      if (!response.ok) {
        throw new Error(
          data?.error?.message ||
            `Failed to submit feedback (HTTP ${response.status})${rawText ? `: ${rawText.slice(0, 200)}` : ''}`
        );
      }

      if (!data?.ok) {
        throw new Error(data?.error?.message || 'Failed to submit feedback');
      }
      
      setSubmitted(true);
      
      // Reset form after delay
      setTimeout(() => {
        onClose();
        setType('bug');
        setToolSlug(defaultToolSlug || '');
        setSeverity('medium');
        setTitle('');
        setMessage('');
        setAttachments([]);
        setSubmitted(false);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit feedback');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-100">Send Feedback</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Success State */}
        {submitted ? (
          <div className="flex flex-col items-center justify-center p-12">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20">
              <Check className="h-8 w-8 text-emerald-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-100">Thank you!</h3>
            <p className="mt-1 text-sm text-slate-400">Your feedback has been submitted.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6">
            {/* Type Selection */}
            <div className="mb-4 flex gap-2">
              <button
                type="button"
                onClick={() => setType('bug')}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                  type === 'bug'
                    ? 'border-red-500/50 bg-red-500/10 text-red-400'
                    : 'border-slate-700 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <Bug className="h-4 w-4" />
                Bug Report
              </button>
              <button
                type="button"
                onClick={() => setType('feature')}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                  type === 'feature'
                    ? 'border-amber-500/50 bg-amber-500/10 text-amber-400'
                    : 'border-slate-700 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <Lightbulb className="h-4 w-4" />
                Feature Request
              </button>
            </div>

            {/* Tool Selection */}
            <div className="mb-4">
              <label className="mb-1.5 block text-xs font-medium text-slate-400">Tool (optional)</label>
              <select
                value={toolSlug}
                onChange={(e) => setToolSlug(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200"
              >
                {TOOLS.map((tool) => (
                  <option key={tool.slug} value={tool.slug}>{tool.label}</option>
                ))}
              </select>
            </div>

            {/* Severity (for bugs) */}
            {type === 'bug' && (
              <div className="mb-4">
                <label className="mb-1.5 block text-xs font-medium text-slate-400">Severity</label>
                <div className="flex gap-2">
                  {(['low', 'medium', 'high'] as FeedbackSeverity[]).map((sev) => (
                    <button
                      key={sev}
                      type="button"
                      onClick={() => setSeverity(sev)}
                      className={`flex-1 rounded-lg border px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                        severity === sev
                          ? sev === 'high'
                            ? 'border-red-500/50 bg-red-500/10 text-red-400'
                            : sev === 'medium'
                            ? 'border-amber-500/50 bg-amber-500/10 text-amber-400'
                            : 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                          : 'border-slate-700 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      {sev}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Title */}
            <div className="mb-4">
              <label className="mb-1.5 block text-xs font-medium text-slate-400">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Brief description of the issue or request"
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500"
                required
              />
            </div>

            {/* Message */}
            <div className="mb-4">
              <label className="mb-1.5 block text-xs font-medium text-slate-400">Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Provide details about the bug or feature..."
                rows={4}
                className="w-full resize-none rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500"
                required
              />
            </div>

            {/* Attachments */}
            <div className="mb-4">
              <label className="mb-1.5 block text-xs font-medium text-slate-400">
                Attachments (max {MAX_ATTACHMENTS} files, 8MB each)
              </label>
              
              {attachments.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-2">
                  {attachments.map((att) => (
                    <div
                      key={att.id}
                      className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1"
                    >
                      {att.preview ? (
                        <img src={att.preview} alt="" className="h-6 w-6 rounded object-cover" />
                      ) : (
                        <div className="flex h-6 w-6 items-center justify-center rounded bg-slate-800 text-xs text-slate-400">
                          {att.file.name.split('.').pop()?.toUpperCase()}
                        </div>
                      )}
                      <span className="max-w-[120px] truncate text-xs text-slate-300">{att.file.name}</span>
                      <button
                        type="button"
                        onClick={() => removeAttachment(att.id)}
                        className="text-slate-500 hover:text-red-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              {attachments.length < MAX_ATTACHMENTS && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 rounded-lg border border-dashed border-slate-700 px-3 py-2 text-xs text-slate-400 hover:border-slate-600 hover:text-slate-300"
                >
                  <Upload className="h-4 w-4" />
                  Attach files
                </button>
              )}
              
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf,.txt,.json,.svg"
                onChange={(e) => handleFileSelect(e.target.files)}
                className="hidden"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-900/50 bg-red-950/30 p-3 text-sm text-red-400">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Feedback'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
