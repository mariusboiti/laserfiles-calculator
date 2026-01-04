import { useMemo } from 'react';
import type { NameRecord } from '../types';
import { parseManualNames } from '../utils/manualNamesUtils';

interface ManualNamesInputProps {
  value: string;
  onChange: (value: string) => void;
  onNamesChange: (names: NameRecord[]) => void;
}

export function ManualNamesInput({ value, onChange, onNamesChange }: ManualNamesInputProps) {
  const parsed = useMemo(() => parseManualNames(value), [value]);

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-6">
      <h2 className="text-xl font-semibold text-slate-100 mb-2">Step 2: Enter Names (Manual)</h2>
      <p className="text-sm text-slate-400 mb-4">
        Type one name per line. For an optional second line, use the &quot;|&quot; separator.
      </p>

      <textarea
        value={value}
        onChange={(e) => {
          const next = e.target.value;
          onChange(next);
          onNamesChange(parseManualNames(next));
        }}
        rows={8}
        placeholder={"John Doe\nJane Smith | VIP\nAlex | Team A"}
        className="w-full px-3 py-2 border border-slate-700 bg-slate-950 text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono text-sm"
      />

      <div className="mt-3 text-sm text-slate-300 bg-slate-800/60 p-3 rounded">
        ✓ Parsed: {parsed.length} name{parsed.length === 1 ? '' : 's'}
      </div>
    </div>
  );
}
