'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '../../../../lib/api-client';

interface StoreConnection {
  id: string;
  name: string;
  channel: 'WOOCOMMERCE' | 'ETSY' | 'CSV';
}

interface ExternalProductMapping {
  id: string;
  connectionId: string;
  externalProductId: string;
  externalProductName: string;
  templateId: string;
  variantId?: string | null;
  materialId?: string | null;
  templateProductId?: string | null;
  personalizationMappingJson?: any;
  pricingMode: 'USE_TEMPLATE_RULES' | 'EXTERNAL_PRICE_IGNORE' | 'PRICE_OVERRIDE';
  priceOverride?: number | null;
  isActive: boolean;
  template?: { id: string; name: string } | null;
  variant?: { id: string; name: string } | null;
  material?: { id: string; name: string } | null;
  templateProduct?: { id: string; name: string } | null;
}

interface ExternalProductMappingsListResponse {
  data: ExternalProductMapping[];
  total: number;
}

interface TemplateSummary {
  id: string;
  name: string;
}

interface TemplatesListResponse {
  data: TemplateSummary[];
  total: number;
}

interface TemplateProductSummary {
  id: string;
  name: string;
}

interface TemplateProductsListResponse {
  data: TemplateProductSummary[];
  total: number;
}

interface MaterialOption {
  id: string;
  name: string;
}

interface MaterialsListResponse {
  data: MaterialOption[];
  total: number;
  page: number;
  pageSize: number;
}

interface MappingSuggestion {
  externalProductId: string;
  externalProductName: string;
  suggestedTemplateId: string;
  suggestedTemplateName: string;
  suggestedTemplateProductId?: string | null;
  suggestedTemplateProductName?: string | null;
  score: number;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

interface MappingSuggestionsResponse {
  data: MappingSuggestion[];
  total: number;
}

interface ApplySuggestionsResponse {
  created: number;
  skipped: number;
  applied: ExternalProductMapping[];
}

export default function SalesChannelsMappingsPage() {
  const [connections, setConnections] = useState<StoreConnection[]>([]);
  const [mappings, setMappings] = useState<ExternalProductMapping[]>([]);
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [templateProducts, setTemplateProducts] = useState<TemplateProductSummary[]>([]);
  const [materials, setMaterials] = useState<MaterialOption[]>([]);

  const [selectedConnectionId, setSelectedConnectionId] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [formExternalProductId, setFormExternalProductId] = useState('');
  const [formExternalProductName, setFormExternalProductName] = useState('');
  const [formTemplateId, setFormTemplateId] = useState('');
  const [formVariantId, setFormVariantId] = useState('');
  const [formMaterialId, setFormMaterialId] = useState('');
  const [formTemplateProductId, setFormTemplateProductId] = useState('');
  const [formPricingMode, setFormPricingMode] = useState<
    'USE_TEMPLATE_RULES' | 'EXTERNAL_PRICE_IGNORE' | 'PRICE_OVERRIDE'
  >('USE_TEMPLATE_RULES');
  const [formPriceOverride, setFormPriceOverride] = useState('');
  const [formPersonalizationJsonText, setFormPersonalizationJsonText] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSaving, setFormSaving] = useState(false);

