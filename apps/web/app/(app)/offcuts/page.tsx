'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '../../../lib/api-client';
import { useT } from '../i18n';

interface OffcutListItem {
  id: string;
  material: {
    id: string;
    name: string;
    category: string;
    thicknessMm: number;
  } | null;
  materialId: string;
  thicknessMm: number;
  shapeType: 'RECTANGLE' | 'IRREGULAR';
  widthMm: number | null;
  heightMm: number | null;
  boundingBoxWidthMm: number | null;
  boundingBoxHeightMm: number | null;
  estimatedAreaMm2: number | null;
  quantity: number;
  locationLabel: string | null;
  condition: 'GOOD' | 'OK' | 'DAMAGED';
  status: 'AVAILABLE' | 'RESERVED' | 'USED' | 'DISCARDED';
  notes: string | null;
  createdAt: string;
}

interface OffcutsListResponse {
  data: OffcutListItem[];
  total: number;
}

interface MaterialOption {
  id: string;
  name: string;
  category: string;
  thicknessMm: number;
}

interface MaterialsListResponse {
  data: {
    id: string;
    name: string;
    category: string;
    thicknessMm: number;
  }[];
}

const OFFCUT_STATUSES = ['AVAILABLE', 'RESERVED', 'USED', 'DISCARDED'] as const;
const OFFCUT_CONDITIONS = ['GOOD', 'OK', 'DAMAGED'] as const;
const MATERIAL_CATEGORIES = ['PLYWOOD', 'MDF', 'ACRYLIC', 'MIRROR_ACRYLIC', 'OTHER'] as const;

