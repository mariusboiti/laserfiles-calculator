import { useState, useCallback } from 'react';
import type { CSVMapping } from '../types';
import type { ParsedCSVData } from '../utils/csvUtils';
import { parseCSV } from '../utils/csvUtils';
import { useLanguage } from '@/app/(app)/i18n';
import { getStudioTranslation } from '@/lib/i18n/studioTranslations';

interface CSVUploadProps {
  onCSVLoad: (data: ParsedCSVData, mapping: CSVMapping) => void;
  csvData: ParsedCSVData | null;
  mapping: CSVMapping;
}

export function CSVUpload({ onCSVLoad, csvData, mapping }: CSVUploadProps) {
  const { locale } = useLanguage();
  const t = useCallback((key: string) => getStudioTranslation(locale as any, key), [locale]);

  const [error, setError] = useState<string>('');
  const [localMapping, setLocalMapping] = useState<CSVMapping>(mapping);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      setError(t('bulk_name_tags.csv.error_not_csv'));
      return;
    }

    try {
      const data = await parseCSV(file);
      if (data.headers.length === 0) {
        setError(t('bulk_name_tags.csv.error_no_headers'));
        return;
      }

      const defaultMapping: CSVMapping = {
        nameColumn: data.headers[0],
        line2Column: data.headers.length > 1 ? data.headers[1] : undefined
      };

      setLocalMapping(defaultMapping);
      setError('');
      onCSVLoad(data, defaultMapping);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('bulk_name_tags.csv.error_parse_failed'));
    }
  };

  const handleMappingChange = (field: 'nameColumn' | 'line2Column', value: string) => {
    const newMapping = { ...localMapping, [field]: value || undefined };
    setLocalMapping(newMapping);
    if (csvData) {
      onCSVLoad(csvData, newMapping);
    }
  };

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-6">
      <h2 className="text-xl font-semibold text-slate-100 mb-2">{t('bulk_name_tags.csv.step_title')}</h2>
      <p className="text-sm text-slate-400 mb-4">
        {t('bulk_name_tags.csv.desc')}
      </p>

      <input
        type="file"
        accept=".csv"
        onChange={handleFileChange}
        className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-sky-500/10 file:text-sky-400 hover:file:bg-sky-500/20"
      />

      {error && (
        <p className="text-red-500 text-sm mt-2">{error}</p>
      )}

      {csvData && (
        <div className="mt-4 space-y-4">
          <p className="text-sm font-medium text-green-600">
            {t('bulk_name_tags.csv.loaded').replace('{count}', String(csvData.rows.length))}
          </p>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                {t('bulk_name_tags.csv.name_column')}
              </label>
              <select
                value={localMapping.nameColumn}
                onChange={(e) => handleMappingChange('nameColumn', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {csvData.headers.map(header => (
                  <option key={header} value={header}>{header}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                {t('bulk_name_tags.csv.line2_column')}
              </label>
              <select
                value={localMapping.line2Column || ''}
                onChange={(e) => handleMappingChange('line2Column', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">{t('bulk_name_tags.csv.none_option')}</option>
                {csvData.headers.map(header => (
                  <option key={header} value={header}>{header}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="border border-gray-200 rounded overflow-hidden">
            <div className="overflow-x-auto max-h-48">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-slate-800/60">
                  <tr>
                    {csvData.headers.map(header => (
                      <th key={header} className="px-4 py-2 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {csvData.rows.slice(0, 10).map((row, idx) => (
                    <tr key={idx}>
                      {csvData.headers.map(header => (
                        <td key={header} className="px-4 py-2 whitespace-nowrap text-gray-900">
                          {row[header]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {csvData.rows.length > 10 && (
              <div className="bg-gray-50 px-4 py-2 text-xs text-gray-500">
                {t('bulk_name_tags.csv.showing_first')
                  .replace('{shown}', '10')
                  .replace('{total}', String(csvData.rows.length))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
