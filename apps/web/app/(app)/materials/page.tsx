'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '../../../lib/api-client';
import { useT } from '../i18n';

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

interface CategoryOption {
  label: string;
  value: string;
}

export default function MaterialsPage() {
  const t = useT();
  const [materials, setMaterials] = useState<MaterialListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [onlyLowStock, setOnlyLowStock] = useState(false);
  const [categories, setCategories] = useState<CategoryOption[]>([]);

  const [isAdmin, setIsAdmin] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const [name, setName] = useState('');
  const [category, setCategory] = useState('PLYWOOD');
  const [thicknessMm, setThicknessMm] = useState('');
  const [unitType, setUnitType] = useState<'SHEET' | 'M2'>('SHEET');
  const [costPerSheet, setCostPerSheet] = useState('');
  const [costPerM2, setCostPerM2] = useState('');
  const [sheetWidthMm, setSheetWidthMm] = useState('');
  const [sheetHeightMm, setSheetHeightMm] = useState('');
  const [stockQty, setStockQty] = useState('');
  const [lowStockThreshold, setLowStockThreshold] = useState('');
  const [defaultWastePercent, setDefaultWastePercent] = useState('');

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const storedUser = window.localStorage.getItem('user');
      if (!storedUser) return;
      const parsed = JSON.parse(storedUser);
      setIsAdmin(parsed?.role === 'ADMIN');
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await apiClient.get<CategoryOption[]>('/materials/categories');
        setCategories(res.data);
      } catch (err) {
        // Use default categories if API fails
        setCategories([
          { label: t('materials.categories.plywood'), value: 'PLYWOOD' },
          { label: t('materials.categories.mdf'), value: 'MDF' },
          { label: t('materials.categories.acrylic'), value: 'ACRYLIC' },
          { label: t('materials.categories.mirror_acrylic'), value: 'MIRROR_ACRYLIC' },
          { label: t('materials.categories.other'), value: 'OTHER' },
        ]);
      }
    }

    loadCategories();
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await apiClient.get<MaterialsListResponse>('/materials');
        setMaterials(res.data.data);
      } catch (err: any) {
        const message = err?.response?.data?.message || t('materials.failed_to_load');
        setError(Array.isArray(message) ? message.join(', ') : String(message));
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  function resetForm() {
    setName('');
    setCategory('PLYWOOD');
    setThicknessMm('');
    setUnitType('SHEET');
    setCostPerSheet('');
    setCostPerM2('');
    setSheetWidthMm('');
    setSheetHeightMm('');
    setStockQty('');
    setLowStockThreshold('');
    setDefaultWastePercent('');
    setSaveError(null);
  }

  function formatUnitType(value: string) {
    const upper = String(value).toUpperCase();
    if (upper === 'SHEET') return t('unit.sheet');
    if (upper === 'M2') return t('unit.m2');
    return String(value);
  }

  function formatCategory(value: string) {
    const cat = categories.find((c) => c.value === value);
    return cat ? cat.label : value;
  }

  async function handleCreateMaterial(e: FormEvent) {
    e.preventDefault();
    setSaveError(null);

    if (!isAdmin) {
      setSaveError(t('materials.validation.only_admin_create'));
      return;
    }

    const trimmedName = name.trim();
    const trimmedCategory = category.trim();
    const parsedThickness = Number(thicknessMm);

    if (!trimmedName) {
      setSaveError(t('materials.validation.name_required'));
      return;
    }

    if (!trimmedCategory) {
      setSaveError(t('materials.validation.category_required'));
      return;
    }

    if (!parsedThickness || parsedThickness <= 0) {
      setSaveError(t('materials.validation.thickness_positive'));
      return;
    }

    if (unitType === 'SHEET') {
      const parsedWidth = Number(sheetWidthMm);
      const parsedHeight = Number(sheetHeightMm);
      const parsedCostPerSheet = Number(costPerSheet);

      if (!parsedWidth || parsedWidth <= 0 || !parsedHeight || parsedHeight <= 0) {
        setSaveError(t('materials.validation.sheet_dimensions_required'));
        return;
      }

      if (!parsedCostPerSheet || parsedCostPerSheet <= 0) {
        setSaveError(t('materials.validation.cost_per_sheet_required'));
        return;
      }
    }

    if (unitType === 'M2') {
      const parsedCostPerM2 = Number(costPerM2);
      if (!parsedCostPerM2 || parsedCostPerM2 <= 0) {
        setSaveError(t('materials.validation.cost_per_m2_required'));
        return;
      }
    }

    setSaving(true);
    try {
      const payload: any = {
        name: trimmedName,
        category: trimmedCategory,
        thicknessMm: parsedThickness,
        unitType,
      };

      if (unitType === 'SHEET') {
        payload.costPerSheet = Number(costPerSheet);
        payload.sheetWidthMm = Number(sheetWidthMm);
        payload.sheetHeightMm = Number(sheetHeightMm);
      } else {
        payload.costPerM2 = Number(costPerM2);
      }

      if (stockQty.trim() !== '') {
        payload.stockQty = Number(stockQty);
      }
      if (lowStockThreshold.trim() !== '') {
        payload.lowStockThreshold = Number(lowStockThreshold);
      }
      if (defaultWastePercent.trim() !== '') {
        payload.defaultWastePercent = Number(defaultWastePercent);
      }

      const res = await apiClient.post<MaterialListItem>('/materials', payload);

      setMaterials((prev) =>
        [...prev, res.data].sort((a, b) => a.name.localeCompare(b.name)),
      );
      resetForm();
      setShowCreate(false);
    } catch (err: any) {
      const message = err?.response?.data?.message || t('materials.failed_to_create');
      setSaveError(Array.isArray(message) ? message.join(', ') : String(message));
    } finally {
      setSaving(false);
    }
  }

  const visibleMaterials = onlyLowStock
    ? materials.filter((m) => m.isLowStock)
    : materials;

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight">{t('materials.title')}</h1>
          {isAdmin && (
            <button
              type="button"
              data-tour="materials-add-material"
              onClick={() => {
                setShowCreate((prev) => !prev);
                setSaveError(null);
              }}
              className="rounded-md bg-emerald-500 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-600"
            >
              {showCreate ? t('materials.close') : t('materials.add_material')}
            </button>
          )}
        </div>
        <label className="flex items-center gap-2 text-xs text-slate-300" data-tour="materials-low-stock-toggle">
          <input
            type="checkbox"
            checked={onlyLowStock}
            onChange={(e) => setOnlyLowStock(e.target.checked)}
            className="h-3 w-3 rounded border-slate-600 bg-slate-900 text-sky-500 focus:ring-sky-500"
          />
          <span>{t('materials.show_only_low_stock')}</span>
        </label>
      </div>

      {isAdmin && showCreate && (
        <form
          onSubmit={handleCreateMaterial}
          className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-200"
        >
          <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
            {t('materials.form.title')}
          </div>
          <div className="grid gap-2 md:grid-cols-3">
            <label className="flex flex-col gap-1 md:col-span-2">
              <span>{t('materials.form.name')}</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                required
              />
            </label>
            <label className="flex flex-col gap-1">
              <span>{t('materials.form.category')}</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                required
              >
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-2 md:grid-cols-4">
            <label className="flex flex-col gap-1">
              <span>{t('materials.form.thickness')}</span>
              <input
                type="number"
                min={1}
                step={1}
                value={thicknessMm}
                onChange={(e) => setThicknessMm(e.target.value)}
                className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                required
              />
            </label>

            <label className="flex flex-col gap-1">
              <span>{t('materials.form.unit')}</span>
              <select
                value={unitType}
                onChange={(e) => {
                  const next = e.target.value as 'SHEET' | 'M2';
                  setUnitType(next);
                  setSaveError(null);
                }}
                className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              >
                <option value="SHEET">{formatUnitType('SHEET')}</option>
                <option value="M2">{formatUnitType('M2')}</option>
              </select>
            </label>

            {unitType === 'SHEET' ? (
              <label className="flex flex-col gap-1 md:col-span-2">
                <span>{t('materials.form.cost_per_sheet')}</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={costPerSheet}
                  onChange={(e) => setCostPerSheet(e.target.value)}
                  className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  required
                />
              </label>
            ) : (
              <label className="flex flex-col gap-1 md:col-span-2">
                <span>{t('materials.form.cost_per_m2')}</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={costPerM2}
                  onChange={(e) => setCostPerM2(e.target.value)}
                  className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  required
                />
              </label>
            )}
          </div>

          {unitType === 'SHEET' && (
            <div className="grid gap-2 md:grid-cols-4">
              <label className="flex flex-col gap-1">
                <span>{t('materials.form.sheet_width')}</span>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={sheetWidthMm}
                  onChange={(e) => setSheetWidthMm(e.target.value)}
                  className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  required
                />
              </label>
              <label className="flex flex-col gap-1">
                <span>{t('materials.form.sheet_height')}</span>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={sheetHeightMm}
                  onChange={(e) => setSheetHeightMm(e.target.value)}
                  className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  required
                />
              </label>
            </div>
          )}

          <div className="grid gap-2 md:grid-cols-4">
            <label className="flex flex-col gap-1">
              <span>{t('materials.form.stock_qty')}</span>
              <input
                type="number"
                min={0}
                step={1}
                value={stockQty}
                onChange={(e) => setStockQty(e.target.value)}
                className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span>{t('materials.form.low_stock_threshold')}</span>
              <input
                type="number"
                min={0}
                step={1}
                value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(e.target.value)}
                className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span>{t('materials.form.default_waste_percent')}</span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={defaultWastePercent}
                onChange={(e) => setDefaultWastePercent(e.target.value)}
                className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              />
            </label>
          </div>

          {saveError && <p className="text-[11px] text-red-400">{saveError}</p>}

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-emerald-500 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? t('materials.saving') : t('materials.save_material')}
            </button>
            <button
              type="button"
              onClick={() => {
                resetForm();
                setShowCreate(false);
              }}
              className="rounded-md border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:bg-slate-800"
            >
              {t('materials.cancel')}
            </button>
          </div>
        </form>
      )}

      {loading && <p className="text-sm text-slate-400">{t('materials.loading')}</p>}
      {error && !loading && <p className="text-sm text-red-400">{error}</p>}

      {!loading && !error && visibleMaterials.length === 0 && (
        <p className="text-sm text-slate-400">{t('materials.none_found')}</p>
      )}

      {!loading && !error && visibleMaterials.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60">
          <table className="min-w-full text-left text-xs text-slate-200">
            <thead className="border-b border-slate-800 bg-slate-900/80 text-[11px] uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-3 py-2">{t('materials.table.name')}</th>
                <th className="px-3 py-2">{t('materials.table.category')}</th>
                <th className="px-3 py-2">{t('materials.table.thickness')}</th>
                <th className="px-3 py-2">{t('materials.table.unit')}</th>
                <th className="px-3 py-2">{t('materials.table.dimensions')}</th>
                <th className="px-3 py-2">{t('materials.table.stock')}</th>
                <th className="px-3 py-2">{t('materials.table.cost')}</th>
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
                  <td className="px-3 py-2 align-top text-xs text-slate-300">{formatCategory(m.category)}</td>
                  <td className="px-3 py-2 align-top text-xs text-slate-300">
                    {m.thicknessMm} mm
                  </td>
                  <td className="px-3 py-2 align-top text-xs text-slate-300">{formatUnitType(m.unitType)}</td>
                  <td className="px-3 py-2 align-top text-xs text-slate-300">
                    {m.sheetWidthMm && m.sheetHeightMm
                      ? `${m.sheetWidthMm} × ${m.sheetHeightMm} mm`
                      : t('common.none')}
                  </td>
                  <td className="px-3 py-2 align-top text-xs">
                    <div className="flex flex-col gap-1">
                      <span className="text-slate-200">{m.stockQty}</span>
                      <span className="text-[11px] text-slate-400">
                        {t('materials.low_threshold')}: {m.lowStockThreshold}
                      </span>
                      {m.isLowStock && (
                        <span className="inline-flex w-fit rounded-full bg-red-500/20 px-2 py-0.5 text-[11px] text-red-300">
                          {t('materials.low_stock')}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 align-top text-xs text-slate-300">
                    {m.unitType === 'SHEET' && m.costPerSheet != null && (
                      <div>
                        {Number(m.costPerSheet).toFixed(2)} {t('materials.cost_per_sheet_suffix')}
                      </div>
                    )}
                    {m.unitType === 'M2' && m.costPerM2 != null && (
                      <div>
                        {Number(m.costPerM2).toFixed(2)} {t('materials.cost_per_m2_suffix')}
                      </div>
                    )}
                    {m.costPerSheet == null && m.costPerM2 == null && <div>{t('common.none')}</div>}
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
