import { useCallback, useState } from 'react';
import { useLanguage } from '@/app/(app)/i18n';
import { getStudioTranslation } from '@/lib/i18n/studioTranslations';
import { SVGInfo, UnitMode } from '../types';
import { parseSVG } from '../lib/svg/parser';

interface UploaderProps {
  onSVGLoaded: (svgInfo: SVGInfo) => void;
  unitMode: UnitMode;
  onUnitModeChange: (mode: UnitMode) => void;
  svgInfo: SVGInfo | null;
}

export function Uploader({ onSVGLoaded, unitMode, onUnitModeChange, svgInfo }: UploaderProps) {
  const { locale } = useLanguage();
  const t = useCallback((key: string) => getStudioTranslation(locale as any, key), [locale]);

  const localizeRuntimeError = useCallback((err: unknown) => {
    if (err instanceof Error) {
      if (err.message.startsWith('panel_splitter.')) {
        const [key, details] = err.message.split(':');
        if (details) {
          return t(key).replace('{details}', details);
        }
        return t(err.message);
      }
      return err.message;
    }
    return t('panel_splitter.uploader.error_failed_to_parse');
  }, [t]);

  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTestPath, setSelectedTestPath] = useState<string>('/tools/panel-splitter/test-templates/01_simple_rect_mm.svg');
  const [isLoadingTest, setIsLoadingTest] = useState(false);

  const testFiles = [
    {
      label: t('panel_splitter.uploader.test_file_1_label'),
      path: '/tools/panel-splitter/test-templates/01_simple_rect_mm.svg',
    },
    {
      label: t('panel_splitter.uploader.test_file_2_label'),
      path: '/tools/panel-splitter/test-templates/02_groups_transforms_viewbox_only.svg',
    },
    {
      label: t('panel_splitter.uploader.test_file_3_label'),
      path: '/tools/panel-splitter/test-templates/03_heavy_stress.svg',
    },
  ];

  const handleFile = useCallback(async (file: File) => {
    setError(null);

    if (!file.name.toLowerCase().endsWith('.svg')) {
      setError(t('panel_splitter.uploader.error_invalid_file_type'));
      return;
    }

    try {
      const content = await file.text();
      const info = parseSVG(content, file.name, unitMode);
      onSVGLoaded(info);
    } catch (err) {
      setError(localizeRuntimeError(err));
    }
  }, [localizeRuntimeError, onSVGLoaded, unitMode]);

  const handleLoadTestFile = useCallback(async () => {
    setError(null);
    setIsLoadingTest(true);

    try {
      const response = await fetch(selectedTestPath, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`${t('panel_splitter.uploader.error_failed_to_load_test_file')} (${response.status})`);
      }
      const content = await response.text();
      const fileName = selectedTestPath.split('/').pop() || 'test.svg';
      const info = parseSVG(content, fileName, unitMode);
      onSVGLoaded(info);
    } catch (err) {
      setError(localizeRuntimeError(err));
    } finally {
      setIsLoadingTest(false);
    }
  }, [localizeRuntimeError, onSVGLoaded, selectedTestPath, unitMode]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  return (
    <div className="card">
      <h2 className="text-lg font-semibold text-slate-100 mb-4">{t('panel_splitter.uploader.title')}</h2>
      
      <div
        className={`
          border-2 border-dashed rounded-lg p-8 text-center transition-colors duration-200 cursor-pointer
          ${isDragging 
            ? 'border-sky-500 bg-sky-50' 
            : 'border-gray-300 hover:border-sky-400 hover:bg-gray-50'
          }
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <input
          id="file-input"
          type="file"
          accept=".svg"
          className="hidden"
          onChange={handleFileInput}
        />
        
        <div className="flex flex-col items-center gap-2">
          <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="text-gray-600">
            <span className="font-medium text-sky-600">{t('panel_splitter.uploader.click_to_upload')}</span>{' '}
            {t('panel_splitter.uploader.or_drag_and_drop')}
          </p>
          <p className="text-sm text-gray-500">{t('panel_splitter.uploader.svg_files_only')}</p>
        </div>
      </div>

      {error && (
        <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="mt-4">
        <label className="block text-sm font-medium text-slate-300 mb-2">{t('panel_splitter.uploader.load_test_files')}</label>
        <div className="flex gap-2">
          <select
            value={selectedTestPath}
            onChange={(e) => setSelectedTestPath(e.target.value)}
            className="input-field flex-1"
          >
            {testFiles.map((f) => (
              <option key={f.path} value={f.path}>
                {f.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn-secondary whitespace-nowrap"
            onClick={handleLoadTestFile}
            disabled={isLoadingTest}
          >
            {isLoadingTest ? t('panel_splitter.uploader.loading') : t('panel_splitter.uploader.load')}
          </button>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          {t('panel_splitter.uploader.test_files_note')}{' '}
          <code>/public/tools/panel-splitter/test-templates</code>.
        </p>
      </div>

      {svgInfo && (
        <div className="mt-4 p-3 bg-slate-800/60 rounded-lg border border-slate-700">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium text-slate-200">{svgInfo.fileName}</span>
          </div>
          <div className="text-sm text-slate-300 space-y-1">
            <p>
              <span className="font-medium">{t('panel_splitter.uploader.size_label')}</span>{' '}
              {svgInfo.detectedWidthMm.toFixed(2)} × {svgInfo.detectedHeightMm.toFixed(2)} mm
            </p>
            {svgInfo.viewBox && (
              <p>
                <span className="font-medium">{t('panel_splitter.uploader.viewbox_label')}</span>{' '}
                {svgInfo.viewBox.x} {svgInfo.viewBox.y} {svgInfo.viewBox.width} {svgInfo.viewBox.height}
              </p>
            )}
            {svgInfo.width && svgInfo.height && (
              <p>
                <span className="font-medium">{t('panel_splitter.uploader.original_label')}</span>{' '}
                {svgInfo.width}{svgInfo.widthUnit} × {svgInfo.height}{svgInfo.heightUnit}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="mt-4">
        <label className="block text-sm font-medium text-slate-300 mb-2">{t('panel_splitter.uploader.unit_mode')}</label>
        <select
          value={unitMode}
          onChange={(e) => onUnitModeChange(e.target.value as UnitMode)}
          className="input-field"
        >
          <option value="auto">{t('panel_splitter.uploader.unit_mode_auto')}</option>
          <option value="px96">{t('panel_splitter.uploader.unit_mode_px96')}</option>
          <option value="px72">{t('panel_splitter.uploader.unit_mode_px72')}</option>
        </select>
        <p className="mt-1 text-xs text-slate-500">
          {t('panel_splitter.uploader.unit_mode_help')}
        </p>
      </div>
    </div>
  );
}
