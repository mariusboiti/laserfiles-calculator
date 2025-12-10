'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '../../../../lib/api-client';

type TemplateFieldType = 'TEXT' | 'NUMBER' | 'CHOICE';
type TemplateRuleType =
  | 'FIXED_BASE'
  | 'PER_CHARACTER'
  | 'PER_CM2'
  | 'PER_ITEM'
  | 'LAYER_MULTIPLIER'
  | 'ADD_ON_LINK';

interface TemplateCategory {
  id: string;
  name: string;
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

interface TemplateVariant {
  id: string;
  name: string;
  defaultMaterialId: string | null;
  widthMm: number | null;
  heightMm: number | null;
  isActive: boolean;
}

interface TemplateField {
  id: string;
  key: string;
  label: string;
  fieldType: TemplateFieldType;
  required: boolean;
  affectsPricing: boolean;
  affectsProductionNotes: boolean;
}

interface TemplatePricingRule {
  id: string;
  ruleType: TemplateRuleType;
  value: number;
  variantId: string | null;
  priority: number;
}

interface TemplateDetail {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  categoryId: string | null;
  category?: TemplateCategory | null;
  defaultMaterialId: string | null;
  defaultMaterial?: MaterialOption | null;
  baseWidthMm: number | null;
  baseHeightMm: number | null;
  layersCount: number | null;
  createdAt: string;
  updatedAt: string;
}

export default function TemplateDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [template, setTemplate] = useState<TemplateDetail | null>(null);
  const [variants, setVariants] = useState<TemplateVariant[]>([]);
  const [fields, setFields] = useState<TemplateField[]>([]);
  const [pricingRules, setPricingRules] = useState<TemplatePricingRule[]>([]);

