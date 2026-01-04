'use client';

/**
 * Save AI Image Button
 * Visible when there is a generated AI image in tool state
 */

import React, { useState } from 'react';
import { Save, Loader2, Check } from 'lucide-react';
import { saveImage, type AIImageAssetInput } from '@/lib/ai/aiImageLibrary';

interface SaveAIImageButtonProps {
  imageData: {
    dataUrl: string;
    mime?: 'image/png' | 'image/jpeg' | 'image/webp';
    prompt?: string;
    provider?: string;
    width?: number;
    height?: number;
  } | null;
  toolSlug: string;
  onSaved?: () => void;
  onError?: (error: string) => void;
  className?: string;
  size?: 'sm' | 'md';
}

export function SaveAIImageButton({
  imageData,
  toolSlug,
  onSaved,
  onError,
  className = '',
  size = 'md',
}: SaveAIImageButtonProps) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!imageData?.dataUrl) {
    return null;
  }

  const handleSave = async () => {
    if (saving || saved) return;

    setSaving(true);

    try {
      const input: AIImageAssetInput = {
        dataUrl: imageData.dataUrl,
        mime: imageData.mime || 'image/png',
        toolSlug,
        prompt: imageData.prompt,
        provider: imageData.provider,
        width: imageData.width,
        height: imageData.height,
        title: imageData.prompt?.slice(0, 50) || `${toolSlug} image`,
      };

      const result = await saveImage(input);

      if (result.success) {
        setSaved(true);
        onSaved?.();
        
        // Reset saved state after 2 seconds
        setTimeout(() => setSaved(false), 2000);
      } else {
        onError?.(result.error);
      }
    } catch (e) {
      onError?.(e instanceof Error ? e.message : 'Failed to save image');
    } finally {
      setSaving(false);
    }
  };

  const sizeClasses = size === 'sm' 
    ? 'px-2 py-1 text-xs gap-1'
    : 'px-3 py-1.5 text-xs gap-1.5';

  return (
    <button
      onClick={handleSave}
      disabled={saving || saved}
      className={`
        inline-flex items-center rounded-md font-medium transition-colors
        ${saved 
          ? 'bg-emerald-600 text-white' 
          : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
        }
        disabled:cursor-not-allowed
        ${sizeClasses}
        ${className}
      `}
      title="Save generated image so you can reuse it later"
    >
      {saving ? (
        <>
          <Loader2 className={size === 'sm' ? 'w-3 h-3 animate-spin' : 'w-3.5 h-3.5 animate-spin'} />
          Saving...
        </>
      ) : saved ? (
        <>
          <Check className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
          Saved
        </>
      ) : (
        <>
          <Save className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
          Save
        </>
      )}
    </button>
  );
}

/**
 * Inline save hint text
 */
export function SaveImageHint({ className = '' }: { className?: string }) {
  return (
    <p className={`text-[10px] text-slate-500 ${className}`}>
      Save generated images so you can reuse them later.
    </p>
  );
}

export default SaveAIImageButton;
