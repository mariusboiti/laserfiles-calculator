import { useState } from 'react';
import type { CSVMapping } from '../types';
import type { ParsedCSVData } from '../utils/csvUtils';
import { parseCSV } from '../utils/csvUtils';

interface CSVUploadProps {
  onCSVLoad: (data: ParsedCSVData, mapping: CSVMapping) => void;
  csvData: ParsedCSVData | null;
  mapping: CSVMapping;
}

export function CSVUpload({ onCSVLoad, csvData, mapping }: CSVUploadProps) {
  const [error, setError] = useState<string>('');
  const [localMapping, setLocalMapping] = useState<CSVMapping>(mapping);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      setError('Please upload a CSV file');
      return;
    }

    try {
      const data = await parseCSV(file);
      if (data.headers.length === 0) {
        setError('CSV file has no headers');
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
      setError(err instanceof Error ? err.message : 'Failed to parse CSV');
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
      <h2 className="text-xl font-semibold text-slate-100 mb-2">Step 2: Upload Names (CSV)</h2>
      <p className="text-sm text-slate-400 mb-4">
        Upload a CSV file with at least a &quot;Name&quot; column. Optionally include a second column for additional text.
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
          <p className="text-sm font-medium text-green-600">✓ CSV loaded ({csvData.rows.length} rows)</p>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Name Column
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
                Second Line Column (Optional)
              </label>
              <select
                value={localMapping.line2Column || ''}
                onChange={(e) => handleMappingChange('line2Column', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">None</option>
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
                Showing first 10 of {csvData.rows.length} rows
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