  const [categories, setCategories] = useState<TemplateCategory[]>([]);
  const [materials, setMaterials] = useState<MaterialOption[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'details' | 'variants' | 'fields' | 'pricing'>('details');

  const [savingDetails, setSavingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  const [newVariantName, setNewVariantName] = useState('');
  const [newVariantMaterialId, setNewVariantMaterialId] = useState('');
  const [variantsError, setVariantsError] = useState<string | null>(null);
  const [savingVariant, setSavingVariant] = useState(false);

  const [newFieldKey, setNewFieldKey] = useState('');
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldType, setNewFieldType] = useState<TemplateFieldType>('TEXT');
  const [newFieldRequired, setNewFieldRequired] = useState(false);
  const [fieldsError, setFieldsError] = useState<string | null>(null);
  const [savingField, setSavingField] = useState(false);

  const [newRuleType, setNewRuleType] = useState<TemplateRuleType>('FIXED_BASE');
  const [newRuleValue, setNewRuleValue] = useState('');
  const [newRuleVariantId, setNewRuleVariantId] = useState('');
  const [rulesError, setRulesError] = useState<string | null>(null);
  const [savingRule, setSavingRule] = useState(false);

  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [fieldEditLabel, setFieldEditLabel] = useState('');
  const [fieldEditRequired, setFieldEditRequired] = useState(false);
  const [fieldEditAffectsPricing, setFieldEditAffectsPricing] = useState(false);
  const [fieldEditAffectsProductionNotes, setFieldEditAffectsProductionNotes] = useState(false);
  const [fieldEditError, setFieldEditError] = useState<string | null>(null);
  const [fieldEditSaving, setFieldEditSaving] = useState(false);

  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [ruleEditType, setRuleEditType] = useState<TemplateRuleType>('FIXED_BASE');
  const [ruleEditValue, setRuleEditValue] = useState('');
  const [ruleEditVariantId, setRuleEditVariantId] = useState('');
  const [ruleEditPriority, setRuleEditPriority] = useState('');
  const [ruleEditError, setRuleEditError] = useState<string | null>(null);
  const [ruleEditSaving, setRuleEditSaving] = useState(false);

  useEffect(() => {
    if (!id) return;

    async function loadAll() {
      setLoading(true);
      setError(null);
      try {
        const [templateRes, variantsRes, fieldsRes, rulesRes, categoriesRes, materialsRes] =
          await Promise.all([
            apiClient.get<TemplateDetail>(`/templates/${id}`),
            apiClient.get<TemplateVariant[]>(`/templates/${id}/variants`),
            apiClient.get<TemplateField[]>(`/templates/${id}/fields`),
            apiClient.get<TemplatePricingRule[]>(`/templates/${id}/pricing-rules`),
            apiClient.get<TemplateCategory[]>('/template-categories'),
            apiClient.get<MaterialsListResponse>('/materials'),
          ]);

        setTemplate(templateRes.data);
        setVariants(variantsRes.data);
        setFields(fieldsRes.data);
        setPricingRules(rulesRes.data);
        setCategories(categoriesRes.data);
        setMaterials(materialsRes.data.data);
      } catch (err: any) {
        const data = err?.response?.data;
        if (data?.code === 'FEATURE_LOCKED') {
          setError(
            'Templates are not available on your current plan. Upgrade your membership to view and edit templates.',
          );
        } else {
          const message = data?.message || 'Failed to load template';
          setError(Array.isArray(message) ? message.join(', ') : String(message));
        }
      } finally {
        setLoading(false);
      }
    }

    loadAll();
  }, [id]);

  async function handleSaveDetails(e: FormEvent) {
    e.preventDefault();
    if (!id || !template) return;

    setSavingDetails(true);
    setDetailsError(null);
    try {
      const body: any = {
        name: template.name.trim(),
        slug: template.slug.trim(),
        description: template.description ?? null,
        isActive: template.isActive,
        categoryId: template.categoryId ?? undefined,
        defaultMaterialId: template.defaultMaterialId ?? undefined,
        baseWidthMm: template.baseWidthMm ?? null,
        baseHeightMm: template.baseHeightMm ?? null,
        layersCount: template.layersCount ?? null,
      };

      const res = await apiClient.patch<TemplateDetail>(`/templates/${id}`, body);
      setTemplate(res.data);
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Failed to update template';
      setDetailsError(Array.isArray(message) ? message.join(', ') : String(message));
    } finally {
      setSavingDetails(false);
    }
  }

  async function handleCreateVariant(e: FormEvent) {
    e.preventDefault();
    if (!id) return;
    if (!newVariantName.trim()) {
      setVariantsError('Variant name is required');
      return;
    }

    setSavingVariant(true);
    setVariantsError(null);
    try {
      const body: any = {
        name: newVariantName.trim(),
      };
      if (newVariantMaterialId) {
        body.defaultMaterialId = newVariantMaterialId;
      }
      const res = await apiClient.post<TemplateVariant>(`/templates/${id}/variants`, body);
      setVariants((prev) => [...prev, res.data]);
      setNewVariantName('');
      setNewVariantMaterialId('');
    } catch (err: any) {
      const data = err?.response?.data;
      if (data?.code === 'FEATURE_LOCKED') {
        setVariantsError(
          'You cannot modify templates on your current plan. Upgrade your membership to add variants.',
        );
      } else {
        const message = data?.message || 'Failed to create variant';
        setVariantsError(Array.isArray(message) ? message.join(', ') : String(message));
      }
    } finally {
      setSavingVariant(false);
    }
  }

  async function toggleVariantActive(variant: TemplateVariant) {
    if (!id) return;
    try {
      const res = await apiClient.patch<TemplateVariant>(
        `/templates/${id}/variants/${variant.id}`,
        {
          isActive: !variant.isActive,
        },
      );
      setVariants((prev) => prev.map((v) => (v.id === variant.id ? res.data : v)));
    } catch {
      // keep simple; error will be visible via network tools
    }
  }

  async function handleCreateField(e: FormEvent) {
    e.preventDefault();
    if (!id) return;
    if (!newFieldKey.trim() || !newFieldLabel.trim()) {
      setFieldsError('Key and label are required');
      return;
    }

    setSavingField(true);
    setFieldsError(null);
    try {
      const body: any = {
        key: newFieldKey.trim(),
        label: newFieldLabel.trim(),
        fieldType: newFieldType,
        required: newFieldRequired,
      };
      const res = await apiClient.post<TemplateField>(`/templates/${id}/fields`, body);
      setFields((prev) => [...prev, res.data]);
      setNewFieldKey('');
      setNewFieldLabel('');
      setNewFieldRequired(false);
    } catch (err: any) {
      const data = err?.response?.data;
      if (data?.code === 'FEATURE_LOCKED') {
        setFieldsError(
          'You cannot modify templates on your current plan. Upgrade your membership to add personalization fields.',
        );
      } else {
        const message = data?.message || 'Failed to create field';
        setFieldsError(Array.isArray(message) ? message.join(', ') : String(message));
      }
    } finally {
      setSavingField(false);
    }
  }

  function startEditField(field: TemplateField) {
    setEditingFieldId(field.id);
    setFieldEditLabel(field.label);
    setFieldEditRequired(field.required);
    setFieldEditAffectsPricing(field.affectsPricing);
    setFieldEditAffectsProductionNotes(field.affectsProductionNotes);
    setFieldEditError(null);
  }

  function cancelEditField() {
    setEditingFieldId(null);
    setFieldEditError(null);
  }

  async function handleSaveFieldEdit(e: FormEvent, fieldId: string) {
    e.preventDefault();
    if (!id) return;
    if (!fieldEditLabel.trim()) {
      setFieldEditError('Label is required');
      return;
    }

    setFieldEditSaving(true);
    setFieldEditError(null);
    try {
      const body: any = {
        label: fieldEditLabel.trim(),
        required: fieldEditRequired,
        affectsPricing: fieldEditAffectsPricing,
        affectsProductionNotes: fieldEditAffectsProductionNotes,
      };
      const res = await apiClient.patch<TemplateField>(
        `/templates/${id}/fields/${fieldId}`,
        body,
      );
      setFields((prev) => prev.map((f) => (f.id === fieldId ? res.data : f)));
      setEditingFieldId(null);
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Failed to update field';
      setFieldEditError(Array.isArray(message) ? message.join(', ') : String(message));
    } finally {
      setFieldEditSaving(false);
    }
  }

  async function handleCreateRule(e: FormEvent) {
    e.preventDefault();
    if (!id) return;
    const value = Number(newRuleValue);
    if (!value || Number.isNaN(value)) {
      setRulesError('Rule value must be a number');
      return;
    }

    setSavingRule(true);
    setRulesError(null);
    try {
      const body: any = {
        ruleType: newRuleType,
        value,
      };
      if (newRuleVariantId) {
        body.variantId = newRuleVariantId;
      }
      const res = await apiClient.post<TemplatePricingRule>(
        `/templates/${id}/pricing-rules`,
        body,
      );
      setPricingRules((prev) => [...prev, res.data].sort((a, b) => a.priority - b.priority));
      setNewRuleValue('');
      setNewRuleVariantId('');
    } catch (err: any) {
      const data = err?.response?.data;
      if (data?.code === 'FEATURE_LOCKED') {
        setRulesError(
          'You cannot modify templates on your current plan. Upgrade your membership to add pricing rules.',
        );
      } else {
        const message = data?.message || 'Failed to create pricing rule';
        setRulesError(Array.isArray(message) ? message.join(', ') : String(message));
      }
    } finally {
      setSavingRule(false);
    }
  }

  function startEditRule(rule: TemplatePricingRule) {
    setEditingRuleId(rule.id);
    setRuleEditType(rule.ruleType);
    setRuleEditValue(String(rule.value));
    setRuleEditVariantId(rule.variantId ?? '');
    setRuleEditPriority(String(rule.priority));
    setRuleEditError(null);
  }

  function cancelEditRule() {
    setEditingRuleId(null);
    setRuleEditError(null);
  }

  async function handleSaveRuleEdit(e: FormEvent, ruleId: string) {
    e.preventDefault();
    if (!id) return;

    const valueNum = Number(ruleEditValue);
    if (!valueNum || Number.isNaN(valueNum)) {
      setRuleEditError('Rule value must be a number');
      return;
    }

    const priorityNum = ruleEditPriority ? Number(ruleEditPriority) : undefined;
    if (
      ruleEditPriority &&
      (Number.isNaN(priorityNum) || !Number.isFinite(priorityNum as number))
    ) {
      setRuleEditError('Priority must be a number');
      return;
    }

    setRuleEditSaving(true);
    setRuleEditError(null);
    try {
      const body: any = {
        ruleType: ruleEditType,
        value: valueNum,
        variantId: ruleEditVariantId || null,
      };
      if (typeof priorityNum === 'number' && !Number.isNaN(priorityNum)) {
        body.priority = priorityNum;
      }

      const res = await apiClient.patch<TemplatePricingRule>(
        `/templates/${id}/pricing-rules/${ruleId}`,
        body,
      );
      setPricingRules((prev) =>
        [...prev.map((r) => (r.id === ruleId ? res.data : r))].sort(
          (a, b) => a.priority - b.priority,
        ),
      );
      setEditingRuleId(null);
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Failed to update pricing rule';
      setRuleEditError(Array.isArray(message) ? message.join(', ') : String(message));
    } finally {
      setRuleEditSaving(false);
    }
  }

  if (!id) {
    return <p className="text-sm text-red-400">Missing template id in URL.</p>;
  }

  if (loading) {
    return <p className="text-sm text-slate-400">Loading template...</p>;
  }

  if (error) {
    return <p className="text-sm text-red-400">{error}</p>;
  }

  if (!template) {
    return <p className="text-sm text-slate-400">Template not found.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Link href="/templates" className="text-sky-400 hover:underline">
              Templates
            </Link>
            <span>/</span>
            <span>{template.name}</span>
          </div>
          <h1 className="mt-1 text-xl font-semibold tracking-tight">{template.name}</h1>
          <p className="text-xs text-slate-400">Slug: {template.slug}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex rounded-full bg-slate-800 px-2 py-0.5">
            {template.isActive ? 'Active' : 'Inactive'}
          </span>
          {template.category && (
            <span className="inline-flex rounded-full bg-slate-800 px-2 py-0.5">
              {template.category.name}
            </span>
          )}
          <Link
            href={`/template-products?templateId=${template.id}`}
            className="inline-flex items-center rounded-full bg-emerald-600/20 px-2 py-0.5 text-emerald-300 hover:bg-emerald-600/30"
          >
            Create Template Product
          </Link>
        </div>
      </div>

      <div className="border-b border-slate-800 text-xs text-slate-300">
        <nav className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={`rounded-t-md px-3 py-1 ${
              activeTab === 'details'
                ? 'bg-slate-900 text-sky-400'
                : 'bg-slate-900/40 text-slate-300 hover:text-slate-100'
            }`}
          >
            Details
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('variants')}
            className={`rounded-t-md px-3 py-1 ${
              activeTab === 'variants'
                ? 'bg-slate-900 text-sky-400'
                : 'bg-slate-900/40 text-slate-300 hover:text-slate-100'
            }`}
          >
            Variants
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('fields')}
            className={`rounded-t-md px-3 py-1 ${
              activeTab === 'fields'
                ? 'bg-slate-900 text-sky-400'
                : 'bg-slate-900/40 text-slate-300 hover:text-slate-100'
            }`}
          >
            Fields
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pricing')}
            className={`rounded-t-md px-3 py-1 ${
              activeTab === 'pricing'
                ? 'bg-slate-900 text-sky-400'
                : 'bg-slate-900/40 text-slate-300 hover:text-slate-100'
            }`}
          >
            Pricing rules
          </button>
        </nav>
      </div>

