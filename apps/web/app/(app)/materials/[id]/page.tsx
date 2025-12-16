'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '../../../../lib/api-client';
import { useT } from '../../i18n';

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
  const t = useT();
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

  function formatUnitType(value: string) {
    const upper = String(value).toUpperCase();
    if (upper === 'SHEET') return t('unit.sheet');
    if (upper === 'M2') return t('unit.m2');
    return String(value);
  }

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
        const message = err?.response?.data?.message || t('material_detail.failed_to_load');
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
      setError(t('material_detail.validation.qty_non_negative'));
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
      const message = err?.response?.data?.message || t('material_detail.failed_to_create_movement');
      setError(Array.isArray(message) ? message.join(', ') : String(message));
    } finally {
      setSaving(false);
    }
  }

  if (!id) {
    return <p className="text-sm text-red-400">{t('material_detail.missing_id')}</p>;
  }

  if (loading) {
    return <p className="text-sm text-slate-400">{t('material_detail.loading')}</p>;
  }

  if (error) {
    return <p className="text-sm text-red-400">{error}</p>;
  }

  if (!material) {
    return <p className="text-sm text-slate-400">{t('material_detail.not_found')}</p>;
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
              {t('materials.title')}
            </Link>
            <span>/</span>
            <span>{material.name}</span>
          </div>
          <h1 className="mt-1 text-xl font-semibold tracking-tight">
            {material.name}
          </h1>
          <p className="text-xs text-slate-400">
            {material.category} • {material.thicknessMm} mm • {formatUnitType(material.unitType)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex rounded-full bg-slate-800 px-2 py-0.5">
            {t('material_detail.stock_label')}: {material.stockQty}
          </span>
          <span className="inline-flex rounded-full bg-slate-800 px-2 py-0.5">
            {t('material_detail.low_threshold_label')}: {material.lowStockThreshold}
          </span>
          {material.isLowStock && (
            <span className="inline-flex rounded-full bg-red-500/20 px-2 py-0.5 text-red-300">
              {t('material_detail.low_stock')}
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-xs text-slate-200">
            <div className="mb-2 text-sm font-medium">{t('material_detail.details_title')}</div>
            <div className="grid gap-2 md:grid-cols-2">
              <div>
                <div className="text-slate-400">{t('material_detail.dimensions_label')}</div>
                <div>{dimensions}</div>
              </div>
              <div>
                <div className="text-slate-400">{t('material_detail.cost_label')}</div>
                {material.unitType === 'SHEET' && material.costPerSheet != null && (
                  <div>{Number(material.costPerSheet).toFixed(2)} {t('materials.cost_per_sheet_suffix')}</div>
                )}
                {material.unitType === 'M2' && material.costPerM2 != null && (
                  <div>{Number(material.costPerM2).toFixed(2)} {t('materials.cost_per_m2_suffix')}</div>
                )}
                {material.costPerSheet == null && material.costPerM2 == null && <div>-</div>}
              </div>
              <div>
                <div className="text-slate-400">{t('material_detail.default_waste_label')}</div>
                <div>{material.defaultWastePercent ?? '-'}%</div>
              </div>
              <div>
                <div className="text-slate-400">{t('material_detail.created_label')}</div>
                <div>{new Date(material.createdAt).toLocaleString()}</div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
            <div className="mb-2 text-sm font-medium">{t('material_detail.add_stock_movement_title')}</div>
            <form onSubmit={handleCreateMovement} className="flex flex-wrap items-end gap-2 text-xs">
              <div className="flex flex-col gap-1">
                <label className="text-slate-300">{t('material_detail.type_label')}</label>
                <select
                  value={movementType}
                  onChange={(e) => setMovementType(e.target.value as any)}
                  className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                >
                  <option value="IN">{t('material_detail.movement_type.in')}</option>
                  <option value="OUT">{t('material_detail.movement_type.out')}</option>
                  <option value="ADJUST">{t('material_detail.movement_type.adjust')}</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-slate-300">{t('material_detail.quantity_label')}</label>
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
                <label className="text-slate-300">{t('material_detail.note_optional_label')}</label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  placeholder={t('material_detail.note_placeholder')}
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="rounded-md bg-sky-500 px-3 py-1 text-xs font-medium text-white hover:bg-sky-600 disabled:opacity-60"
              >
                {saving ? t('material_detail.saving') : t('material_detail.save_movement')}
              </button>
            </form>
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
            <div className="mb-2 text-sm font-medium">{t('material_detail.stock_movements_title')}</div>
            {movements.length === 0 && (
              <p className="text-xs text-slate-400">{t('material_detail.no_stock_movements')}</p>
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
                        {mv.type === 'IN'
                          ? t('material_detail.movement_type.in')
                          : mv.type === 'OUT'
                          ? t('material_detail.movement_type.out')
                          : t('material_detail.movement_type.adjust')}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {new Date(mv.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="mt-0.5 text-slate-200">{t('material_detail.qty_prefix')} {mv.qty}</div>
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
