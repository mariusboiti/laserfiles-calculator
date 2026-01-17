/**
 * UploadZone Component
 * 
 * Handles file upload via drag & drop or file picker.
 * Features:
 * - File size limit: 25 MB
 * - Supported formats: JPG, PNG, WebP
 * - Dimension limit: 8000px (auto-downscale with warning)
 * - User-friendly error messages
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { ImageIcon, AlertCircle } from 'lucide-react';
import { useImageStore } from '../../store/useImageStore';
import { ImageInfo } from '../../types';
import { useLanguage } from '@/lib/i18n/i18n';
import { getStudioTranslation } from '@/lib/i18n/studioTranslations';

const ACCEPTED_FORMATS = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB
const MAX_DIMENSION = 8000; // Max width or height in pixels

export function UploadZone() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isDownscaledWarning, setIsDownscaledWarning] = useState(false);
  const { originalImage, uploadError, setOriginalImage, setUploadError } = useImageStore();
  const { locale } = useLanguage();
  const t = useCallback((key: string) => getStudioTranslation(locale as any, key), [locale]);

  const formatMessage = useCallback((key: string, values: Record<string, string | number>) => {
    let message = t(key);
    Object.entries(values).forEach(([token, value]) => {
      message = message.replace(`{${token}}`, String(value));
    });
    return message;
  }, [t]);

  useEffect(() => {
    const handler = () => {
      fileInputRef.current?.click();
    };

    window.addEventListener('engraveprep:open-file-picker', handler);
    return () => {
      window.removeEventListener('engraveprep:open-file-picker', handler);
    };
  }, []);

  const handleFile = (file: File) => {
    // Clear previous errors
    setUploadError(null);
    setIsDownscaledWarning(false);

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setUploadError(formatMessage('engraveprep.upload.error_file_too_large', {
        size: (file.size / 1024 / 1024).toFixed(1),
        max: 25,
      }));
      setIsDownscaledWarning(false);
      return;
    }

    // Validate file format
    if (!ACCEPTED_FORMATS.includes(file.type)) {
      setUploadError(t('engraveprep.upload.error_unsupported_format'));
      setIsDownscaledWarning(false);
      return;
    }

    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onerror = () => {
      setUploadError(t('engraveprep.upload.error_load_failed'));
      setIsDownscaledWarning(false);
      URL.revokeObjectURL(url);
    };

    img.onload = () => {
      try {
        let finalWidth = img.width;
        let finalHeight = img.height;
        let wasDownscaled = false;

        // Check for extremely large dimensions and downscale if needed
        const maxDim = Math.max(img.width, img.height);
        if (maxDim > MAX_DIMENSION) {
          const scale = MAX_DIMENSION / maxDim;
          finalWidth = Math.round(img.width * scale);
          finalHeight = Math.round(img.height * scale);
          wasDownscaled = true;
          console.warn(`Image downscaled from ${img.width}x${img.height} to ${finalWidth}x${finalHeight}`);
        }

        const canvas = document.createElement('canvas');
        canvas.width = finalWidth;
        canvas.height = finalHeight;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setUploadError(t('engraveprep.upload.error_canvas_failed'));
          setIsDownscaledWarning(false);
          URL.revokeObjectURL(url);
          return;
        }
        
        ctx.drawImage(img, 0, 0, finalWidth, finalHeight);
        const imageData = ctx.getImageData(0, 0, finalWidth, finalHeight);
        
        const info: ImageInfo = {
          fileName: file.name.replace(/\.[^/.]+$/, ''),
          originalWidth: img.width,
          originalHeight: img.height,
          fileSize: file.size,
        };
        
        setOriginalImage(imageData, info);
        
        // Show warning if image was downscaled
        if (wasDownscaled) {
          setUploadError(formatMessage('engraveprep.upload.warning_downscaled', {
            originalWidth: img.width,
            originalHeight: img.height,
            width: finalWidth,
            height: finalHeight,
          }));
          setIsDownscaledWarning(true);
        }
        
        URL.revokeObjectURL(url);
      } catch (error) {
        setUploadError(t('engraveprep.upload.error_processing_failed'));
        setIsDownscaledWarning(false);
        URL.revokeObjectURL(url);
        console.error('Image processing error:', error);
      }
    };

    img.src = url;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  if (originalImage) return null;

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 gap-4 bg-[#1a1d2e]">
      {/* Error message */}
      {uploadError && (
        <div className="w-full max-w-2xl px-4 py-3 bg-red-900/30 border border-red-600 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-red-200">{uploadError}</p>
            {isDownscaledWarning && (
              <button
                onClick={() => setUploadError(null)}
                className="text-xs text-red-400 hover:text-red-300 underline mt-1"
              >
                {t('engraveprep.upload.dismiss')}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Upload zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          w-full max-w-lg p-12 sm:p-16 border-2 border-dashed rounded-lg
          cursor-pointer transition-all
          ${isDragging 
            ? 'border-blue-500 bg-blue-500/5' 
            : 'border-gray-700 hover:border-gray-600 bg-[#2a2d44]/30'
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileSelect}
          className="hidden"
        />
        
        <div className="flex flex-col items-center gap-4 text-center">
          <div className={`p-5 rounded-full ${isDragging ? 'bg-blue-600/20' : 'bg-blue-600/10'}`}>
            <ImageIcon className="w-16 h-16 text-blue-500" />
          </div>
          
          <div>
            <h3 className="text-xl font-semibold text-white mb-2">
              {t('engraveprep.upload.title')}
            </h3>
            <p className="text-sm text-gray-400">
              {t('engraveprep.upload.subtitle')}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              {t('engraveprep.upload.formats')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