export default function OffcutsPage() {
  const t = useT();

  function formatMaterialCategory(value: string) {
    const upper = String(value).toUpperCase();
    if (upper === 'PLYWOOD') return t('materials.categories.plywood');
    if (upper === 'MDF') return t('materials.categories.mdf');
    if (upper === 'ACRYLIC') return t('materials.categories.acrylic');
    if (upper === 'MIRROR_ACRYLIC') return t('materials.categories.mirror_acrylic');
    if (upper === 'OTHER') return t('materials.categories.other');
    return String(value);
  }

  function formatOffcutStatus(value: string) {
    return t(`offcuts.status.${String(value).toLowerCase()}` as any);
  }

  function formatOffcutCondition(value: string) {
    return t(`offcuts.condition.${String(value).toLowerCase()}` as any);
  }

  const [offcuts, setOffcuts] = useState<OffcutListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [materials, setMaterials] = useState<MaterialOption[]>([]);

  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterThickness, setFilterThickness] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterCondition, setFilterCondition] = useState<string>('');
  const [filterLocation, setFilterLocation] = useState<string>('');
  const [filterSearch, setFilterSearch] = useState<string>('');

  const [createMode, setCreateMode] = useState<'RECTANGLE' | 'IRREGULAR'>('RECTANGLE');
  const [createMaterialId, setCreateMaterialId] = useState<string>('');
  const [createWidth, setCreateWidth] = useState<string>('');
  const [createHeight, setCreateHeight] = useState<string>('');
  const [createBBoxWidth, setCreateBBoxWidth] = useState<string>('');
  const [createBBoxHeight, setCreateBBoxHeight] = useState<string>('');
  const [createEstimatedArea, setCreateEstimatedArea] = useState<string>('');
  const [createQuantity, setCreateQuantity] = useState<string>('1');
  const [createLocation, setCreateLocation] = useState<string>('');
  const [createCondition, setCreateCondition] = useState<'GOOD' | 'OK' | 'DAMAGED'>('GOOD');
  const [createNotes, setCreateNotes] = useState<string>('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    async function loadMaterials() {
      try {
        const res = await apiClient.get<MaterialsListResponse>('/materials');
        const opts: MaterialOption[] = res.data.data.map((m) => ({
          id: m.id,
          name: m.name,
          category: m.category,
          thicknessMm: m.thicknessMm,
        }));
        setMaterials(opts);
      } catch {
        // ignore in main UX; offcut list still works
      }
    }

    loadMaterials();
  }, []);

  useEffect(() => {
    async function loadOffcuts() {
      setLoading(true);
      setError(null);
      try {
        const res = await apiClient.get<OffcutsListResponse>('/offcuts', {
          params: {
            materialCategory: filterCategory || undefined,
            thicknessMm: filterThickness || undefined,
            status: filterStatus || undefined,
            condition: filterCondition || undefined,
            location: filterLocation || undefined,
            search: filterSearch || undefined,
          },
        });
        setOffcuts(res.data.data);
      } catch (err: any) {
        const data = err?.response?.data;
        if (data?.code === 'FEATURE_LOCKED') {
          setError(t('offcuts.feature_locked'));
        } else {
          const message = data?.message || t('offcuts.failed_to_load');
          setError(Array.isArray(message) ? message.join(', ') : String(message));
        }
      } finally {
        setLoading(false);
      }
    }

    loadOffcuts();
  }, [filterCategory, filterThickness, filterStatus, filterCondition, filterLocation, filterSearch]);

  const stats = useMemo(() => {
    const available = offcuts.filter((o) => o.status === 'AVAILABLE');
    let totalAreaMm2 = 0;
    const byCategory = new Map<string, number>();

    for (const o of available) {
      const baseArea =
        o.estimatedAreaMm2 ??
        (o.widthMm && o.heightMm ? o.widthMm * o.heightMm : null) ??
        (o.boundingBoxWidthMm && o.boundingBoxHeightMm
          ? o.boundingBoxWidthMm * o.boundingBoxHeightMm
          : null);
      if (!baseArea) continue;
      const totalForOffcut = baseArea * (o.quantity || 1);
      totalAreaMm2 += totalForOffcut;
      const cat = o.material?.category ?? 'OTHER';
      byCategory.set(cat, (byCategory.get(cat) ?? 0) + totalForOffcut);
    }

    return {
      availableCount: available.length,
      totalAreaMm2,
      byCategory,
    };
  }, [offcuts]);

  async function handleCreateOffcut(e: React.FormEvent) {
    e.preventDefault();
    if (!createMaterialId) {
      setCreateError(t('offcuts.create.validation.select_material'));
      return;
    }
    const material = materials.find((m) => m.id === createMaterialId);
    if (!material) {
      setCreateError(t('offcuts.create.validation.invalid_material'));
      return;
    }

    const quantity = parseInt(createQuantity || '1', 10) || 1;
    const widthMm = createMode === 'RECTANGLE' && createWidth ? Number(createWidth) : undefined;
    const heightMm = createMode === 'RECTANGLE' && createHeight ? Number(createHeight) : undefined;
    const boundingBoxWidthMm =
      createMode === 'IRREGULAR' && createBBoxWidth ? Number(createBBoxWidth) : undefined;
    const boundingBoxHeightMm =
      createMode === 'IRREGULAR' && createBBoxHeight ? Number(createBBoxHeight) : undefined;
    const estimatedAreaMm2 = createEstimatedArea ? Number(createEstimatedArea) : undefined;

    setCreating(true);
    setCreateError(null);
    try {
      await apiClient.post('/offcuts', {
        materialId: material.id,
        thicknessMm: material.thicknessMm,
        shapeType: createMode,
        widthMm,
        heightMm,
        boundingBoxWidthMm,
        boundingBoxHeightMm,
        estimatedAreaMm2,
        quantity,
        locationLabel: createLocation || undefined,
        condition: createCondition,
        notes: createNotes || undefined,
      });

      setCreateWidth('');
      setCreateHeight('');
      setCreateBBoxWidth('');
      setCreateBBoxHeight('');
      setCreateEstimatedArea('');
      setCreateQuantity('1');
      setCreateLocation('');
      setCreateNotes('');

      const res = await apiClient.get<OffcutsListResponse>('/offcuts');
      setOffcuts(res.data.data);
    } catch (err: any) {
      const data = err?.response?.data;
      if (data?.code === 'FEATURE_LOCKED') {
        setCreateError(t('offcuts.create.feature_locked'));
      } else if (data?.code === 'LIMIT_REACHED' && data?.limitKey === 'max_offcuts_tracked') {
        const limit = data?.limit;
        setCreateError(
          typeof limit === 'number'
            ? t('offcuts.create.limit_reached_with_limit').replace('{0}', String(limit))
            : t('offcuts.create.limit_reached_generic'),
        );
      } else {
        const message = data?.message || t('offcuts.create.failed_to_create');
        setCreateError(Array.isArray(message) ? message.join(', ') : String(message));
      }
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{t('offcuts.title')}</h1>
          <p className="mt-1 text-xs text-slate-400">
            {t('offcuts.subtitle')}
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-xs">
          <div className="text-[11px] uppercase tracking-wide text-slate-400">{t('offcuts.status.available')}</div>
          <div className="mt-1 text-2xl font-semibold text-slate-50">{stats.availableCount}</div>
          <p className="mt-2 text-[11px] text-slate-400">
            {t('offcuts.none_found')}
          </p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-xs">
          <div className="text-[11px] uppercase tracking-wide text-slate-400">{t('offcuts.total_area')}</div>
          <div className="mt-1 text-2xl font-semibold text-slate-50">
            {(stats.totalAreaMm2 / 1_000_000 || 0).toFixed(2)}
            <span className="ml-1 text-xs text-slate-400">{t('offcuts.approx_suffix')}</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            {t('offcuts.estimate_note')}
          </p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-xs">
          <div className="text-[11px] uppercase tracking-wide text-slate-400">{t('materials.table.category')}</div>
          <div className="mt-2 space-y-1">
            {Array.from(stats.byCategory.entries()).length === 0 && (
              <div className="text-[11px] text-slate-500">{t('offcuts.none_found')}</div>
            )}
            {Array.from(stats.byCategory.entries()).map(([cat, area]) => (
              <div key={cat} className="flex items-center justify-between text-[11px] text-slate-300">
                <span>{formatMaterialCategory(cat)}</span>
                <span>{(area / 1_000_000).toFixed(2)} m²</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[2fr,3fr]">
        <form
          onSubmit={handleCreateOffcut}
          className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-xs"
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-[11px] uppercase tracking-wide text-slate-400">{t('offcuts.add_offcut_title')}</div>
              <div className="mt-1 text-[11px] text-slate-500">
                {t('offcuts.add_offcut_subtitle')}
              </div>
            </div>
            <div className="inline-flex rounded-full bg-slate-800 p-1 text-[11px]">
              <button
                type="button"
                onClick={() => setCreateMode('RECTANGLE')}
                className={`rounded-full px-2 py-0.5 ${
                  createMode === 'RECTANGLE' ? 'bg-sky-500 text-slate-950' : 'text-slate-300'
                }`}
              >
                {t('offcuts.rectangle')}
              </button>
              <button
                type="button"
                onClick={() => setCreateMode('IRREGULAR')}
                className={`rounded-full px-2 py-0.5 ${
                  createMode === 'IRREGULAR' ? 'bg-sky-500 text-slate-950' : 'text-slate-300'
                }`}
              >
                {t('offcuts.irregular')}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-[11px] text-slate-300">
              {t('offcuts.table.material')}
              <select
                value={createMaterialId}
                onChange={(e) => setCreateMaterialId(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100"
              >
                <option value="">{t('offcuts.form.select_material')}</option>
                {materials.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} · {m.category} · {m.thicknessMm}mm
                  </option>
                ))}
              </select>
            </label>

            {createMode === 'RECTANGLE' && (
              <div className="grid grid-cols-2 gap-2">
                <label className="block text-[11px] text-slate-300">
                  {t('offcuts.form.width')}
                  <input
                    type="number"
                    min={1}
                    value={createWidth}
                    onChange={(e) => setCreateWidth(e.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100"
                  />
                </label>
                <label className="block text-[11px] text-slate-300">
                  {t('offcuts.form.height')}
                  <input
                    type="number"
                    min={1}
                    value={createHeight}
                    onChange={(e) => setCreateHeight(e.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100"
                  />
                </label>
              </div>
            )}

            {createMode === 'IRREGULAR' && (
              <div className="grid grid-cols-2 gap-2">
                <label className="block text-[11px] text-slate-300">
                  {t('offcuts.form.bbox_width')}
                  <input
                    type="number"
                    min={1}
                    value={createBBoxWidth}
                    onChange={(e) => setCreateBBoxWidth(e.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100"
                  />
                </label>
                <label className="block text-[11px] text-slate-300">
                  {t('offcuts.form.bbox_height')}
                  <input
                    type="number"
                    min={1}
                    value={createBBoxHeight}
                    onChange={(e) => setCreateBBoxHeight(e.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100"
                  />
                </label>
              </div>
            )}

            <label className="block text-[11px] text-slate-300">
              {t('offcuts.form.estimated_area')}
              <input
                type="number"
                min={1}
                value={createEstimatedArea}
                onChange={(e) => setCreateEstimatedArea(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100"
              />
            </label>

            <div className="grid grid-cols-2 gap-2">
              <label className="block text-[11px] text-slate-300">
                {t('offcuts.form.quantity')}
                <input
                  type="number"
                  min={1}
                  value={createQuantity}
                  onChange={(e) => setCreateQuantity(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100"
                />
              </label>
              <label className="block text-[11px] text-slate-300">
                {t('offcuts.form.condition')}
                <select
                  value={createCondition}
                  onChange={(e) => setCreateCondition(e.target.value as any)}
                  className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100"
                >
                  {OFFCUT_CONDITIONS.map((c) => (
                    <option key={c} value={c}>
                      {formatOffcutCondition(c)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block text-[11px] text-slate-300">
              {t('offcuts.form.location')}
              <input
                type="text"
                value={createLocation}
                onChange={(e) => setCreateLocation(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100"
                placeholder={t('offcuts.form.location_placeholder')}
              />
            </label>

            <label className="block text-[11px] text-slate-300">
              {t('offcuts.form.notes')}
              <textarea
                value={createNotes}
                onChange={(e) => setCreateNotes(e.target.value)}
                rows={2}
                className="mt-1 w-full resize-none rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100"
                placeholder={t('offcuts.form.notes_placeholder')}
              />
            </label>

            {createError && <p className="text-[11px] text-red-400">{createError}</p>}

            <button
              type="submit"
              disabled={creating}
              className="mt-1 inline-flex items-center justify-center rounded-md border border-sky-500 bg-sky-500 px-3 py-1.5 text-[11px] font-medium text-slate-950 hover:bg-sky-400 disabled:opacity-60"
            >
              {creating ? t('offcuts.saving') : t('offcuts.save_offcut')}
            </button>
          </div>
        </form>

        <div className="space-y-3">
          <div className="flex flex-wrap items-end gap-2 text-xs">
            <div className="flex flex-col gap-1">
              <span className="text-[11px] text-slate-400">{t('offcuts.filters')}</span>
              <div className="flex flex-wrap gap-2">
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-100"
                >
                  <option value="">{t('offcuts.filter.category')}</option>
                  {MATERIAL_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {formatMaterialCategory(c)}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  value={filterThickness}
                  onChange={(e) => setFilterThickness(e.target.value)}
                  placeholder={t('offcuts.filter.thickness')}
                  className="w-28 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-100"
                />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-100"
                >
                  <option value="">{t('offcuts.filter.status')}</option>
                  {OFFCUT_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {formatOffcutStatus(s)}
                    </option>
                  ))}
                </select>
                <select
                  value={filterCondition}
                  onChange={(e) => setFilterCondition(e.target.value)}
                  className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-100"
                >
                  <option value="">{t('offcuts.filter.condition')}</option>
                  {OFFCUT_CONDITIONS.map((c) => (
                    <option key={c} value={c}>
                      {formatOffcutCondition(c)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex flex-1 flex-col gap-1">
              <span className="text-[11px] text-slate-400">{t('offcuts.search')}</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={filterLocation}
                  onChange={(e) => setFilterLocation(e.target.value)}
                  placeholder={t('offcuts.filter.location_placeholder')}
                  className="flex-1 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-100"
                />
                <input
                  type="text"
                  value={filterSearch}
                  onChange={(e) => setFilterSearch(e.target.value)}
                  placeholder={t('offcuts.filter.notes_placeholder')}
                  className="flex-1 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-100"
                />
              </div>
            </div>
          </div>

          {loading && <p className="text-xs text-slate-400">{t('offcuts.loading')}</p>}
          {error && !loading && <p className="text-xs text-red-400">{error}</p>}

          {!loading && !error && offcuts.length === 0 && (
            <p className="text-xs text-slate-400">{t('offcuts.none_found')}</p>
          )}

          {!loading && !error && offcuts.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60">
              <table className="min-w-full text-left text-[11px] text-slate-200">
                <thead className="border-b border-slate-800 bg-slate-900/80 uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-3 py-2">{t('offcuts.table.material')}</th>
                    <th className="px-3 py-2">{t('offcuts.table.shape_dimensions')}</th>
                    <th className="px-3 py-2">{t('offcuts.table.qty')}</th>
                    <th className="px-3 py-2">{t('offcuts.table.location')}</th>
                    <th className="px-3 py-2">{t('offcuts.table.condition')}</th>
                    <th className="px-3 py-2">{t('offcuts.table.status')}</th>
                    <th className="px-3 py-2">{t('offcuts.table.created')}</th>
                  </tr>
                </thead>
                <tbody>
                  {offcuts.map((o) => {
                    const materialLabel = o.material
                      ? `${o.material.name} · ${o.material.category} · ${o.thicknessMm}mm`
                      : t('offcuts.material_unknown').replace('{0}', String(o.materialId)).replace('{1}', String(o.thicknessMm));
                    const sizeLabel = (() => {
                      if (o.shapeType === 'RECTANGLE' && o.widthMm && o.heightMm) {
                        return `${o.widthMm} × ${o.heightMm} mm`;
                      }
                      if (o.boundingBoxWidthMm && o.boundingBoxHeightMm) {
                        return t('offcuts.shape.irregular').replace('{0}', String(o.boundingBoxWidthMm)).replace('{1}', String(o.boundingBoxHeightMm));
                      }
                      return o.shapeType === 'RECTANGLE' ? t('offcuts.shape.rectangle_unknown') : t('offcuts.shape.irregular_unknown');
                    })();
                    const created = new Date(o.createdAt);
                    return (
                      <tr key={o.id} className="border-t border-slate-800 hover:bg-slate-800/60">
                        <td className="px-3 py-2 align-top text-[11px] text-slate-200">
                          <div>{materialLabel}</div>
                          {o.notes && (
                            <div className="mt-1 max-w-xs text-[11px] text-slate-400">
                              {o.notes}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2 align-top text-[11px] text-slate-200">{sizeLabel}</td>
                        <td className="px-3 py-2 align-top text-[11px] text-slate-200">{o.quantity}</td>
                        <td className="px-3 py-2 align-top text-[11px] text-slate-200">
                          {o.locationLabel || <span className="text-slate-500">-</span>}
                        </td>
                        <td className="px-3 py-2 align-top text-[11px]">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] ${
                              o.condition === 'GOOD'
                                ? 'bg-emerald-500/15 text-emerald-300'
                                : o.condition === 'OK'
                                ? 'bg-amber-500/15 text-amber-300'
                                : 'bg-red-500/15 text-red-300'
                            }`}
                          >
                            {t(`offcuts.condition.${o.condition.toLowerCase()}` as any)}
                          </span>
                        </td>
                        <td className="px-3 py-2 align-top text-[11px]">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] ${
                              o.status === 'AVAILABLE'
                                ? 'bg-sky-500/15 text-sky-300'
                                : o.status === 'RESERVED'
                                ? 'bg-indigo-500/15 text-indigo-300'
                                : o.status === 'USED'
                                ? 'bg-emerald-500/15 text-emerald-300'
                                : 'bg-slate-500/15 text-slate-300'
                            }`}
                          >
                            {t(`offcuts.status.${o.status.toLowerCase()}` as any)}
                          </span>
                        </td>
                        <td className="px-3 py-2 align-top text-[11px] text-slate-300">
                          {created.toLocaleDateString()} {created.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
