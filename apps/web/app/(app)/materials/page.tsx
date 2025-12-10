'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '../../../lib/api-client';

interface MaterialListItem {
  id: string;
  name: string;
  category: string;
  thicknessMm: number;
  unitType: 'SHEET' | 'M2';
  costPerSheet: number | string | null;
  costPerM2: number | string | null;
  sheetWidthMm: number | null;
  sheetHeightMm: number | null;
  stockQty: number;
  lowStockThreshold: number;
  isLowStock: boolean;
}

interface MaterialsListResponse {
  data: MaterialListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<MaterialListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [onlyLowStock, setOnlyLowStock] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await apiClient.get<MaterialsListResponse>('/materials');
        setMaterials(res.data.data);
      } catch (err: any) {
        const message = err?.response?.data?.message || 'Failed to load materials';
        setError(Array.isArray(message) ? message.join(', ') : String(message));
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const visibleMaterials = onlyLowStock
    ? materials.filter((m) => m.isLowStock)
    : materials;

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <h1 className="text-xl font-semibold tracking-tight">Materials</h1>
        <label className="flex items-center gap-2 text-xs text-slate-300">
          <input
            type="checkbox"
            checked={onlyLowStock}
            onChange={(e) => setOnlyLowStock(e.target.checked)}
            className="h-3 w-3 rounded border-slate-600 bg-slate-900 text-sky-500 focus:ring-sky-500"
          />
          <span>Show only low stock</span>
        </label>
      </div>

      {loading && <p className="text-sm text-slate-400">Loading materials...</p>}
      {error && !loading && <p className="text-sm text-red-400">{error}</p>}

      {!loading && !error && visibleMaterials.length === 0 && (
        <p className="text-sm text-slate-400">No materials found.</p>
      )}

      {!loading && !error && visibleMaterials.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60">
          <table className="min-w-full text-left text-xs text-slate-200">
            <thead className="border-b border-slate-800 bg-slate-900/80 text-[11px] uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">Thickness</th>
                <th className="px-3 py-2">Unit</th>
                <th className="px-3 py-2">Dimensions</th>
                <th className="px-3 py-2">Stock</th>
                <th className="px-3 py-2">Cost</th>
              </tr>
            </thead>
            <tbody>
              {visibleMaterials.map((m) => (
                <tr key={m.id} className="border-t border-slate-800 hover:bg-slate-800/60">
                  <td className="px-3 py-2 align-top">
                    <Link
                      href={`/materials/${m.id}`}
                      className="text-xs font-medium text-sky-400 hover:underline"
                    >
                      {m.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2 align-top text-xs text-slate-300">{m.category}</td>
                  <td className="px-3 py-2 align-top text-xs text-slate-300">
                    {m.thicknessMm} mm
                  </td>
                  <td className="px-3 py-2 align-top text-xs text-slate-300">{m.unitType}</td>
                  <td className="px-3 py-2 align-top text-xs text-slate-300">
                    {m.sheetWidthMm && m.sheetHeightMm
                      ? `${m.sheetWidthMm} × ${m.sheetHeightMm} mm`
                      : '-'}
                  </td>
                  <td className="px-3 py-2 align-top text-xs">
                    <div className="flex flex-col gap-1">
                      <span className="text-slate-200">{m.stockQty}</span>
                      <span className="text-[11px] text-slate-400">
                        Low threshold: {m.lowStockThreshold}
                      </span>
                      {m.isLowStock && (
                        <span className="inline-flex w-fit rounded-full bg-red-500/20 px-2 py-0.5 text-[11px] text-red-300">
                          Low stock
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 align-top text-xs text-slate-300">
                    {m.unitType === 'SHEET' && m.costPerSheet != null && (
                      <div>{Number(m.costPerSheet).toFixed(2)} / sheet</div>
                    )}
                    {m.unitType === 'M2' && m.costPerM2 != null && (
                      <div>{Number(m.costPerM2).toFixed(2)} / m²</div>
                    )}
                    {m.costPerSheet == null && m.costPerM2 == null && <div>-</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
