'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { apiClient } from '../../../lib/api-client';
import { useT } from '../i18n';

interface TemplateSummary {
  id: string;
  name: string;
}

interface TemplatesListResponse {
  data: TemplateSummary[];
  total: number;
}

interface MaterialOption {
  id: string;
  name: string;
  thicknessMm: number;
  unitType: 'SHEET' | 'M2';
}

interface MaterialsListResponse {
  data: MaterialOption[];
  total: number;
  page: number;
  pageSize: number;
}

interface TemplateProductListItem {
  id: string;
  name: string;
  templateId: string;
  variantId?: string | null;
  materialId?: string | null;
  defaultQuantity: number;
  personalizationJson?: any;
  priceOverride?: number | null;
  isActive: boolean;
  createdAt: string;
  template?: {
    id: string;
    name: string;
    slug?: string;
  } | null;
  variant?: {
    id: string;
    name: string;
  } | null;
  material?: {
    id: string;
    name: string;
  } | null;
}

interface TemplateProductsListResponse {
  data: TemplateProductListItem[];
  total: number;
}

interface TemplateVariantSummary {
  id: string;
  name: string;
  isActive: boolean;
}

export default function TemplateProductsPage() {
  const t = useT();
  const [templateProducts, setTemplateProducts] = useState<TemplateProductListItem[]>([]);
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [materials, setMaterials] = useState<MaterialOption[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [onlyActive, setOnlyActive] = useState(true);

  const [newName, setNewName] = useState('');
  const [newTemplateId, setNewTemplateId] = useState('');
  const [newVariantId, setNewVariantId] = useState('');
  const [newMaterialId, setNewMaterialId] = useState('');
  const [newQuantity, setNewQuantity] = useState('1');
  const [newPriceOverride, setNewPriceOverride] = useState('');
  const [newIsActive, setNewIsActive] = useState(true);
  const [newPersonalizationText, setNewPersonalizationText] = useState('');

  function formatUnitType(value: string) {
    const upper = String(value).toUpperCase();
    if (upper === 'SHEET') return t('unit.sheet');
    if (upper === 'M2') return t('unit.m2');
    return String(value);
  }

  const [variantsForTemplate, setVariantsForTemplate] = useState<TemplateVariantSummary[]>([]);

  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editMaterialId, setEditMaterialId] = useState('');
  const [editQuantity, setEditQuantity] = useState('1');
  const [editPriceOverride, setEditPriceOverride] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);
  const [editError, setEditError] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  const searchParams = useSearchParams();

  async function loadTemplateProducts(params?: { search?: string; isActive?: boolean }) {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<TemplateProductsListResponse>('/template-products', {
        params: {
          ...(params?.search ? { search: params.search } : {}),
          ...(typeof params?.isActive === 'boolean' ? { isActive: params.isActive } : {}),
        },
      });
      setTemplateProducts(res.data.data);
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Failed to load template products';
      setError(Array.isArray(message) ? message.join(', ') : String(message));
    } finally {
      setLoading(false);
    }
  }

  async function loadMeta() {
    try {
      const [templatesRes, materialsRes] = await Promise.all([
        apiClient.get<TemplatesListResponse>('/templates', {
          params: { isActive: true },
        }),
        apiClient.get<MaterialsListResponse>('/materials'),
      ]);
      setTemplates(templatesRes.data.data);
      setMaterials(materialsRes.data.data);
    } catch {
      // meta is helpful but not critical; errors will be visible in network tab
    }
  }

  useEffect(() => {
    loadTemplateProducts({ isActive: true });
    loadMeta();
    const fromQuery = searchParams.get('templateId');
    if (fromQuery) {
      handleTemplateChange(fromQuery);
    }
  }, []);

  async function handleFilterSubmit(e: FormEvent) {
    e.preventDefault();
    loadTemplateProducts({
      search: search || undefined,
      isActive: onlyActive ? true : undefined,
    });
  }

  async function handleTemplateChange(templateId: string) {
    setNewTemplateId(templateId);
    setNewVariantId('');
    setVariantsForTemplate([]);

    if (!templateId) return;

    try {
      const res = await apiClient.get<TemplateVariantSummary[]>(`/templates/${templateId}/variants`);
      setVariantsForTemplate(res.data);
    } catch {
      setVariantsForTemplate([]);
    }
  }

  async function handleCreateTemplateProduct(e: FormEvent) {
    e.preventDefault();

    if (!newName.trim()) {
      setCreateError('Name is required');
      return;
    }
    if (!newTemplateId) {
      setCreateError('Template is required');
      return;
    }

    const qtyNum = Number(newQuantity);
    if (!qtyNum || Number.isNaN(qtyNum) || qtyNum <= 0) {
      setCreateError('Default quantity must be at least 1');
      return;
    }

    let priceOverrideNum: number | undefined;
    if (newPriceOverride.trim()) {
      const parsed = Number(newPriceOverride.trim());
      if (Number.isNaN(parsed)) {
        setCreateError('Price override must be a number');
        return;
      }
      priceOverrideNum = parsed;
    }

    let personalizationJson: any | undefined;
    if (newPersonalizationText.trim()) {
      try {
        personalizationJson = JSON.parse(newPersonalizationText);
      } catch {
        setCreateError('Personalization defaults must be valid JSON');
        return;
      }
    }

    setCreating(true);
    setCreateError(null);

    try {
      const body: any = {
        name: newName.trim(),
        templateId: newTemplateId,
        defaultQuantity: qtyNum,
        isActive: newIsActive,
      };

      if (newVariantId) body.variantId = newVariantId;
      if (newMaterialId) body.materialId = newMaterialId;
      if (typeof priceOverrideNum === 'number') body.priceOverride = priceOverrideNum;
      if (typeof personalizationJson !== 'undefined') {
        body.personalizationJson = personalizationJson;
      }

      const res = await apiClient.post<TemplateProductListItem>('/template-products', body);
      setTemplateProducts((prev) => [res.data, ...prev]);

      setNewName('');
      setNewTemplateId('');
      setNewVariantId('');
      setNewMaterialId('');
      setNewQuantity('1');
      setNewPriceOverride('');
      setNewIsActive(true);
      setNewPersonalizationText('');
      setVariantsForTemplate([]);
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Failed to create template product';
      setCreateError(Array.isArray(message) ? message.join(', ') : String(message));
    } finally {
      setCreating(false);
    }
  }

  function startEdit(product: TemplateProductListItem) {
    setEditingId(product.id);
    setEditName(product.name);
    setEditMaterialId(product.materialId ?? '');
    setEditQuantity(String(product.defaultQuantity));
    setEditPriceOverride(
      typeof product.priceOverride === 'number' ? String(product.priceOverride) : '',
    );
    setEditIsActive(product.isActive);
    setEditError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditError(null);
  }

  async function handleSaveEdit(e: FormEvent) {
    e.preventDefault();
    if (!editingId) return;

    if (!editName.trim()) {
      setEditError('Name is required');
      return;
    }

    const qtyNum = Number(editQuantity);
    if (!qtyNum || Number.isNaN(qtyNum) || qtyNum <= 0) {
      setEditError('Default quantity must be at least 1');
      return;
    }

    let priceOverrideNum: number | null | undefined = null;
    if (editPriceOverride.trim()) {
      const parsed = Number(editPriceOverride.trim());
      if (Number.isNaN(parsed)) {
        setEditError('Price override must be a number');
        return;
      }
      priceOverrideNum = parsed;
    } else {
      priceOverrideNum = null;
    }

    setEditLoading(true);
    setEditError(null);

    try {
      const body: any = {
        name: editName.trim(),
        defaultQuantity: qtyNum,
        isActive: editIsActive,
      };

      if (editMaterialId) {
        body.materialId = editMaterialId;
      } else {
        body.materialId = null;
      }

      if (typeof priceOverrideNum !== 'undefined') {
        body.priceOverride = priceOverrideNum;
      }

      const res = await apiClient.patch<TemplateProductListItem>(
        `/template-products/${editingId}`,
        body,
      );

      setTemplateProducts((prev) => prev.map((p) => (p.id === editingId ? res.data : p)));
      setEditingId(null);
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Failed to update template product';
      setEditError(Array.isArray(message) ? message.join(', ') : String(message));
    } finally {
      setEditLoading(false);
    }
  }

  async function handleDeleteTemplateProduct(id: string) {
    const confirmed = window.confirm('Delete this template product?');
    if (!confirmed) return;

    try {
      await apiClient.delete(`/template-products/${id}`);
      setTemplateProducts((prev) => prev.filter((p) => p.id !== id));
      if (editingId === id) {
        cancelEdit();
      }
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Failed to delete template product';
      setError(Array.isArray(message) ? message.join(', ') : String(message));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Template Products</h1>
          <p className="mt-1 text-xs text-slate-400">
            Saved presets that combine a template, variant, material and defaults for quick order items.
          </p>
        </div>
        <form
          onSubmit={handleFilterSubmit}
          className="flex flex-wrap items-center gap-2 text-sm"
        >
          <input
            type="text"
            placeholder="Search by name..."
            className="w-40 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 md:w-60"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <label className="flex items-center gap-1 text-xs text-slate-300">
            <input
              type="checkbox"
              checked={onlyActive}
              onChange={(e) => setOnlyActive(e.target.checked)}
              className="h-3 w-3 rounded border-slate-600 bg-slate-900 text-sky-500 focus:ring-sky-500"
            />
            <span>Only active</span>
          </label>
          <button
            type="submit"
            className="rounded-md bg-sky-500 px-3 py-1 text-xs font-medium text-white hover:bg-sky-600"
          >
            Apply
          </button>
        </form>
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <form
          onSubmit={handleCreateTemplateProduct}
          className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-200"
        >
          <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
            Add template product
          </div>
          <label className="flex flex-col gap-1">
            <span>Name *</span>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              required
            />
          </label>
          <label className="flex flex-col gap-1">
            <span>Template *</span>
            <select
              value={newTemplateId}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              required
            >
              <option value="">Select template</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span>Variant</span>
            <select
              value={newVariantId}
              onChange={(e) => setNewVariantId(e.target.value)}
              disabled={variantsForTemplate.length === 0}
              className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none disabled:opacity-60 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            >
              <option value="">(default)</option>
              {variantsForTemplate.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span>Material</span>
            <select
              value={newMaterialId}
              onChange={(e) => setNewMaterialId(e.target.value)}
              className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            >
              <option value="">Use default from template/variant</option>
              {materials.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} {m.thicknessMm}mm {formatUnitType(m.unitType)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span>Default quantity *</span>
            <input
              type="number"
              min={1}
              value={newQuantity}
              onChange={(e) => setNewQuantity(e.target.value)}
              className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              required
            />
          </label>
          <label className="flex flex-col gap-1">
            <span>Price override</span>
            <input
              type="number"
              min={0}
              step="0.01"
              value={newPriceOverride}
              onChange={(e) => setNewPriceOverride(e.target.value)}
              className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              placeholder="Leave empty to use pricing engine"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span>Personalization defaults (JSON)</span>
            <textarea
              rows={3}
              value={newPersonalizationText}
              onChange={(e) => setNewPersonalizationText(e.target.value)}
              className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              placeholder='e.g. {"name":"John"}'
            />
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-300">
            <input
              type="checkbox"
              checked={newIsActive}
              onChange={(e) => setNewIsActive(e.target.checked)}
              className="h-3 w-3 rounded border-slate-600 bg-slate-900 text-sky-500 focus:ring-sky-500"
            />
            <span>Template product is active</span>
          </label>
          {createError && <p className="text-[11px] text-red-400">{createError}</p>}
          <button
            type="submit"
            disabled={creating}
            className="rounded-md bg-emerald-500 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {creating ? 'Creating…' : 'Create template product'}
          </button>
        </form>

        <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-200">
          <div className="mb-1 flex items-center justify-between gap-2">
            <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
              Template products list
            </div>
            <div className="text-[11px] text-slate-500">Total: {templateProducts.length}</div>
          </div>

          {loading && <p className="text-xs text-slate-400">Loading template products...</p>}
          {error && !loading && <p className="text-xs text-red-400">{error}</p>}

          {!loading && !error && templateProducts.length === 0 && (
            <p className="text-xs text-slate-400">No template products found.</p>
          )}

          {!loading && !error && templateProducts.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/60">
              <table className="min-w-full text-left text-xs text-slate-200">
                <thead className="border-b border-slate-800 bg-slate-900/80 text-[11px] uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Template</th>
                    <th className="px-3 py-2">Variant</th>
                    <th className="px-3 py-2">Material</th>
                    <th className="px-3 py-2">Qty</th>
                    <th className="px-3 py-2">Price</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Created</th>
                    <th className="px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {templateProducts.map((p) => (
                    <tr key={p.id} className="border-t border-slate-800 hover:bg-slate-800/60">
                      <td className="px-3 py-2 align-top text-xs font-medium text-slate-100">
                        <div>{p.name}</div>
                        {p.template && (
                          <div className="text-[11px] text-slate-500">
                            from template{' '}
                            <Link
                              href={`/templates/${p.template.id}`}
                              className="text-sky-400 hover:underline"
                            >
                              {p.template.name}
                            </Link>
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 align-top text-xs text-slate-300">
                        {p.template ? p.template.name : '-'}
                      </td>
                      <td className="px-3 py-2 align-top text-xs text-slate-300">
                        {p.variant ? p.variant.name : '-'}
                      </td>
                      <td className="px-3 py-2 align-top text-xs text-slate-300">
                        {p.material ? p.material.name : '-'}
                      </td>
                      <td className="px-3 py-2 align-top text-xs text-slate-300">
                        {p.defaultQuantity}
                      </td>
                      <td className="px-3 py-2 align-top text-xs text-slate-300">
                        {typeof p.priceOverride === 'number'
                          ? p.priceOverride.toFixed(2)
                          : 'Engine'}
                      </td>
                      <td className="px-3 py-2 align-top">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[11px] ${
                            p.isActive
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {p.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-3 py-2 align-top text-[11px] text-slate-400">
                        {new Date(p.createdAt).toLocaleString()}
                      </td>
                      <td className="px-3 py-2 align-top text-[11px] text-slate-300">
                        <button
                          type="button"
                          onClick={() => startEdit(p)}
                          className="mr-2 rounded-md border border-slate-700 px-2 py-0.5 text-[11px] text-slate-200 hover:bg-slate-800"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTemplateProduct(p.id)}
                          className="rounded-md border border-red-700 px-2 py-0.5 text-[11px] text-red-300 hover:bg-red-900/40"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {editingId && (
            <form
              onSubmit={handleSaveEdit}
              className="mt-3 space-y-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-200"
            >
              <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                Edit template product
              </div>
              <label className="flex flex-col gap-1">
                <span>Name *</span>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  required
                />
              </label>
              <label className="flex flex-col gap-1">
                <span>Material</span>
                <select
                  value={editMaterialId}
                  onChange={(e) => setEditMaterialId(e.target.value)}
                  className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                >
                  <option value="">Use default from template/variant</option>
                  {materials.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} {m.thicknessMm}mm {formatUnitType(m.unitType)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span>Default quantity *</span>
                <input
                  type="number"
                  min={1}
                  value={editQuantity}
                  onChange={(e) => setEditQuantity(e.target.value)}
                  className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  required
                />
              </label>
              <label className="flex flex-col gap-1">
                <span>Price override</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={editPriceOverride}
                  onChange={(e) => setEditPriceOverride(e.target.value)}
                  className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  placeholder="Leave empty to use pricing engine"
                />
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={editIsActive}
                  onChange={(e) => setEditIsActive(e.target.checked)}
                  className="h-3 w-3 rounded border-slate-600 bg-slate-900 text-sky-500 focus:ring-sky-500"
                />
                <span>Template product is active</span>
              </label>
              {editError && <p className="text-[11px] text-red-400">{editError}</p>}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="submit"
                  disabled={editLoading}
                  className="rounded-md bg-sky-500 px-3 py-1 text-[11px] font-medium text-white hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {editLoading ? 'Saving…' : 'Save changes'}
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="rounded-md border border-slate-700 px-3 py-1 text-[11px] text-slate-200 hover:bg-slate-800"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
