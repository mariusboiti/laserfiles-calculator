'use client';

/**
 * SVG Import Component with Validation
 * Validates files before import and shows appropriate warnings
 */

import React, { useState, useCallback, useRef } from 'react';
import { Upload, FileWarning, AlertCircle, X, Info } from 'lucide-react';
import { 
  validateSVG, 
  quickValidateSVGFile,
  getSVGComplexityLevel,
  type SVGValidationResult 
} from '@/lib/svg/validation';
import { InlineError, InlineWarning, LoadingState } from '@/components/system';

// ============================================================================
// Types
// ============================================================================

interface SVGImportProps {
  onImport: (svgString: string, fileName: string) => void;
  onError?: (error: string) => void;
  accept?: string;
  maxSizeMB?: number;
  className?: string;
  dropzoneText?: string;
  disabled?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function SVGImport({
  onImport,
  onError,
  accept = '.svg',
  maxSizeMB = 10,
  className = '',
  dropzoneText = 'Drop SVG file here or click to browse',
  disabled = false,
}: SVGImportProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [pendingFile, setPendingFile] = useState<{ file: File; svg: string } | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);

  const clearState = useCallback(() => {
    setError(null);
    setWarnings([]);
    setPendingFile(null);
  }, []);

  const handleFile = useCallback(async (file: File) => {
    clearState();
    
    // Quick validation
    const quickCheck = quickValidateSVGFile(file);
    if (!quickCheck.valid) {
      setError(quickCheck.error!);
      onError?.(quickCheck.error!);
      return;
    }

    setIsValidating(true);

    try {
      // Full validation
      const result = await validateSVG(file, { maxSizeBytes: maxSizeMB * 1024 * 1024 });
      
      if (!result.valid) {
        setError(result.error!);
        onError?.(result.error!);
        setIsValidating(false);
        return;
      }

      // Read file content
      const svgString = await file.text();
      
      // Check complexity
      const complexity = getSVGComplexityLevel(result.stats);
      
      if (result.warnings.length > 0 || complexity === 'high') {
        // Show warnings and ask for confirmation
        setWarnings(result.warnings);
        setPendingFile({ file, svg: svgString });
      } else {
        // Import directly
        onImport(svgString, file.name);
      }
    } catch (err) {
      const message = "This SVG file can't be parsed. Please try a different file.";
      setError(message);
      onError?.(message);
    } finally {
      setIsValidating(false);
    }
  }, [maxSizeMB, onImport, onError, clearState]);

  const confirmImport = useCallback(() => {
    if (pendingFile) {
      onImport(pendingFile.svg, pendingFile.file.name);
      clearState();
    }
  }, [pendingFile, onImport, clearState]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (disabled) return;
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  }, [disabled, handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  }, [handleFile]);

  const handleClick = useCallback(() => {
    if (!disabled && !isValidating) {
      inputRef.current?.click();
    }
  }, [disabled, isValidating]);

  return (
    <div className={className}>
      {/* Dropzone */}
      <div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          relative rounded-lg border-2 border-dashed p-8 text-center transition-colors cursor-pointer
          ${isDragging ? 'border-sky-500 bg-sky-950/30' : 'border-slate-700 hover:border-slate-600'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${error ? 'border-red-800' : ''}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleInputChange}
          className="hidden"
          disabled={disabled}
        />

        {isValidating ? (
          <LoadingState text="Validating SVG..." size="md" />
        ) : (
          <>
            <Upload className={`mx-auto h-10 w-10 ${error ? 'text-red-400' : 'text-slate-500'}`} />
            <p className="mt-3 text-sm text-slate-400">{dropzoneText}</p>
            <p className="mt-1 text-xs text-slate-500">Max size: {maxSizeMB}MB</p>
          </>
        )}
      </div>

      {/* Error */}
      {error && (
        <InlineError
          message={error}
          onRetry={clearState}
          className="mt-3"
        />
      )}

      {/* Warnings with confirmation */}
      {warnings.length > 0 && pendingFile && (
        <div className="mt-3 rounded-lg border border-amber-900/50 bg-amber-950/30 p-4">
          <div className="flex items-start gap-3">
            <FileWarning className="h-5 w-5 flex-shrink-0 text-amber-400 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-amber-300">
                This SVG may have issues
              </h4>
              <ul className="mt-2 space-y-1">
                {warnings.map((warning, i) => (
                  <li key={i} className="text-xs text-amber-400/90 flex items-start gap-2">
                    <span>•</span>
                    <span>{warning}</span>
                  </li>
                ))}
              </ul>
              
              <div className="mt-4 flex gap-2">
                <button
                  onClick={confirmImport}
                  className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 transition-colors"
                >
                  Import anyway
                </button>
                <button
                  onClick={clearState}
                  className="rounded-md px-3 py-1.5 text-xs text-amber-300 hover:text-amber-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Compact Import Button (for toolbars)
// ============================================================================

interface SVGImportButtonProps {
  onImport: (svgString: string, fileName: string) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  className?: string;
}

export function SVGImportButton({
  onImport,
  onError,
  disabled = false,
  className = '',
}: SVGImportButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isValidating, setIsValidating] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    const quickCheck = quickValidateSVGFile(file);
    if (!quickCheck.valid) {
      onError?.(quickCheck.error!);
      return;
    }

    setIsValidating(true);
    
    try {
      const result = await validateSVG(file);
      
      if (!result.valid) {
        onError?.(result.error!);
        return;
      }

      const svgString = await file.text();
      onImport(svgString, file.name);
    } catch {
      onError?.("This SVG file can't be parsed. Please try a different file.");
    } finally {
      setIsValidating(false);
    }
  }, [onImport, onError]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
    e.target.value = '';
  }, [handleFile]);

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".svg"
        onChange={handleChange}
        className="hidden"
        disabled={disabled || isValidating}
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={disabled || isValidating}
        className={`
          inline-flex items-center gap-2 rounded-md border border-slate-700 px-3 py-2 text-sm
          text-slate-200 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed
          transition-colors
          ${className}
        `}
      >
        <Upload className="h-4 w-4" />
        {isValidating ? 'Validating...' : 'Import SVG'}
      </button>
    </>
  );
}

export default SVGImport;
