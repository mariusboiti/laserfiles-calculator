'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '../../../../lib/api-client';
import { useT } from '../../i18n';

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
  const t = useT();
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
      const message = err?.response?.data?.message || t('sales_channels_mappings.failed_to_load_metadata');
      setError(Array.isArray(message) ? message.join(', ') : String(message));
    }
  }

  async function loadSuggestions() {
    if (!selectedConnectionId) {
      setSuggestions([]);
      setSuggestionsError(t('sales_channels_mappings.suggestions.select_connection_first'));
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
      const message = err?.response?.data?.message || t('sales_channels_mappings.failed_to_load_suggestions');
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
      const message = err?.response?.data?.message || t('sales_channels_mappings.failed_to_load_mappings');
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
      setSuggestionsError(t('sales_channels_mappings.form.select_connection_first'));
      return;
    }
    const high = suggestions.filter((s) => s.score >= 80);
    if (high.length === 0) {
      setSuggestionsError(t('sales_channels_mappings.suggestions.no_high_confidence'));
      return;
    }
    const confirmed = window.confirm(
      t('sales_channels_mappings.suggestions.confirm_apply_high_confidence').replace('{0}', String(high.length)),
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
      const message = err?.response?.data?.message || t('sales_channels_mappings.failed_to_apply_suggestions');
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
      setFormError(t('sales_channels_mappings.form.select_connection_first'));
      return;
    }
    if (!formExternalProductId.trim() || !formExternalProductName.trim()) {
      setFormError(t('sales_channels_mappings.form.external_id_name_required'));
      return;
    }
    if (!formTemplateId) {
      setFormError(t('sales_channels_mappings.form.template_required'));
      return;
    }

    let personalizationMappingJson: any | undefined;
    if (formPersonalizationJsonText.trim()) {
      try {
        personalizationMappingJson = JSON.parse(formPersonalizationJsonText);
      } catch {
        setFormError(t('sales_channels_mappings.form.personalization_json_invalid'));
        return;
      }
    }

    let priceOverrideNum: number | null | undefined = undefined;
    if (formPriceOverride.trim()) {
      const parsed = Number(formPriceOverride.trim());
      if (Number.isNaN(parsed)) {
        setFormError(t('sales_channels_mappings.form.price_override_number'));
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
      const message = err?.response?.data?.message || t('sales_channels_mappings.failed_to_save_mapping');
      setFormError(Array.isArray(message) ? message.join(', ') : String(message));
    } finally {
      setFormSaving(false);
    }
  }

  async function handleDeleteMapping(id: string) {
    if (!window.confirm(t('sales_channels_mappings.confirm_delete'))) return;
    try {
      await apiClient.delete(`/sales-channels/mappings/${id}`);
      setMappings((prev) => prev.filter((m) => m.id !== id));
      if (editingId === id) {
        resetForm();
      }
    } catch (err: any) {
      const message = err?.response?.data?.message || t('sales_channels_mappings.failed_to_delete_mapping');
      setError(Array.isArray(message) ? message.join(', ') : String(message));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Link href="/sales-channels" className="text-sky-400 hover:underline">
              {t('sales_channels.title')}
            </Link>
            <span>/</span>
            <span>{t('sales_channels_mappings.title')}</span>
          </div>
          <h1 className="mt-1 text-xl font-semibold tracking-tight">{t('sales_channels_mappings.title')}</h1>
          <p className="text-xs text-slate-400">
            {t('sales_channels_mappings.subtitle')}
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
            <option value="">{t('sales_channels_mappings.form.select_connection')}</option>
            {connections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({t(`sales_channels.channel.${c.channel.toLowerCase()}` as any)})
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder={t('sales_channels_mappings.form.search_placeholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-40 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 md:w-64"
          />
          <button
            type="submit"
            className="rounded-md bg-sky-500 px-3 py-1 text-xs font-medium text-white hover:bg-sky-600"
          >
            {t('common.filter')}
          </button>
          <button
            type="button"
            onClick={loadSuggestions}
            className="rounded-md border border-slate-600 px-3 py-1 text-xs font-medium text-slate-200 hover:bg-slate-800"
          >
            {t('sales_channels_mappings.suggestions.load')}
          </button>
        </form>
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-200">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
              {t('sales_channels_mappings.existing_title')}
            </div>
            {t('common.loading')}
          </div>
          {error && <p className="text-[11px] text-red-400">{error}</p>}
          {!loading && !error && (!selectedConnectionId || mappings.length === 0) && (
            <p className="text-[11px] text-slate-400">
              {selectedConnectionId
                ? t('sales_channels_mappings.no_mappings_for_connection')
                : t('sales_channels_mappings.select_connection_to_see')}
            </p>
          )}
          {!loading && !error && mappings.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/60">
              <table className="min-w-full text-left text-xs text-slate-200">
                <thead className="border-b border-slate-800 bg-slate-900/80 text-[11px] uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-3 py-2">{t('sales_channels_mappings.table.external_product')}</th>
                    <th className="px-3 py-2">{t('sales_channels_mappings.table.template_preset')}</th>
                    <th className="px-3 py-2">{t('sales_channels_mappings.table.pricing')}</th>
                    <th className="px-3 py-2">{t('sales_channels_mappings.table.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {mappings.map((m) => (
                    <tr key={m.id} className="border-t border-slate-800">
                      <td className="px-3 py-2 align-top text-xs text-slate-200">
                        <div className="font-medium">{m.externalProductName}</div>
                        <div className="text-[11px] text-slate-500">{t('sales_channels_mappings.id')}: {m.externalProductId}</div>
                      </td>
                      <td className="px-3 py-2 align-top text-xs text-slate-300">
                        <div>
                          {m.material && (
                            <span>
                              {t('sales_channels_mappings.material')}: {m.material.name}
                            </span>
                          )}
                          {m.template ? m.template.name : t('sales_channels_mappings.template_missing')}
                          {m.variant && <span> – {m.variant.name}</span>}
                        </div>
                        {m.templateProduct && (
                          <div className="text-[11px] text-slate-400">
                            {t('sales_channels_mappings.preset')}: {m.templateProduct.name}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 align-top text-[11px] text-slate-300">
                        <div>
                          {t('sales_channels_mappings.mode')}:{' '}
                          {m.pricingMode === 'USE_TEMPLATE_RULES'
                            ? t('sales_channels_mappings.form.pricing_mode_use_template')
                            : m.pricingMode === 'EXTERNAL_PRICE_IGNORE'
                            ? t('sales_channels_mappings.form.pricing_mode_ignore_external')
                            : t('sales_channels_mappings.form.pricing_mode_override')}
                        </div>
                        {typeof m.priceOverride === 'number' && (
                          <div>{t('sales_channels_mappings.override')}: {m.priceOverride.toFixed(2)}</div>
                        )}
                      </td>
                      <td className="px-3 py-2 align-top text-[11px] text-slate-300">
                        <button
                          type="button"
                          onClick={() => startEdit(m)}
                          className="mr-2 rounded-md border border-slate-700 px-2 py-0.5 text-[11px] hover:bg-slate-800"
                        >
                          {t('common.edit')}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteMapping(m.id)}
                          className="rounded-md border border-red-700 px-2 py-0.5 text-[11px] text-red-300 hover:bg-red-900/40"
                        >
                          {t('common.delete')}
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
                {t('sales_channels_mappings.suggestions.title')}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={loadSuggestions}
                  className="rounded-md border border-slate-700 px-2 py-0.5 text-[11px] hover:bg-slate-800"
                >
                  {t('common.refresh')}
                </button>
                <button
                  type="button"
                  onClick={handleApplyHighConfidence}
                  disabled={applySuggestionsLoading || suggestions.length === 0}
                  className="rounded-md border border-emerald-600 px-2 py-0.5 text-[11px] text-emerald-300 hover:bg-emerald-900/40 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {applySuggestionsLoading ? t('sales_channels_mappings.suggestions.applying') : t('sales_channels_mappings.suggestions.apply_high_confidence')}
                </button>
              </div>
            </div>
            {suggestionsLoading && (
              <p className="text-[11px] text-slate-400">{t('sales_channels_mappings.suggestions.computing')}</p>
            )}
            {suggestionsError && (
              <p className="text-[11px] text-red-400">{suggestionsError}</p>
            )}
            {!suggestionsLoading && suggestions.length === 0 && !suggestionsError && (
              <p className="text-[11px] text-slate-400">
                {t('sales_channels_mappings.suggestions.no_suggestions_yet')}
              </p>
            )}
            {!suggestionsLoading && suggestions.length > 0 && (
              <div className="overflow-x-auto rounded-md border border-slate-800 bg-slate-900/60">
                <table className="min-w-full text-left text-xs text-slate-200">
                  <thead className="border-b border-slate-800 bg-slate-900/80 text-[11px] uppercase tracking-wide text-slate-400">
                    <tr>
                      <th className="px-3 py-2">{t('sales_channels_mappings.suggestions.table.external_product')}</th>
                      <th className="px-3 py-2">{t('sales_channels_mappings.suggestions.table.suggested_mapping')}</th>
                      <th className="px-3 py-2">{t('sales_channels_mappings.suggestions.table.score')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {suggestions.map((s) => (
                      <tr key={`${s.externalProductId}-${s.suggestedTemplateId}-${s.suggestedTemplateProductId || 'none'}`} className="border-t border-slate-800">
                        <td className="px-3 py-2 align-top text-xs text-slate-200">
                          <div className="font-medium">{s.externalProductName}</div>
                          <div className="text-[11px] text-slate-500">{t('sales_channels_mappings.id')}: {s.externalProductId}</div>
                        </td>
                        <td className="px-3 py-2 align-top text-xs text-slate-300">
                          <div>{s.suggestedTemplateName}</div>
                          {s.suggestedTemplateProductName && (
                            <div className="text-[11px] text-slate-400">
                              {t('sales_channels_mappings.preset')}: {s.suggestedTemplateProductName}
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
                            {s.confidence === 'HIGH' ? t('sales_channels_mappings.suggestions.confidence.high') : s.confidence === 'MEDIUM' ? t('sales_channels_mappings.suggestions.confidence.medium') : t('sales_channels_mappings.suggestions.confidence.low')} ({s.score})
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
              {t('sales_channels_mappings.form.edit_title')}
          </div>
          <label className="flex flex-col gap-1">
            <span>{t('sales_channels_mappings.form.connection')}</span>
            <select
              value={selectedConnectionId}
              onChange={(e) => setSelectedConnectionId(e.target.value)}
              className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            >
              <option value="">{t('sales_channels_mappings.form.select_connection')}</option>
              {connections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({t(`sales_channels.channel.${c.channel.toLowerCase()}` as any)})
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span>{t('sales_channels_mappings.form.external_product_id')}</span>
            <input
              type="text"
              value={formExternalProductId}
              onChange={(e) => setFormExternalProductId(e.target.value)}
              className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span>{t('sales_channels_mappings.form.external_product_name')}</span>
            <input
              type="text"
              value={formExternalProductName}
              onChange={(e) => setFormExternalProductName(e.target.value)}
              className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span>{t('sales_channels_mappings.form.template')}</span>
            <select
              value={formTemplateId}
              onChange={(e) => setFormTemplateId(e.target.value)}
              className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            >
              <option value="">{t('sales_channels_mappings.form.select_template')}</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span>{t('sales_channels_mappings.form.template_product_optional')}</span>
            <select
              value={formTemplateProductId}
              onChange={(e) => setFormTemplateProductId(e.target.value)}
              className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            >
              <option value="">{t('common.none')}</option>
              {templateProducts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span>{t('sales_channels_mappings.form.material_override_optional')}</span>
            <select
              value={formMaterialId}
              onChange={(e) => setFormMaterialId(e.target.value)}
              className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            >
              <option value="">{t('sales_channels_mappings.form.use_template_default')}</option>
              {materials.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span>{t('sales_channels_mappings.form.pricing_mode')}</span>
            <select
              value={formPricingMode}
              onChange={(e) =>
                setFormPricingMode(
                  e.target.value as 'USE_TEMPLATE_RULES' | 'EXTERNAL_PRICE_IGNORE' | 'PRICE_OVERRIDE',
                )
              }
              className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            >
              <option value="USE_TEMPLATE_RULES">{t('sales_channels_mappings.form.pricing_mode_use_template')}</option>
              <option value="EXTERNAL_PRICE_IGNORE">{t('sales_channels_mappings.form.pricing_mode_ignore_external')}</option>
              <option value="PRICE_OVERRIDE">{t('sales_channels_mappings.form.pricing_mode_override')}</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span>{t('sales_channels_mappings.form.price_override')} ({t('sales_channels_mappings.for_price_override')})</span>
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
            <span>{t('sales_channels_mappings.form.personalization_mapping')}</span>
            <textarea
              rows={4}
              value={formPersonalizationJsonText}
              onChange={(e) => setFormPersonalizationJsonText(e.target.value)}
              className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              placeholder={t('sales_channels_mappings.form.personalization_placeholder')}
            />
          </label>
          {formError && <p className="text-[11px] text-red-400">{formError}</p>}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="submit"
              disabled={formSaving}
              className="rounded-md bg-emerald-500 px-3 py-1 text-[11px] font-medium text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {formSaving ? t('common.saving') : editingId ? t('sales_channels_mappings.form.update') : t('sales_channels_mappings.form.create')}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-md border border-slate-700 px-3 py-1 text-[11px] text-slate-200 hover:bg-slate-800"
              >
                {t('common.cancel')}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