      {activeTab === 'details' && (
        <form
          onSubmit={handleSaveDetails}
          className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-200"
        >
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span>Name *</span>
              <input
                type="text"
                value={template.name}
                onChange={(e) => setTemplate({ ...template, name: e.target.value })}
                className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                required
              />
            </label>
            <label className="flex flex-col gap-1">
              <span>Slug</span>
              <input
                type="text"
                value={template.slug}
                onChange={(e) => setTemplate({ ...template, slug: e.target.value })}
                className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span>Category</span>
              <select
                value={template.categoryId ?? ''}
                onChange={(e) =>
                  setTemplate({
                    ...template,
                    categoryId: e.target.value || null,
                  })
                }
                className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              >
                <option value="">(none)</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span>Default material</span>
              <select
                value={template.defaultMaterialId ?? ''}
                onChange={(e) =>
                  setTemplate({
                    ...template,
                    defaultMaterialId: e.target.value || null,
                  })
                }
                className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              >
                <option value="">(none)</option>
                {materials.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span>Base width (mm)</span>
              <input
                type="number"
                min={1}
                value={template.baseWidthMm ?? ''}
                onChange={(e) =>
                  setTemplate({
                    ...template,
                    baseWidthMm: e.target.value ? Number(e.target.value) : null,
                  })
                }
                className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span>Base height (mm)</span>
              <input
                type="number"
                min={1}
                value={template.baseHeightMm ?? ''}
                onChange={(e) =>
                  setTemplate({
                    ...template,
                    baseHeightMm: e.target.value ? Number(e.target.value) : null,
                  })
                }
                className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span>Layers count</span>
              <input
                type="number"
                min={1}
                value={template.layersCount ?? ''}
                onChange={(e) =>
                  setTemplate({
                    ...template,
                    layersCount: e.target.value ? Number(e.target.value) : null,
                  })
                }
                className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              />
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={template.isActive}
                onChange={(e) => setTemplate({ ...template, isActive: e.target.checked })}
                className="h-3 w-3 rounded border-slate-600 bg-slate-900 text-sky-500 focus:ring-sky-500"
              />
              <span>Template is active</span>
            </label>
          </div>
          <label className="flex flex-col gap-1">
            <span>Description</span>
            <textarea
              value={template.description ?? ''}
              onChange={(e) => setTemplate({ ...template, description: e.target.value || null })}
              rows={3}
              className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
          </label>
          {detailsError && <p className="text-[11px] text-red-400">{detailsError}</p>}
          <button
            type="submit"
            disabled={savingDetails}
            className="rounded-md bg-sky-500 px-3 py-1 text-xs font-medium text-white hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {savingDetails ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      )}

      {activeTab === 'variants' && (
        <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <form
            onSubmit={handleCreateVariant}
            className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-200"
          >
            <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
              Add variant
            </div>
            <label className="flex flex-col gap-1">
              <span>Name *</span>
              <input
                type="text"
                value={newVariantName}
                onChange={(e) => setNewVariantName(e.target.value)}
                className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                required
              />
            </label>
            <label className="flex flex-col gap-1">
              <span>Default material</span>
              <select
                value={newVariantMaterialId}
                onChange={(e) => setNewVariantMaterialId(e.target.value)}
                className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              >
                <option value="">(none)</option>
                {materials.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
            {variantsError && <p className="text-[11px] text-red-400">{variantsError}</p>}
            <button
              type="submit"
              disabled={savingVariant}
              className="rounded-md bg-emerald-500 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingVariant ? 'Saving…' : 'Add variant'}
            </button>
          </form>

          <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-200">
            <div className="mb-1 flex items-center justify-between gap-2">
              <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                Variants
              </div>
              <div className="text-[11px] text-slate-500">Total: {variants.length}</div>
            </div>
            {variants.length === 0 && (
              <p className="text-xs text-slate-400">No variants yet.</p>
            )}
            {variants.length > 0 && (
              <ul className="space-y-2 text-xs">
                {variants.map((v) => (
                  <li
                    key={v.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2"
                  >
                    <div>
                      <div className="font-medium text-slate-100">{v.name}</div>
                      <div className="text-[11px] text-slate-400">
                        {v.defaultMaterialId
                          ? materials.find((m) => m.id === v.defaultMaterialId)?.name ||
                            v.defaultMaterialId
                          : 'No material'}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleVariantActive(v)}
                      className="text-[11px] text-sky-400 hover:text-sky-300"
                    >
                      {v.isActive ? 'Disable' : 'Enable'}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {activeTab === 'fields' && (
        <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <form
            onSubmit={handleCreateField}
            className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-200"
          >
            <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
              Add field
            </div>
            <label className="flex flex-col gap-1">
              <span>Key *</span>
              <input
                type="text"
                value={newFieldKey}
                onChange={(e) => setNewFieldKey(e.target.value)}
                className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                required
              />
            </label>
            <label className="flex flex-col gap-1">
              <span>Label *</span>
              <input
                type="text"
                value={newFieldLabel}
                onChange={(e) => setNewFieldLabel(e.target.value)}
                className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                required
              />
            </label>
            <label className="flex flex-col gap-1">
              <span>Type</span>
              <select
                value={newFieldType}
                onChange={(e) => setNewFieldType(e.target.value as TemplateFieldType)}
                className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              >
                <option value="TEXT">TEXT</option>
                <option value="NUMBER">NUMBER</option>
                <option value="CHOICE">CHOICE</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={newFieldRequired}
                onChange={(e) => setNewFieldRequired(e.target.checked)}
                className="h-3 w-3 rounded border-slate-600 bg-slate-900 text-sky-500 focus:ring-sky-500"
              />
              <span>Required</span>
            </label>
            {fieldsError && <p className="text-[11px] text-red-400">{fieldsError}</p>}
            <button
              type="submit"
              disabled={savingField}
              className="rounded-md bg-emerald-500 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingField ? 'Saving…' : 'Add field'}
            </button>
          </form>

          <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-200">
            <div className="mb-1 flex items-center justify-between gap-2">
              <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                Fields
              </div>
              <div className="text-[11px] text-slate-500">Total: {fields.length}</div>
            </div>
            {fields.length === 0 && <p className="text-xs text-slate-400">No fields yet.</p>}
            {fields.length > 0 && (
              <ul className="space-y-2 text-xs">
                {fields.map((f) => (
                  <li
                    key={f.id}
                    className="rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2"
                  >
                    {editingFieldId === f.id ? (
                      <form
                        onSubmit={(e) => handleSaveFieldEdit(e, f.id)}
                        className="space-y-2"
                      >
                        <div className="grid gap-2 md:grid-cols-2">
                          <label className="flex flex-col gap-1">
                            <span>Label</span>
                            <input
                              type="text"
                              value={fieldEditLabel}
                              onChange={(e) => setFieldEditLabel(e.target.value)}
                              className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                              required
                            />
                          </label>
                          <div className="flex flex-col gap-1">
                            <span className="text-slate-300">Options</span>
                            <div className="flex flex-wrap gap-2 text-[11px]">
                              <label className="inline-flex items-center gap-1">
                                <input
                                  type="checkbox"
                                  checked={fieldEditRequired}
                                  onChange={(e) =>
                                    setFieldEditRequired(e.target.checked)
                                  }
                                  className="h-3 w-3 rounded border-slate-600 bg-slate-900 text-sky-500 focus:ring-sky-500"
                                />
                                <span>Required</span>
                              </label>
                              <label className="inline-flex items-center gap-1">
                                <input
                                  type="checkbox"
                                  checked={fieldEditAffectsPricing}
                                  onChange={(e) =>
                                    setFieldEditAffectsPricing(e.target.checked)
                                  }
                                  className="h-3 w-3 rounded border-slate-600 bg-slate-900 text-sky-500 focus:ring-sky-500"
                                />
                                <span>Affects pricing</span>
                              </label>
                              <label className="inline-flex items-center gap-1">
                                <input
                                  type="checkbox"
                                  checked={fieldEditAffectsProductionNotes}
                                  onChange={(e) =>
                                    setFieldEditAffectsProductionNotes(
                                      e.target.checked,
                                    )
                                  }
                                  className="h-3 w-3 rounded border-slate-600 bg-slate-900 text-sky-500 focus:ring-sky-500"
                                />
                                <span>In notes</span>
                              </label>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-[11px] text-slate-400">
                            Type: {f.fieldType} • Key: {f.key}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={cancelEditField}
                              className="rounded-md border border-slate-700 px-2 py-0.5 text-[11px] text-slate-200 hover:bg-slate-800"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={fieldEditSaving}
                              className="rounded-md bg-sky-500 px-3 py-1 text-[11px] font-medium text-white hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {fieldEditSaving ? 'Saving…' : 'Save'}
                            </button>
                          </div>
                        </div>
                        {fieldEditError && (
                          <p className="text-[11px] text-red-400">{fieldEditError}</p>
                        )}
                      </form>
                    ) : (
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="font-medium text-slate-100">{f.label}</div>
                          <div className="text-[11px] text-slate-400">Key: {f.key}</div>
                          <div className="text-[11px] text-slate-500">
                            {f.affectsPricing && 'Affects pricing'}
                            {f.affectsPricing && f.affectsProductionNotes && ' • '}
                            {f.affectsProductionNotes && 'In production notes'}
                          </div>
                        </div>
                        <div className="text-right text-[11px] text-slate-400">
                          <div>Type: {f.fieldType}</div>
                          <div>{f.required ? 'Required' : 'Optional'}</div>
                          <button
                            type="button"
                            onClick={() => startEditField(f)}
                            className="mt-1 rounded-md border border-slate-700 px-2 py-0.5 text-[11px] text-slate-200 hover:bg-slate-800"
                          >
                            Edit
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {activeTab === 'pricing' && (
        <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <form
            onSubmit={handleCreateRule}
            className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-200"
          >
            <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
              Add pricing rule
            </div>
            <label className="flex flex-col gap-1">
              <span>Type</span>
              <select
                value={newRuleType}
                onChange={(e) => setNewRuleType(e.target.value as TemplateRuleType)}
                className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              >
                <option value="FIXED_BASE">FIXED_BASE</option>
                <option value="PER_CHARACTER">PER_CHARACTER</option>
                <option value="PER_CM2">PER_CM2</option>
                <option value="PER_ITEM">PER_ITEM</option>
                <option value="LAYER_MULTIPLIER">LAYER_MULTIPLIER</option>
                <option value="ADD_ON_LINK">ADD_ON_LINK</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span>Value *</span>
              <input
                type="number"
                step="0.01"
                value={newRuleValue}
                onChange={(e) => setNewRuleValue(e.target.value)}
                className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                required
              />
            </label>
            <label className="flex flex-col gap-1">
              <span>Variant (optional)</span>
              <select
                value={newRuleVariantId}
                onChange={(e) => setNewRuleVariantId(e.target.value)}
                className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              >
                <option value="">Applies to all variants</option>
                {variants.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </label>
            {rulesError && <p className="text-[11px] text-red-400">{rulesError}</p>}
            <button
              type="submit"
              disabled={savingRule}
              className="rounded-md bg-emerald-500 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingRule ? 'Saving…' : 'Add rule'}
            </button>
          </form>

          <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-200">
            <div className="mb-1 flex items-center justify-between gap-2">
              <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                Pricing rules
              </div>
              <div className="text-[11px] text-slate-500">Total: {pricingRules.length}</div>
            </div>
            {pricingRules.length === 0 && (
              <p className="text-xs text-slate-400">No pricing rules yet.</p>
            )}
            {pricingRules.length > 0 && (
              <ul className="space-y-2 text-xs">
                {pricingRules.map((r) => (
                  <li
                    key={r.id}
                    className="rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2"
                  >
                    {editingRuleId === r.id ? (
                      <form
                        onSubmit={(e) => handleSaveRuleEdit(e, r.id)}
                        className="space-y-2"
                      >
                        <div className="grid gap-2 md:grid-cols-3">
                          <label className="flex flex-col gap-1">
                            <span>Type</span>
                            <select
                              value={ruleEditType}
                              onChange={(e) =>
                                setRuleEditType(e.target.value as TemplateRuleType)
                              }
                              className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                            >
                              <option value="FIXED_BASE">FIXED_BASE</option>
                              <option value="PER_CHARACTER">PER_CHARACTER</option>
                              <option value="PER_CM2">PER_CM2</option>
                              <option value="PER_ITEM">PER_ITEM</option>
                              <option value="LAYER_MULTIPLIER">LAYER_MULTIPLIER</option>
                              <option value="ADD_ON_LINK">ADD_ON_LINK</option>
                            </select>
                          </label>
                          <label className="flex flex-col gap-1">
                            <span>Value</span>
                            <input
                              type="number"
                              step="0.01"
                              value={ruleEditValue}
                              onChange={(e) => setRuleEditValue(e.target.value)}
                              className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                              required
                            />
                          </label>
                          <label className="flex flex-col gap-1">
                            <span>Priority</span>
                            <input
                              type="number"
                              value={ruleEditPriority}
                              onChange={(e) => setRuleEditPriority(e.target.value)}
                              className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                            />
                          </label>
                          <label className="flex flex-col gap-1 md:col-span-3">
                            <span>Variant (optional)</span>
                            <select
                              value={ruleEditVariantId}
                              onChange={(e) => setRuleEditVariantId(e.target.value)}
                              className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                            >
                              <option value="">Applies to all variants</option>
                              {variants.map((v) => (
                                <option key={v.id} value={v.id}>
                                  {v.name}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-[11px] text-slate-400">
                            Current: {r.ruleType} • Value: {r.value} • Priority: {r.priority}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={cancelEditRule}
                              className="rounded-md border border-slate-700 px-2 py-0.5 text-[11px] text-slate-200 hover:bg-slate-800"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={ruleEditSaving}
                              className="rounded-md bg-sky-500 px-3 py-1 text-[11px] font-medium text-white hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {ruleEditSaving ? 'Saving…' : 'Save'}
                            </button>
                          </div>
                        </div>
                        {ruleEditError && (
                          <p className="text-[11px] text-red-400">{ruleEditError}</p>
                        )}
                      </form>
                    ) : (
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="font-medium text-slate-100">{r.ruleType}</div>
                          <div className="text-[11px] text-slate-400">
                            Value: {r.value}{' '}
                            {r.variantId &&
                              `• Variant: ${
                                variants.find((v) => v.id === r.variantId)?.name || r.variantId
                              }`}
                          </div>
                        </div>
                        <div className="text-right text-[11px] text-slate-400">
                          <div>Priority: {r.priority}</div>
                          <button
                            type="button"
                            onClick={() => startEditRule(r)}
                            className="mt-1 rounded-md border border-slate-700 px-2 py-0.5 text-[11px] text-slate-200 hover:bg-slate-800"
                          >
                            Edit
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
