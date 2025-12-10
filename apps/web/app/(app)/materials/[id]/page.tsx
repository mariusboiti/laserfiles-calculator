'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '../../../../lib/api-client';

interface MaterialDetail {
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
  defaultWastePercent: number | null;
  isLowStock: boolean;
  createdAt: string;
  updatedAt: string;
}

interface StockMovement {
  id: string;
  type: 'IN' | 'OUT' | 'ADJUST';
  qty: number;
  note: string | null;
  createdAt: string;
}

interface CreateStockMovementResponse {
  movement: StockMovement;
  material: MaterialDetail;
}

export default function MaterialDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [material, setMaterial] = useState<MaterialDetail | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [movementType, setMovementType] = useState<'IN' | 'OUT' | 'ADJUST'>('IN');
  const [qty, setQty] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [materialRes, movementsRes] = await Promise.all([
          apiClient.get<MaterialDetail>(`/materials/${id}`),
          apiClient.get<StockMovement[]>(`/materials/${id}/stock-movements`),
        ]);
        setMaterial(materialRes.data);
        setMovements(movementsRes.data);
      } catch (err: any) {
        const message = err?.response?.data?.message || 'Failed to load material';
        setError(Array.isArray(message) ? message.join(', ') : String(message));
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id]);

  async function handleCreateMovement(e: FormEvent) {
    e.preventDefault();
    if (!id) return;
    const parsedQty = Number(qty);
    if (!parsedQty || parsedQty < 0) {
      setError('Quantity must be a non-negative number');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await apiClient.post<CreateStockMovementResponse>(
        `/materials/${id}/stock-movements`,
        {
          type: movementType,
          qty: parsedQty,
          note: note || undefined,
        },
      );

      setMaterial(res.data.material);
      setMovements((prev) => [res.data.movement, ...prev]);
      setQty('');
      setNote('');
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Failed to create stock movement';
      setError(Array.isArray(message) ? message.join(', ') : String(message));
    } finally {
      setSaving(false);
    }
  }

  if (!id) {
    return <p className="text-sm text-red-400">Missing material id in URL.</p>;
  }

  if (loading) {
    return <p className="text-sm text-slate-400">Loading material...</p>;
  }

  if (error) {
    return <p className="text-sm text-red-400">{error}</p>;
  }

  if (!material) {
    return <p className="text-sm text-slate-400">Material not found.</p>;
  }

  const dimensions =
    material.sheetWidthMm && material.sheetHeightMm
      ? `${material.sheetWidthMm} × ${material.sheetHeightMm} mm`
      : '-';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Link href="/materials" className="text-sky-400 hover:underline">
              Materials
            </Link>
            <span>/</span>
            <span>{material.name}</span>
          </div>
          <h1 className="mt-1 text-xl font-semibold tracking-tight">
            {material.name}
          </h1>
          <p className="text-xs text-slate-400">
            {material.category} • {material.thicknessMm} mm • {material.unitType}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex rounded-full bg-slate-800 px-2 py-0.5">
            Stock: {material.stockQty}
          </span>
          <span className="inline-flex rounded-full bg-slate-800 px-2 py-0.5">
            Low threshold: {material.lowStockThreshold}
          </span>
          {material.isLowStock && (
            <span className="inline-flex rounded-full bg-red-500/20 px-2 py-0.5 text-red-300">
              Low stock
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-xs text-slate-200">
            <div className="mb-2 text-sm font-medium">Details</div>
            <div className="grid gap-2 md:grid-cols-2">
              <div>
                <div className="text-slate-400">Dimensions</div>
                <div>{dimensions}</div>
              </div>
              <div>
                <div className="text-slate-400">Cost</div>
                {material.unitType === 'SHEET' && material.costPerSheet != null && (
                  <div>{Number(material.costPerSheet).toFixed(2)} / sheet</div>
                )}
                {material.unitType === 'M2' && material.costPerM2 != null && (
                  <div>{Number(material.costPerM2).toFixed(2)} / m²</div>
                )}
                {material.costPerSheet == null && material.costPerM2 == null && <div>-</div>}
              </div>
              <div>
                <div className="text-slate-400">Default waste %</div>
                <div>{material.defaultWastePercent ?? '-'}%</div>
              </div>
              <div>
                <div className="text-slate-400">Created</div>
                <div>{new Date(material.createdAt).toLocaleString()}</div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
            <div className="mb-2 text-sm font-medium">Add stock movement</div>
            <form onSubmit={handleCreateMovement} className="flex flex-wrap items-end gap-2 text-xs">
              <div className="flex flex-col gap-1">
                <label className="text-slate-300">Type</label>
                <select
                  value={movementType}
                  onChange={(e) => setMovementType(e.target.value as any)}
                  className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                >
                  <option value="IN">IN (add to stock)</option>
                  <option value="OUT">OUT (remove from stock)</option>
                  <option value="ADJUST">ADJUST (set exact stock)</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-slate-300">Quantity</label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  className="w-24 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  required
                />
              </div>
              <div className="flex flex-1 flex-col gap-1 min-w-[120px]">
                <label className="text-slate-300">Note (optional)</label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  placeholder="e.g. New delivery, adjustment, etc."
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="rounded-md bg-sky-500 px-3 py-1 text-xs font-medium text-white hover:bg-sky-600 disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save movement'}
              </button>
            </form>
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
            <div className="mb-2 text-sm font-medium">Stock movements</div>
            {movements.length === 0 && (
              <p className="text-xs text-slate-400">No stock movements yet.</p>
            )}
            {movements.length > 0 && (
              <ul className="space-y-2 text-xs">
                {movements.map((mv) => (
                  <li key={mv.id} className="border-b border-slate-800 pb-1 last:border-b-0">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] ${
                          mv.type === 'IN'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : mv.type === 'OUT'
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-slate-700 text-slate-100'
                        }`}
                      >
                        {mv.type}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {new Date(mv.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="mt-0.5 text-slate-200">Qty: {mv.qty}</div>
                    {mv.note && (
                      <div className="text-[11px] text-slate-400">{mv.note}</div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