  const [suggestions, setSuggestions] = useState<MappingSuggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);
  const [applySuggestionsLoading, setApplySuggestionsLoading] = useState(false);

  async function loadMeta() {
    try {
      const [connectionsRes, templatesRes, templateProductsRes, materialsRes] =
        await Promise.all([
          apiClient.get<StoreConnection[]>('/sales-channels/connections'),
          apiClient.get<TemplatesListResponse>('/templates', {
            params: { isActive: true },
          }),
          apiClient.get<TemplateProductsListResponse>('/template-products', {
            params: { isActive: true },
          }),
          apiClient.get<MaterialsListResponse>('/materials'),
        ]);

      setConnections(connectionsRes.data);
      setTemplates(templatesRes.data.data);
      setTemplateProducts(templateProductsRes.data.data);
      setMaterials(materialsRes.data.data);

      if (!selectedConnectionId && connectionsRes.data.length > 0) {
        setSelectedConnectionId(connectionsRes.data[0].id);
      }
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Failed to load metadata';
      setError(Array.isArray(message) ? message.join(', ') : String(message));
    }
  }

  async function loadSuggestions() {
    if (!selectedConnectionId) {
      setSuggestions([]);
      setSuggestionsError('Select a connection first to compute suggestions.');
      return;
    }
    setSuggestionsLoading(true);
    setSuggestionsError(null);
    try {
      const res = await apiClient.get<MappingSuggestionsResponse>(
        '/sales-channels/mappings/suggestions',
        {
          params: { connectionId: selectedConnectionId },
        },
      );
      setSuggestions(res.data.data);
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Failed to load suggestions';
      setSuggestionsError(Array.isArray(message) ? message.join(', ') : String(message));
    } finally {
      setSuggestionsLoading(false);
    }
  }

  async function loadMappings() {
    if (!selectedConnectionId) {
      setMappings([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<ExternalProductMappingsListResponse>(
        '/sales-channels/mappings',
        {
          params: {
            connectionId: selectedConnectionId,
            search: search || undefined,
          },
        },
      );
      setMappings(res.data.data);
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Failed to load product mappings';
      setError(Array.isArray(message) ? message.join(', ') : String(message));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMeta();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedConnectionId) return;
    loadMappings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConnectionId]);

  async function handleFilterSubmit(e: FormEvent) {
    e.preventDefault();
    loadMappings();
  }

  function resetForm() {
    setEditingId(null);
    setFormExternalProductId('');
    setFormExternalProductName('');
    setFormTemplateId('');
    setFormVariantId('');
    setFormMaterialId('');
    setFormTemplateProductId('');
    setFormPricingMode('USE_TEMPLATE_RULES');
    setFormPriceOverride('');
    setFormPersonalizationJsonText('');
    setFormError(null);
  }

  async function handleApplyHighConfidence() {
    if (!selectedConnectionId) {
      setSuggestionsError('Select a connection first.');
      return;
    }
    const high = suggestions.filter((s) => s.score >= 80);
    if (high.length === 0) {
      setSuggestionsError('No high-confidence suggestions available to apply.');
      return;
    }
    const confirmed = window.confirm(
      `Apply ${high.length} high-confidence suggestions and create mappings?`,
    );
    if (!confirmed) return;

    setApplySuggestionsLoading(true);
    setSuggestionsError(null);
    try {
      const res = await apiClient.post<ApplySuggestionsResponse>(
        '/sales-channels/mappings/suggestions/apply-high-confidence',
        {
          connectionId: selectedConnectionId,
          minScore: 80,
        },
      );

      if (res.data.applied && res.data.applied.length > 0) {
        setMappings((prev) => [...res.data.applied, ...prev]);
        const appliedIds = new Set(res.data.applied.map((m) => m.externalProductId));
        setSuggestions((prev) => prev.filter((s) => !appliedIds.has(s.externalProductId)));
      }
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Failed to apply suggestions';
      setSuggestionsError(Array.isArray(message) ? message.join(', ') : String(message));
    } finally {
      setApplySuggestionsLoading(false);
    }
  }

  function startEdit(mapping: ExternalProductMapping) {
    setEditingId(mapping.id);
    setSelectedConnectionId(mapping.connectionId);
    setFormExternalProductId(mapping.externalProductId);
    setFormExternalProductName(mapping.externalProductName);
    setFormTemplateId(mapping.templateId);
    setFormVariantId(mapping.variantId ?? '');
    setFormMaterialId(mapping.materialId ?? '');
    setFormTemplateProductId(mapping.templateProductId ?? '');
    setFormPricingMode(mapping.pricingMode);
    setFormPriceOverride(
      typeof mapping.priceOverride === 'number' ? String(mapping.priceOverride) : '',
    );
    setFormPersonalizationJsonText(
      mapping.personalizationMappingJson
        ? JSON.stringify(mapping.personalizationMappingJson, null, 2)
        : '',
    );
    setFormError(null);
  }

  async function handleSaveMapping(e: FormEvent) {
    e.preventDefault();
    if (!selectedConnectionId) {
      setFormError('Select a connection first.');
      return;
    }
    if (!formExternalProductId.trim() || !formExternalProductName.trim()) {
      setFormError('External product ID and name are required.');
      return;
    }
    if (!formTemplateId) {
      setFormError('Template is required.');
      return;
    }

    let personalizationMappingJson: any | undefined;
    if (formPersonalizationJsonText.trim()) {
      try {
        personalizationMappingJson = JSON.parse(formPersonalizationJsonText);
      } catch {
        setFormError('Personalization mapping must be valid JSON.');
        return;
      }
    }

    let priceOverrideNum: number | null | undefined = undefined;
    if (formPriceOverride.trim()) {
      const parsed = Number(formPriceOverride.trim());
      if (Number.isNaN(parsed)) {
        setFormError('Price override must be a number.');
        return;
      }
      priceOverrideNum = parsed;
    } else if (formPricingMode === 'PRICE_OVERRIDE') {
      priceOverrideNum = null;
    }

    setFormSaving(true);
    setFormError(null);

    try {
      const body: any = {
        connectionId: selectedConnectionId,
        externalProductId: formExternalProductId.trim(),
        externalProductName: formExternalProductName.trim(),
        templateId: formTemplateId,
        variantId: formVariantId || undefined,
        materialId: formMaterialId || undefined,
        templateProductId: formTemplateProductId || undefined,
        pricingMode: formPricingMode,
      };

      if (typeof personalizationMappingJson !== 'undefined') {
        body.personalizationMappingJson = personalizationMappingJson;
      }
      if (typeof priceOverrideNum !== 'undefined') {
        body.priceOverride = priceOverrideNum;
      }

      if (editingId) {
        const res = await apiClient.patch<ExternalProductMapping>(
          `/sales-channels/mappings/${editingId}`,
          body,
        );
        setMappings((prev) => prev.map((m) => (m.id === editingId ? res.data : m)));
      } else {
        const res = await apiClient.post<ExternalProductMapping>(
          '/sales-channels/mappings',
          body,
        );
        setMappings((prev) => [res.data, ...prev]);
      }

      resetForm();
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Failed to save product mapping';
      setFormError(Array.isArray(message) ? message.join(', ') : String(message));
    } finally {
      setFormSaving(false);
    }
  }

  async function handleDeleteMapping(id: string) {
    if (!window.confirm('Delete this mapping?')) return;
    try {
      await apiClient.delete(`/sales-channels/mappings/${id}`);
      setMappings((prev) => prev.filter((m) => m.id !== id));
      if (editingId === id) {
        resetForm();
      }
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Failed to delete mapping';
      setError(Array.isArray(message) ? message.join(', ') : String(message));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Link href="/sales-channels" className="text-sky-400 hover:underline">
              Sales Channels
            </Link>
            <span>/</span>
            <span>Product mappings</span>
          </div>
          <h1 className="mt-1 text-xl font-semibold tracking-tight">Product mappings</h1>
          <p className="text-xs text-slate-400">
            Tell the system which store products or listings correspond to your internal templates
            or template products.
          </p>
        </div>
        <form
          onSubmit={handleFilterSubmit}
          className="flex flex-wrap items-center gap-2 text-xs text-slate-200"
        >
          <select
            value={selectedConnectionId}
            onChange={(e) => setSelectedConnectionId(e.target.value)}
            className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
          >
            <option value="">Select connection</option>
            {connections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.channel})
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Search external product name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-40 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 md:w-64"
          />
          <button
            type="submit"
            className="rounded-md bg-sky-500 px-3 py-1 text-xs font-medium text-white hover:bg-sky-600"
          >
            Apply
          </button>
          <button
            type="button"
            onClick={loadSuggestions}
            className="rounded-md border border-slate-600 px-3 py-1 text-xs font-medium text-slate-200 hover:bg-slate-800"
          >
            Suggest mappings
          </button>
        </form>
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-200">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
              Existing mappings
            </div>
            {loading && <div className="text-[11px] text-slate-400">Loading…</div>}
          </div>
          {error && <p className="text-[11px] text-red-400">{error}</p>}
          {!loading && !error && (!selectedConnectionId || mappings.length === 0) && (
            <p className="text-[11px] text-slate-400">
              {selectedConnectionId
                ? 'No mappings yet for this connection.'
                : 'Select a connection to see its mappings.'}
            </p>
          )}
          {!loading && !error && mappings.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/60">
              <table className="min-w-full text-left text-xs text-slate-200">
                <thead className="border-b border-slate-800 bg-slate-900/80 text-[11px] uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-3 py-2">External product</th>
                    <th className="px-3 py-2">Template / Preset</th>
                    <th className="px-3 py-2">Pricing</th>
                    <th className="px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {mappings.map((m) => (
                    <tr key={m.id} className="border-t border-slate-800">
                      <td className="px-3 py-2 align-top text-xs text-slate-200">
                        <div className="font-medium">{m.externalProductName}</div>
                        <div className="text-[11px] text-slate-500">ID: {m.externalProductId}</div>
                      </td>
                      <td className="px-3 py-2 align-top text-xs text-slate-300">
                        <div>
                          {m.template ? m.template.name : '(template missing)'}
                          {m.variant && <span> – {m.variant.name}</span>}
                        </div>
                        {m.templateProduct && (
                          <div className="text-[11px] text-slate-400">
                            Preset: {m.templateProduct.name}
                          </div>
                        )}
                        {m.material && (
                          <div className="text-[11px] text-slate-400">Material: {m.material.name}</div>
                        )}
                      </td>
                      <td className="px-3 py-2 align-top text-[11px] text-slate-300">
                        <div>Mode: {m.pricingMode}</div>
                        {typeof m.priceOverride === 'number' && (
                          <div>Override: {m.priceOverride.toFixed(2)}</div>
                        )}
                      </td>
                      <td className="px-3 py-2 align-top text-[11px] text-slate-300">
                        <button
                          type="button"
                          onClick={() => startEdit(m)}
                          className="mr-2 rounded-md border border-slate-700 px-2 py-0.5 text-[11px] hover:bg-slate-800"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteMapping(m.id)}
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
          <div className="mt-3 rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-xs text-slate-200">
            <div className="mb-1 flex items-center justify-between gap-2">
              <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                Suggestions
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={loadSuggestions}
                  className="rounded-md border border-slate-700 px-2 py-0.5 text-[11px] hover:bg-slate-800"
                >
                  Refresh
                </button>
                <button
                  type="button"
                  onClick={handleApplyHighConfidence}
                  disabled={applySuggestionsLoading || suggestions.length === 0}
                  className="rounded-md border border-emerald-600 px-2 py-0.5 text-[11px] text-emerald-300 hover:bg-emerald-900/40 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {applySuggestionsLoading ? 'Applying…' : 'Apply high confidence'}
                </button>
              </div>
            </div>
            {suggestionsLoading && (
              <p className="text-[11px] text-slate-400">Computing suggestions…</p>
            )}
            {suggestionsError && (
              <p className="text-[11px] text-red-400">{suggestionsError}</p>
            )}
            {!suggestionsLoading && suggestions.length === 0 && !suggestionsError && (
              <p className="text-[11px] text-slate-400">
                No suggestions yet. Import some orders for this connection and run "Suggest
                mappings".
              </p>
            )}
            {!suggestionsLoading && suggestions.length > 0 && (
              <div className="overflow-x-auto rounded-md border border-slate-800 bg-slate-900/60">
                <table className="min-w-full text-left text-xs text-slate-200">
                  <thead className="border-b border-slate-800 bg-slate-900/80 text-[11px] uppercase tracking-wide text-slate-400">
                    <tr>
                      <th className="px-3 py-2">External product</th>
                      <th className="px-3 py-2">Suggested mapping</th>
                      <th className="px-3 py-2">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {suggestions.map((s) => (
                      <tr key={`${s.externalProductId}-${s.suggestedTemplateId}-${s.suggestedTemplateProductId || 'none'}`} className="border-t border-slate-800">
                        <td className="px-3 py-2 align-top text-xs text-slate-200">
                          <div className="font-medium">{s.externalProductName}</div>
                          <div className="text-[11px] text-slate-500">ID: {s.externalProductId}</div>
                        </td>
                        <td className="px-3 py-2 align-top text-xs text-slate-300">
                          <div>{s.suggestedTemplateName}</div>
                          {s.suggestedTemplateProductName && (
                            <div className="text-[11px] text-slate-400">
                              Preset: {s.suggestedTemplateProductName}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2 align-top text-[11px] text-slate-300">
                          <span
                            className={
                              s.confidence === 'HIGH'
                                ? 'text-emerald-300'
                                : s.confidence === 'MEDIUM'
                                ? 'text-amber-300'
                                : 'text-slate-300'
                            }
                          >
                            {s.confidence} ({s.score})
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <form
          onSubmit={handleSaveMapping}
          className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-200"
        >
          <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
            {editingId ? 'Edit mapping' : 'Create mapping'}
          </div>
          <label className="flex flex-col gap-1">
            <span>Connection</span>
            <select
              value={selectedConnectionId}
              onChange={(e) => setSelectedConnectionId(e.target.value)}
              className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            >
              <option value="">Select connection</option>
              {connections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.channel})
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span>External product ID</span>
            <input
              type="text"
              value={formExternalProductId}
              onChange={(e) => setFormExternalProductId(e.target.value)}
              className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span>External product name</span>
            <input
              type="text"
              value={formExternalProductName}
              onChange={(e) => setFormExternalProductName(e.target.value)}
              className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span>Template</span>
            <select
              value={formTemplateId}
              onChange={(e) => setFormTemplateId(e.target.value)}
              className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
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
            <span>Template product preset (optional)</span>
            <select
              value={formTemplateProductId}
              onChange={(e) => setFormTemplateProductId(e.target.value)}
              className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            >
              <option value="">(none)</option>
              {templateProducts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span>Material override (optional)</span>
            <select
              value={formMaterialId}
              onChange={(e) => setFormMaterialId(e.target.value)}
              className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            >
              <option value="">Use template / variant default</option>
              {materials.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span>Pricing mode</span>
            <select
              value={formPricingMode}
              onChange={(e) =>
                setFormPricingMode(
                  e.target.value as 'USE_TEMPLATE_RULES' | 'EXTERNAL_PRICE_IGNORE' | 'PRICE_OVERRIDE',
                )
              }
              className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            >
              <option value="USE_TEMPLATE_RULES">Use template rules</option>
              <option value="EXTERNAL_PRICE_IGNORE">Ignore external price</option>
              <option value="PRICE_OVERRIDE">Use external / override price</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span>Price override (for PRICE_OVERRIDE)</span>
            <input
              type="number"
              min={0}
              step="0.01"
              value={formPriceOverride}
              onChange={(e) => setFormPriceOverride(e.target.value)}
              className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span>Personalization mapping (JSON)</span>
            <textarea
              rows={4}
              value={formPersonalizationJsonText}
              onChange={(e) => setFormPersonalizationJsonText(e.target.value)}
              className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              placeholder='e.g. {"fields": {"name_text": "Name", "size": "Size"}}'
            />
          </label>
          {formError && <p className="text-[11px] text-red-400">{formError}</p>}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="submit"
              disabled={formSaving}
              className="rounded-md bg-emerald-500 px-3 py-1 text-[11px] font-medium text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {formSaving ? 'Saving…' : editingId ? 'Save changes' : 'Create mapping'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-md border border-slate-700 px-3 py-1 text-[11px] text-slate-200 hover:bg-slate-800"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
