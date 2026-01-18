'use client';

import { FormEvent, Fragment, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '../../../../lib/api-client';
import { useT } from '../../i18n';

interface OrderItem {
  id: string;
  title: string;
  quantity: number;
  widthMm: number | null;
  heightMm: number | null;
  customizationText: string | null;
  estimatedMinutes: number | null;
  priceSnapshotJson: any;
  material: {
    id: string;
    name: string;
  } | null;
  templateId?: string | null;
  template?: {
    id: string;
    name: string;
    slug?: string;
  } | null;
  templateVariantId?: string | null;
  templateVariant?: {
    id: string;
    name: string;
  } | null;
  templateProductId?: string | null;
  templateProduct?: {
    id: string;
    name: string;
  } | null;
  personalizationJson?: any;
  timeLogs: {
    id: string;
    startAt: string;
    endAt: string | null;
    durationMinutes: number | null;
    user: {
      id: string;
      name: string;
      email: string;
    };
  }[];
}

interface ExternalStatusLinkInfo {
  connectionId: string;
  connectionName: string;
  channel: 'WOOCOMMERCE' | 'ETSY' | 'CSV';
  externalOrderId: string | null;
  externalOrderNumber: string | null;
  lastSync: {
    status: 'SUCCESS' | 'FAILED';
    errorMessage: string | null;
    createdAt: string;
  } | null;
}

interface ExternalStatusResponse {
  links: ExternalStatusLinkInfo[];
}

interface OrderFile {
  id: string;
  url: string;
  mime: string;
  size: number;
  createdAt: string;
}

interface ActivityLogEntry {
  id: string;
  field: string;
  oldValue: string | null;
  newValue: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
}

interface OrderDetail {
  id: string;
  status: string;
  priority: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  customer: {
    id: string;
    name: string;
    email: string | null;
  };
  items: OrderItem[];
  files: OrderFile[];
  activityLog: ActivityLogEntry[];
  externalLinks?: {
    channel: 'WOOCOMMERCE' | 'ETSY' | 'CSV';
    connection: {
      id: string;
      name: string;
      channel: 'WOOCOMMERCE' | 'ETSY' | 'CSV';
    };
    externalOrder?: {
      id: string;
      externalOrderNumber: string;
    } | null;
  }[];
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

interface TemplateSummary {
  id: string;
  name: string;
  isActive: boolean;
}

interface TemplatesListResponse {
  data: TemplateSummary[];
  total: number;
}

type TemplateFieldType = 'TEXT' | 'NUMBER' | 'CHOICE';

interface TemplateFieldForOrder {
  id: string;
  key: string;
  label: string;
  fieldType: TemplateFieldType;
  required: boolean;
}

interface TemplateVariantForOrder {
  id: string;
  name: string;
  isActive: boolean;
  widthMm: number | null;
  heightMm: number | null;
  defaultMaterialId: string | null;
}

interface TemplateDetailForOrder {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  variants: TemplateVariantForOrder[];
  fields: TemplateFieldForOrder[];
}

interface TemplatePriceBreakdown {
  recommendedPrice?: number;
  totalCost?: number;
  templateBasePrice?: number;
  templateLines?: { id?: string; label: string; amount: number }[];
  [key: string]: any;
}

interface TemplateDryRunItem {
  dryRun: true;
  orderId: string;
  templateId: string;
  templateVariantId: string | null;
  materialId: string;
  quantity: number;
  widthMm: number;
  heightMm: number;
  title: string;
  personalization: any;
  derivedFields: any;
  price: TemplatePriceBreakdown;
}

interface BulkDryRunResponse {
  orderId: string;
  dryRun: boolean;
  items: TemplateDryRunItem[];
}

interface TemplateProductForOrder {
  id: string;
  name: string;
  templateId: string;
  variantId?: string | null;
  materialId?: string | null;
  defaultQuantity: number;
  personalizationJson?: any;
  priceOverride?: number | null;
  isActive: boolean;
  template?: {
    id: string;
    name: string;
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
  data: TemplateProductForOrder[];
  total: number;
}

interface OffcutSuggestion {
  offcutId: string;
  materialId: string;
  thicknessMm: number;
  widthMm: number | null;
  heightMm: number | null;
  estimatedAreaMm2: number | null;
  locationLabel: string | null;
  condition: 'GOOD' | 'OK' | 'DAMAGED';
  status: 'AVAILABLE' | 'RESERVED' | 'USED' | 'DISCARDED';
  fitReason: string;
}

export default function OrderDetailPage() {
  const t = useT();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pricingState, setPricingState] = useState<
    Record<string, { loading: boolean; error: string | null }>
  >({});

  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [materials, setMaterials] = useState<MaterialOption[]>([]);
  const [templateProducts, setTemplateProducts] = useState<TemplateProductForOrder[]>([]);
  const [metaLoading, setMetaLoading] = useState(false);
  const [metaError, setMetaError] = useState<string | null>(null);

  const [externalStatus, setExternalStatus] = useState<ExternalStatusResponse | null>(null);
  const [externalStatusLoading, setExternalStatusLoading] = useState(false);
  const [externalStatusError, setExternalStatusError] = useState<string | null>(null);
  const [externalStatusRetryLoading, setExternalStatusRetryLoading] = useState(false);

  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateDetailForOrder | null>(
    null,
  );
  const [templateLoading, setTemplateLoading] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);

  const [singleVariantId, setSingleVariantId] = useState('');
  const [singleMaterialId, setSingleMaterialId] = useState('');
  const [singleQuantity, setSingleQuantity] = useState('1');
  const [singlePersonalization, setSinglePersonalization] = useState<
    Record<string, string>
  >({});
  const [singlePreview, setSinglePreview] = useState<{
    loading: boolean;
    error: string | null;
    result: TemplateDryRunItem | null;
  }>({ loading: false, error: null, result: null });

  const [bulkVariantId, setBulkVariantId] = useState('');
  const [bulkMaterialId, setBulkMaterialId] = useState('');
  const [bulkNameFieldKey, setBulkNameFieldKey] = useState('');
  const [bulkLines, setBulkLines] = useState('');
  const [bulkPreview, setBulkPreview] = useState<{
    loading: boolean;
    error: string | null;
    result: BulkDryRunResponse | null;
  }>({ loading: false, error: null, result: null });

  const [selectedTemplateProductId, setSelectedTemplateProductId] = useState('');
  const [tpQuantity, setTpQuantity] = useState('');
  const [tpPriceOverride, setTpPriceOverride] = useState('');
  const [tpError, setTpError] = useState<string | null>(null);
  const [tpLoading, setTpLoading] = useState(false);

  const [offcutSuggestions, setOffcutSuggestions] = useState<
    Record<string, { loading: boolean; error: string | null; items: OffcutSuggestion[] }>
  >({});
  const [offcutActionKey, setOffcutActionKey] = useState<string | null>(null);

  async function loadExternalStatus() {
    if (!id) return;
    setExternalStatusLoading(true);
    setExternalStatusError(null);
    try {
      const res = await apiClient.get<ExternalStatusResponse>(
        `/orders/${id}/external-status`,
      );
      setExternalStatus(res.data);
    } catch (err: any) {
      const message =
        err?.response?.data?.message || t('order_detail.failed_to_load_external_sync_status');
      setExternalStatusError(Array.isArray(message) ? message.join(', ') : String(message));
    } finally {
      setExternalStatusLoading(false);
    }
  }

  async function reloadOrder() {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<OrderDetail>(`/orders/${id}`);
      setOrder(res.data);
    } catch (err: any) {
      const message = err?.response?.data?.message || t('order_detail.failed_to_load_order');
      setError(Array.isArray(message) ? message.join(', ') : String(message));
    } finally {
      setLoading(false);
    }
  }

  async function handleRetryExternalStatus() {
    if (!id) return;
    setExternalStatusRetryLoading(true);
    try {
      await apiClient.post(`/orders/${id}/external-status/retry`, {});
      await loadExternalStatus();
      // We keep UI minimal; details are visible in the status card.
    } catch (err: any) {
      const message =
        err?.response?.data?.message || t('order_detail.failed_to_retry_external_status_push');
      setExternalStatusError(Array.isArray(message) ? message.join(', ') : String(message));
    } finally {
      setExternalStatusRetryLoading(false);
    }
  }

  useEffect(() => {
    if (!id) return;
    reloadOrder();
    loadExternalStatus();
  }, [id]);

  useEffect(() => {
    async function loadMeta() {
      setMetaLoading(true);
      setMetaError(null);
      try {
        const [templatesRes, materialsRes, templateProductsRes] = await Promise.all([
          apiClient.get<TemplatesListResponse>('/templates', {
            params: { isActive: true },
          }),
          apiClient.get<MaterialsListResponse>('/materials'),
          apiClient.get<TemplateProductsListResponse>('/template-products', {
            params: { isActive: true },
          }),
        ]);
        setTemplates(templatesRes.data.data);
        setMaterials(materialsRes.data.data);
        setTemplateProducts(templateProductsRes.data.data);
      } catch (err: any) {
        const message =
          err?.response?.data?.message || t('order_detail.failed_to_load_templates_materials');
        setMetaError(Array.isArray(message) ? message.join(', ') : String(message));
      } finally {
        setMetaLoading(false);
      }
    }

    loadMeta();
  }, []);

  function formatOrderStatus(value: string) {
    const key = `order.status.${String(value).toLowerCase()}`;
    const translated = t(key);
    return translated === key ? String(value).replace(/_/g, ' ') : translated;
  }

  function formatOrderPriority(value: string) {
    const key = `order.priority.${String(value).toLowerCase()}`;
    const translated = t(key);
    return translated === key ? String(value) : translated;
  }

  function formatSyncStatus(value: string) {
    const key = `sync.status.${String(value).toLowerCase()}`;
    const translated = t(key);
    return translated === key ? String(value) : translated;
  }

  function formatUnitType(value: string) {
    const upper = String(value).toUpperCase();
    if (upper === 'SHEET') return t('unit.sheet');
    if (upper === 'M2') return t('unit.m2');
    return String(value);
  }

  async function loadTemplateDetails(templateId: string) {
    setSelectedTemplateId(templateId);
    setSelectedTemplate(null);
    setTemplateError(null);
    setSingleVariantId('');
    setBulkVariantId('');
    setSinglePersonalization({});
    setSinglePreview({ loading: false, error: null, result: null });
    setBulkPreview({ loading: false, error: null, result: null });

    if (!templateId) {
      return;
    }

    setTemplateLoading(true);
    try {
      const res = await apiClient.get<TemplateDetailForOrder>(`/templates/${templateId}`);
      const tmpl = res.data;
      setSelectedTemplate(tmpl);

      const activeVariants = tmpl.variants.filter((v) => v.isActive);
      const firstVariantId = activeVariants[0]?.id || tmpl.variants[0]?.id || '';
      setSingleVariantId(firstVariantId);
      setBulkVariantId(firstVariantId);

      if (!bulkNameFieldKey && tmpl.fields.length > 0) {
        setBulkNameFieldKey(tmpl.fields[0].key);
      }
    } catch (err: any) {
      const message = err?.response?.data?.message || t('order_detail.failed_to_load_template');
      setTemplateError(Array.isArray(message) ? message.join(', ') : String(message));
      setSelectedTemplate(null);
    } finally {
      setTemplateLoading(false);
    }
  }

  function updateSinglePersonalization(key: string, value: string) {
    setSinglePersonalization((prev) => ({ ...prev, [key]: value }));
  }

  function buildBulkItems() {
    const items: { quantity?: number; personalization?: any }[] = [];
    const lines = bulkLines.split(/\r?\n/);

    for (const rawLine of lines) {
      const trimmed = rawLine.trim();
      if (!trimmed) continue;

      let name = trimmed;
      let qty = 1;

      const pipeIndex = trimmed.lastIndexOf('|');
      if (pipeIndex !== -1) {
        name = trimmed.slice(0, pipeIndex).trim();
        const qtyPart = trimmed.slice(pipeIndex + 1).trim();
        const parsed = Number(qtyPart);
        if (parsed && parsed > 0) {
          qty = parsed;
        }
      }

      if (!name) continue;

      const personalization: any = {};
      if (bulkNameFieldKey) {
        personalization[bulkNameFieldKey] = name;
      }

      items.push({
        quantity: qty,
        personalization,
      });
    }

    return items;
  }

  async function handlePreviewSingleFromTemplate(e: FormEvent) {
    e.preventDefault();
    if (!order || !selectedTemplateId || !selectedTemplate) return;

    const qty = Number(singleQuantity) || 1;
    if (!qty || qty <= 0) {
      setSinglePreview((prev) => ({
        ...prev,
        error: t('order_detail.validation.quantity_at_least_1'),
      }));
      return;
    }

    const personalization: any = {};
    let missingRequired = false;
    for (const field of selectedTemplate.fields) {
      const raw = singlePersonalization[field.key]?.trim() ?? '';
      if (field.required && !raw) {
        missingRequired = true;
      }
      if (!raw) continue;
      if (field.fieldType === 'NUMBER') {
        const num = Number(raw);
        if (!Number.isNaN(num)) {
          personalization[field.key] = num;
        }
      } else {
        personalization[field.key] = raw;
      }
    }

    if (missingRequired) {
      setSinglePreview((prev) => ({
        ...prev,
        error: t('order_detail.validation.fill_required_personalization'),
      }));
      return;
    }

    const payload: any = {
      templateId: selectedTemplateId,
      dryRun: true,
    };

    if (singleVariantId) payload.variantId = singleVariantId;
    if (singleMaterialId) payload.materialId = singleMaterialId;
    if (qty > 0) payload.quantity = qty;
    if (Object.keys(personalization).length > 0) {
      payload.personalization = personalization;
    }

    setSinglePreview({ loading: true, error: null, result: null });
    try {
      const res = await apiClient.post<TemplateDryRunItem>(
        `/orders/${order.id}/add-item-from-template`,
        payload,
      );
      setSinglePreview({ loading: false, error: null, result: res.data });
    } catch (err: any) {
      const message =
        err?.response?.data?.message || t('order_detail.failed_to_preview_template_item');
      setSinglePreview({
        loading: false,
        error: Array.isArray(message) ? message.join(', ') : String(message),
        result: null,
      });
    }
  }

  async function loadOffcutSuggestionsForItem(itemId: string) {
    if (!order) return;
    setOffcutSuggestions((prev) => ({
      ...prev,
      [itemId]: {
        loading: true,
        error: null,
        items: prev[itemId]?.items ?? [],
      },
    }));

    try {
      const res = await apiClient.get<OffcutSuggestion[]>(
        '/offcuts/suggestions',
        {
          params: { orderItemId: itemId },
        },
      );
      setOffcutSuggestions((prev) => ({
        ...prev,
        [itemId]: {
          loading: false,
          error: null,
          items: res.data,
        },
      }));
    } catch (err: any) {
      const message =
        err?.response?.data?.message || t('order_detail.failed_to_load_offcut_suggestions');
      setOffcutSuggestions((prev) => ({
        ...prev,
        [itemId]: {
          loading: false,
          error: Array.isArray(message) ? message.join(', ') : String(message),
          items: prev[itemId]?.items ?? [],
        },
      }));
    }
  }

  async function reserveOffcutForItem(itemId: string, offcutId: string) {
    const key = `reserve:${itemId}:${offcutId}`;
    setOffcutActionKey(key);
    try {
      await apiClient.post(`/offcuts/${offcutId}/reserve`, {
        orderItemId: itemId,
      });
      await loadOffcutSuggestionsForItem(itemId);
    } catch (err: any) {
      const message = err?.response?.data?.message || t('order_detail.failed_to_reserve_offcut');
      alert(Array.isArray(message) ? message.join(', ') : String(message));
    } finally {
      setOffcutActionKey((current) => (current === key ? null : current));
    }
  }

  async function markFullOffcutUsedForItem(itemId: string, offcutId: string) {
    const key = `usefull:${itemId}:${offcutId}`;
    setOffcutActionKey(key);
    try {
      await apiClient.post(`/offcuts/${offcutId}/use-full`, {
        orderItemId: itemId,
      });
      await loadOffcutSuggestionsForItem(itemId);
    } catch (err: any) {
      const message =
        err?.response?.data?.message || t('order_detail.failed_to_mark_offcut_used');
      alert(Array.isArray(message) ? message.join(', ') : String(message));
    } finally {
      setOffcutActionKey((current) => (current === key ? null : current));
    }
  }

  async function logPartialOffcutUsageForItem(itemId: string, offcutId: string) {
    const key = `usepartial:${itemId}:${offcutId}`;
    const input = window.prompt(t('order_detail.offcut_prompt_used_area'));
    if (!input) {
      return;
    }
    const usedArea = Number(input.replace(/[^0-9.]/g, ''));
    if (!usedArea || usedArea <= 0) {
      alert(t('order_detail.offcut_invalid_area'));
      return;
    }

    setOffcutActionKey(key);
    try {
      await apiClient.post(`/offcuts/${offcutId}/use-partial`, {
        orderItemId: itemId,
        usedAreaMm2: usedArea,
      });
      await loadOffcutSuggestionsForItem(itemId);
    } catch (err: any) {
      const message =
        err?.response?.data?.message || t('order_detail.failed_to_log_partial_usage');
      alert(Array.isArray(message) ? message.join(', ') : String(message));
    } finally {
      setOffcutActionKey((current) => (current === key ? null : current));
    }
  }

  async function handleAddFromTemplateProduct(e: FormEvent) {
    e.preventDefault();
    if (!order) return;

    setTpError(null);

    if (!selectedTemplateProductId) {
      setTpError(t('order_detail.validation.select_template_product'));
      return;
    }

    const tp = templateProducts.find((p) => p.id === selectedTemplateProductId);
    if (!tp) {
      setTpError(t('order_detail.validation.template_product_not_found'));
      return;
    }

    const qty = Number(tpQuantity || tp.defaultQuantity);
    if (!qty || qty <= 0) {
      setTpError(t('order_detail.validation.quantity_at_least_1'));
      return;
    }

    let priceOverrideValue: number | undefined;
    if (tpPriceOverride.trim()) {
      const parsed = Number(tpPriceOverride.trim());
      if (Number.isNaN(parsed)) {
        setTpError(t('order_detail.validation.price_override_number'));
        return;
      }
      priceOverrideValue = parsed;
    } else if (typeof tp.priceOverride === 'number') {
      priceOverrideValue = tp.priceOverride;
    }

    const payload: any = {
      templateId: tp.templateId,
      quantity: qty,
      templateProductId: tp.id,
    };

    if (tp.variantId) payload.variantId = tp.variantId;
    if (tp.materialId) payload.materialId = tp.materialId;
    if (tp.personalizationJson && typeof tp.personalizationJson === 'object') {
      payload.personalization = tp.personalizationJson;
    }
    if (typeof priceOverrideValue === 'number') {
      payload.priceOverride = priceOverrideValue;
    }

    setTpLoading(true);
    try {
      await apiClient.post(`/orders/${order.id}/add-item-from-template`, payload);
      await reloadOrder();
      setTpLoading(false);
      setTpError(null);
      setSelectedTemplateProductId('');
      setTpQuantity('');
      setTpPriceOverride('');
    } catch (err: any) {
      const message =
        err?.response?.data?.message || t('order_detail.failed_to_add_item_from_template_product');
      setTpError(Array.isArray(message) ? message.join(', ') : String(message));
      setTpLoading(false);
    }
  }

  async function handleAddSingleFromTemplate(e: FormEvent) {
    e.preventDefault();
    if (!order || !selectedTemplateId || !selectedTemplate) return;

    const qty = Number(singleQuantity) || 1;
    if (!qty || qty <= 0) {
      setSinglePreview((prev) => ({
        ...prev,
        error: t('order_detail.validation.quantity_at_least_1'),
      }));
      return;
    }

    const personalization: any = {};
    let missingRequired = false;
    for (const field of selectedTemplate.fields) {
      const raw = singlePersonalization[field.key]?.trim() ?? '';
      if (field.required && !raw) {
        missingRequired = true;
      }
      if (!raw) continue;
      if (field.fieldType === 'NUMBER') {
        const num = Number(raw);
        if (!Number.isNaN(num)) {
          personalization[field.key] = num;
        }
      } else {
        personalization[field.key] = raw;
      }
    }

    if (missingRequired) {
      setSinglePreview((prev) => ({
        ...prev,
        error: t('order_detail.validation.fill_required_personalization'),
      }));
      return;
    }

    const payload: any = {
      templateId: selectedTemplateId,
    };

    if (singleVariantId) payload.variantId = singleVariantId;
    if (singleMaterialId) payload.materialId = singleMaterialId;
    if (qty > 0) payload.quantity = qty;
    if (Object.keys(personalization).length > 0) {
      payload.personalization = personalization;
    }

    setSinglePreview({ loading: true, error: null, result: null });
    try {
      await apiClient.post(`/orders/${order.id}/add-item-from-template`, payload);
      await reloadOrder();
      setSinglePreview({ loading: false, error: null, result: null });
    } catch (err: any) {
      const message =
        err?.response?.data?.message || t('order_detail.failed_to_add_template_item');
      setSinglePreview({
        loading: false,
        error: Array.isArray(message) ? message.join(', ') : String(message),
        result: null,
      });
    }
  }

  async function handlePreviewBulkFromTemplate(e: FormEvent) {
    e.preventDefault();
    if (!order || !selectedTemplateId || !selectedTemplate) return;

    if (!bulkNameFieldKey) {
      setBulkPreview((prev) => ({
        ...prev,
        error: t('order_detail.validation.select_personalization_field_for_names'),
      }));
      return;
    }

    const items = buildBulkItems();
    if (items.length === 0) {
      setBulkPreview((prev) => ({
        ...prev,
        error: t('order_detail.validation.enter_at_least_one_line'),
      }));
      return;
    }

    const payload: any = {
      templateId: selectedTemplateId,
      dryRun: true,
      items,
    };

    if (bulkVariantId) payload.variantId = bulkVariantId;
    if (bulkMaterialId) payload.materialId = bulkMaterialId;

    setBulkPreview({ loading: true, error: null, result: null });
    try {
      const res = await apiClient.post<BulkDryRunResponse>(
        `/orders/${order.id}/bulk-add-from-template`,
        payload,
      );
      setBulkPreview({ loading: false, error: null, result: res.data });
    } catch (err: any) {
      const message =
        err?.response?.data?.message || t('order_detail.failed_to_preview_bulk_items');
      setBulkPreview({
        loading: false,
        error: Array.isArray(message) ? message.join(', ') : String(message),
        result: null,
      });
    }
  }

  async function handleAddBulkFromTemplate(e: FormEvent) {
    e.preventDefault();
    if (!order || !selectedTemplateId || !selectedTemplate) return;

    if (!bulkNameFieldKey) {
      setBulkPreview((prev) => ({
        ...prev,
        error: t('order_detail.validation.select_personalization_field_for_names'),
      }));
      return;
    }

    const items = buildBulkItems();
    if (items.length === 0) {
      setBulkPreview((prev) => ({
        ...prev,
        error: t('order_detail.validation.enter_at_least_one_line'),
      }));
      return;
    }

    const payload: any = {
      templateId: selectedTemplateId,
      items,
    };

    if (bulkVariantId) payload.variantId = bulkVariantId;
    if (bulkMaterialId) payload.materialId = bulkMaterialId;

    setBulkPreview({ loading: true, error: null, result: null });
    try {
      await apiClient.post(`/orders/${order.id}/bulk-add-from-template`, payload);
      await reloadOrder();
      setBulkPreview({ loading: false, error: null, result: null });
    } catch (err: any) {
      const message = err?.response?.data?.message || t('order_detail.failed_to_add_bulk_items');
      setBulkPreview({
        loading: false,
        error: Array.isArray(message) ? message.join(', ') : String(message),
        result: null,
      });
    }
  }

  async function recalcItemPrice(itemId: string) {
    if (!order) return;

    const item = order.items.find((i) => i.id === itemId);
    if (!item) return;

    const materialId = item.material?.id;
    const quantity = item.quantity;
    const widthMm = item.widthMm ?? undefined;
    const heightMm = item.heightMm ?? undefined;

    if (!materialId || !quantity || !widthMm || !heightMm) {
      setPricingState((prev) => ({
        ...prev,
        [itemId]: {
          loading: false,
          error: t('order_detail.validation.pricing_requirements'),
        },
      }));
      return;
    }

    setPricingState((prev) => ({
      ...prev,
      [itemId]: { loading: true, error: null },
    }));

    try {
      const body = {
        materialId,
        quantity,
        widthMm,
        heightMm,
        machineMinutes: item.estimatedMinutes ?? 0,
      };

      const res = await apiClient.post(
        `/pricing/orders/${order.id}/items/${itemId}`,
        body,
      );

      const updatedItem = res.data.item as OrderItem;

      setOrder((prev) =>
        prev
          ? {
              ...prev,
              items: prev.items.map((i) => (i.id === itemId ? updatedItem : i)),
            }
          : prev,
      );

      setPricingState((prev) => ({
        ...prev,
        [itemId]: { loading: false, error: null },
      }));
    } catch (err: any) {
      const message =
        err?.response?.data?.message || t('order_detail.failed_to_recalculate_price');
      setPricingState((prev) => ({
        ...prev,
        [itemId]: {
          loading: false,
          error: Array.isArray(message) ? message.join(', ') : String(message),
        },
      }));
    }
  }

  if (!id) {
    return <p className="text-sm text-red-400">{t('order_detail.missing_id')}</p>;
  }

  if (loading) {
    return <p className="text-sm text-slate-400">{t('order_detail.loading')}</p>;
  }

  if (error) {
    return <p className="text-sm text-red-400">{error}</p>;
  }

  if (!order) {
    return <p className="text-sm text-slate-400">{t('order_detail.not_found')}</p>;
  }

  const totalItems = order.items.length;
  const pricedItems = order.items.filter((item) => {
    const breakdown = item.priceSnapshotJson as any;
    return breakdown && typeof breakdown.recommendedPrice === 'number';
  });
  const totalRecommendedPrice = pricedItems.reduce((sum, item) => {
    const breakdown = item.priceSnapshotJson as any;
    const value =
      breakdown && typeof breakdown.recommendedPrice === 'number'
        ? breakdown.recommendedPrice
        : 0;
    return sum + value;
  }, 0);
  const unpricedItemsCount = totalItems - pricedItems.length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Link href="/orders" className="text-sky-400 hover:underline">
              {t('orders.title')}
            </Link>
            <span>/</span>
            <span>{order.id.slice(0, 8)}...</span>
          </div>
          <h1 className="mt-1 text-xl font-semibold tracking-tight">
            {order.customer.name}
          </h1>
          {order.customer.email && (
            <p className="text-xs text-slate-400">{order.customer.email}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex rounded-full bg-slate-800 px-2 py-0.5">
            {t('order_detail.status')}: {formatOrderStatus(order.status)}
          </span>
          <span
            className={`inline-flex rounded-full px-2 py-0.5 ${
              order.priority === 'URGENT'
                ? 'bg-red-500/20 text-red-300'
                : 'bg-slate-800 text-slate-200'
            }`}
          >
            {t('order_detail.priority')}: {formatOrderPriority(order.priority)}
          </span>
          <span className="inline-flex rounded-full bg-slate-800 px-2 py-0.5">
            {t('order_detail.items')}: {totalItems}
          </span>
          <span className="inline-flex rounded-full bg-slate-800 px-2 py-0.5">
            {t('order_detail.created')}: {new Date(order.createdAt).toLocaleString()}
          </span>
        </div>
      </div>

      {externalStatus && externalStatus.links.length > 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-xs text-slate-200">
          <div className="mb-1 flex items-center justify-between gap-2">
            <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
              {t('order_detail.external_sync_title')}
            </div>
            {externalStatusLoading && (
              <div className="text-[11px] text-slate-400">{t('order_detail.external_checking')}</div>
            )}
          </div>
          {externalStatusError && (
            <p className="mb-1 text-[11px] text-red-400">{externalStatusError}</p>
          )}
          <div className="space-y-1">
            {externalStatus.links.map((link) => (
              <div
                key={link.connectionId}
                className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 pt-2 first:border-t-0 first:pt-0"
             >
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-flex rounded-full bg-slate-800 px-2 py-0.5 text-[11px]"
                    >
                      {t(`sales_channels.channel.${link.channel.toLowerCase()}` as any)}{' '}
                      {link.externalOrderNumber ? `#${link.externalOrderNumber}` : ''}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {link.connectionName}
                    </span>
                  </div>
                  {link.lastSync ? (
                    <div className="text-[11px] text-slate-400">
                      {t('order_detail.external_last_push')}{' '}
                      <span
                        className={
                          link.lastSync.status === 'SUCCESS'
                            ? 'text-emerald-300'
                            : 'text-red-300'
                        }
                      >
                        {formatSyncStatus(link.lastSync.status)}
                      </span>{' '}
                      {t('order_detail.external_at')} {new Date(link.lastSync.createdAt).toLocaleString()}
                      {link.lastSync.errorMessage && (
                        <span className="ml-1 text-[11px] text-red-300">
                          · {link.lastSync.errorMessage}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-400">{t('order_detail.external_no_push')}</div>
                  )}
                </div>
                <div>
                  <button
                    type="button"
                    onClick={handleRetryExternalStatus}
                    disabled={externalStatusRetryLoading}
                    className="rounded-md border border-sky-600 px-3 py-1 text-[11px] text-sky-300 hover:bg-sky-900/40 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {externalStatusRetryLoading
                      ? t('order_detail.external_retrying')
                      : t('order_detail.external_retry_push')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-xs text-slate-200">
          <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">
            {t('order_detail.pricing_summary')}
          </div>
          <div className="space-y-1">
            <div>
              {t('order_detail.total_recommended_price')}:{' '}
              <span className="font-semibold">
                {totalRecommendedPrice.toFixed(2)}
              </span>
            </div>
            <div className="text-slate-400">
              {t('order_detail.items_priced')}: {pricedItems.length} / {totalItems}
            </div>
            {unpricedItemsCount > 0 && (
              <div className="text-[11px] text-amber-300">
                {unpricedItemsCount} {t('order_detail.unpriced_notice')}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-xs text-slate-200">
            <div className="mb-2 text-sm font-medium">{t('order_detail.add_item_from_template')}</div>
            {metaError && (
              <p className="mb-2 text-[11px] text-red-400">{metaError}</p>
            )}
            {templateError && (
              <p className="mb-2 text-[11px] text-red-400">{templateError}</p>
            )}
            {metaLoading && (
              <p className="text-[11px] text-slate-400">{t('order_detail.loading_templates_materials')}</p>
            )}
            {!metaLoading && templates.length === 0 && !metaError && (
              <p className="text-[11px] text-slate-400">{t('order_detail.no_active_templates')}</p>
            )}
            {!metaLoading && templates.length > 0 && (
              <form className="space-y-2" onSubmit={handleAddSingleFromTemplate}>
                <div className="grid gap-2 md:grid-cols-3">
                  <label className="flex flex-col gap-1">
                    <span>{t('order_detail.template')}</span>
                    <select
                      value={selectedTemplateId}
                      onChange={(e) => loadTemplateDetails(e.target.value)}
                      className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                    >
                      <option value="">{t('order_detail.select_template')}</option>
                      {templates.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1">
                    <span>{t('order_detail.variant')}</span>
                    <select
                      value={singleVariantId}
                      onChange={(e) => setSingleVariantId(e.target.value)}
                      disabled={!selectedTemplate || selectedTemplate.variants.length === 0}
                      className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none disabled:opacity-60 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                    >
                      <option value="">{t('order_detail.default')}</option>
                      {selectedTemplate?.variants.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                          {v.widthMm && v.heightMm
                            ? ` (${v.widthMm}×${v.heightMm}mm)`
                            : ''}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1">
                    <span>{t('order_detail.material')}</span>
                    <select
                      value={singleMaterialId}
                      onChange={(e) => setSingleMaterialId(e.target.value)}
                      className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                    >
                      <option value="">{t('order_detail.use_default_from_template_variant')}</option>
                      {materials.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} {m.thicknessMm}mm {formatUnitType(m.unitType)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="grid gap-2 md:grid-cols-4">
                  <label className="flex flex-col gap-1">
                    <span>{t('order_detail.quantity')}</span>
                    <input
                      type="number"
                      min={1}
                      value={singleQuantity}
                      onChange={(e) => setSingleQuantity(e.target.value)}
                      className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                    />
                  </label>
                </div>
                {selectedTemplate && selectedTemplate.fields.length > 0 && (
                  <div className="space-y-1 border-t border-slate-800 pt-2">
                    <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                      {t('order_detail.personalization')}
                    </div>
                    <div className="grid gap-2 md:grid-cols-2">
                      {selectedTemplate.fields.map((field) => (
                        <label key={field.id} className="flex flex-col gap-1">
                          <span>
                            {field.label}{' '}
                            {field.required && (
                              <span className="text-amber-300">*</span>
                            )}{' '}
                            <span className="text-[10px] text-slate-500">
                              ({t(`order_detail.field_type.${field.fieldType.toLowerCase()}` as any)})
                            </span>
                          </span>
                          <input
                            type={field.fieldType === 'NUMBER' ? 'number' : 'text'}
                            value={singlePersonalization[field.key] ?? ''}
                            onChange={(e) =>
                              updateSinglePersonalization(field.key, e.target.value)
                            }
                            className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                {singlePreview.error && (
                  <p className="text-[11px] text-red-400">{singlePreview.error}</p>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePreviewSingleFromTemplate}
                    disabled={singlePreview.loading || !selectedTemplateId}
                    className="rounded-md border border-slate-700 px-3 py-1 text-[11px] text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {singlePreview.loading
                      ? t('order_detail.previewing')
                      : t('order_detail.preview_price')}
                  </button>
                  <button
                    type="submit"
                    disabled={singlePreview.loading || !selectedTemplateId}
                    className="rounded-md bg-emerald-500 px-3 py-1 text-[11px] font-medium text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {t('order_detail.add_item')}
                  </button>
                  {singlePreview.result && (
                    <div className="ml-auto text-right text-[11px] text-slate-200">
                      <div>
                        {t('order_detail.recommended')}: {(
                          singlePreview.result.price.recommendedPrice ?? 0
                        ).toFixed(2)}
                      </div>
                      {typeof singlePreview.result.price.totalCost === 'number' && (
                        <div className="text-slate-500">
                          {t('order_detail.cost')}: {singlePreview.result.price.totalCost.toFixed(2)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </form>
            )}
          </div>
          <div className="mt-3 rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-xs text-slate-200">
            <div className="mb-2 text-sm font-medium">{t('order_detail.add_item_from_template_product')}</div>
            {templateProducts.length === 0 && !metaLoading && (
              <p className="text-[11px] text-slate-400">
                {t('order_detail.no_template_products_defined')}{' '}
                <Link href="/template-products" className="text-sky-400 hover:underline">
                  {t('order_detail.template_products')}
                </Link>
                .
              </p>
            )}
            {templateProducts.length > 0 && (
              <form className="space-y-2" onSubmit={handleAddFromTemplateProduct}>
                {tpError && <p className="text-[11px] text-red-400">{tpError}</p>}
                <div className="grid gap-2 md:grid-cols-3">
                  <label className="flex flex-col gap-1">
                    <span>{t('order_detail.template_product')}</span>
                    <select
                      value={selectedTemplateProductId}
                      onChange={(e) => setSelectedTemplateProductId(e.target.value)}
                      className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                    >
                      <option value="">{t('order_detail.select_template_product')}</option>
                      {templateProducts.map((tp) => (
                        <option key={tp.id} value={tp.id}>
                          {tp.name}
                          {tp.template ? ` – ${tp.template.name}` : ''}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1">
                    <span>{t('order_detail.quantity')}</span>
                    <input
                      type="number"
                      min={1}
                      value={tpQuantity}
                      onChange={(e) => setTpQuantity(e.target.value)}
                      placeholder={t('order_detail.use_default')}
                      className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span>{t('order_detail.price_override')}</span>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={tpPriceOverride}
                      onChange={(e) => setTpPriceOverride(e.target.value)}
                      placeholder={t('order_detail.use_preset_or_engine')}
                      className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                    />
                  </label>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="submit"
                    disabled={tpLoading || !selectedTemplateProductId}
                    className="rounded-md bg-emerald-500 px-3 py-1 text-[11px] font-medium text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {tpLoading ? t('order_detail.adding') : t('order_detail.add_from_preset')}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {order.notes && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-xs text-slate-200">
          <div className="mb-1 font-medium">{t('order_detail.notes')}</div>
          <p>{order.notes}</p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
            <div className="mb-2 text-sm font-medium">{t('order_detail.items_title')}</div>
            {order.items.length === 0 && (
              <p className="text-xs text-slate-400">{t('order_detail.no_items_on_order')}</p>
            )}
            {order.items.length > 0 && (
              <div className="overflow-x-auto text-xs">
                <table className="min-w-full text-left">
                  <thead className="border-b border-slate-800 text-[11px] uppercase tracking-wide text-slate-400">
                    <tr>
                      <th className="px-2 py-1">{t('order_detail.table.title')}</th>
                      <th className="px-2 py-1">{t('order_detail.table.material')}</th>
                      <th className="px-2 py-1">{t('order_detail.table.qty')}</th>
                      <th className="px-2 py-1">{t('order_detail.table.size_mm')}</th>
                      <th className="px-2 py-1">{t('order_detail.table.est_min')}</th>
                      <th className="px-2 py-1">{t('order_detail.table.price')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((item) => {
                      const suggestionState = offcutSuggestions[item.id];
                      return (
                        <Fragment key={item.id}>
                          <tr className="border-t border-slate-800">
                            <td className="px-2 py-1 align-top">
                              <div className="font-medium">{item.title}</div>
                              {item.customizationText && (
                                <div className="text-[11px] text-slate-400">
                                  {item.customizationText}
                                </div>
                              )}
                              {((item.template && item.template.name) ||
                                item.templateProduct ||
                                item.personalizationJson) && (
                                <div className="mt-0.5 space-y-0.5 text-[11px] text-slate-500">
                                  {item.template && item.template.name && (
                                    <div>
                                      {t('order_detail.template_prefix')} {item.template.name}
                                      {item.templateVariant && item.templateVariant.name && (
                                        <span>
                                          {' '} - {item.templateVariant.name}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                  {item.templateProduct && item.templateProduct.name && (
                                    <div>
                                      {t('order_detail.from_preset_prefix')} {item.templateProduct.name}
                                    </div>
                                  )}
                                  {item.personalizationJson &&
                                    typeof item.personalizationJson === 'object' && (
                                      <div>
                                        {t('order_detail.personalization')}:{' '}
                                        {Object.entries(item.personalizationJson)
                                          .slice(0, 3)
                                          .map(([key, value], idx) => (
                                            <span key={key}>
                                              {idx > 0 && ', '}
                                              {key}=
                                              {typeof value === 'string'
                                                ? value
                                                : JSON.stringify(value)}
                                            </span>
                                          ))}
                                        {Object.keys(item.personalizationJson).length > 3 &&
                                          '…'}
                                      </div>
                                    )}
                                </div>
                              )}
                            </td>
                            <td className="px-2 py-1 align-top text-slate-300">
                              {item.material ? item.material.name : t('common.none')}
                            </td>
                            <td className="px-2 py-1 align-top text-slate-300">
                              {item.quantity}
                            </td>
                            <td className="px-2 py-1 align-top text-slate-300">
                              {item.widthMm && item.heightMm
                                ? `${item.widthMm} × ${item.heightMm}`
                                : t('common.none')}
                            </td>
                            <td className="px-2 py-1 align-top text-slate-300">
                              {item.estimatedMinutes ?? t('common.none')}
                            </td>
                            <td className="px-2 py-1 align-top text-slate-300">
                              {(() => {
                                const breakdown = item.priceSnapshotJson as any;
                                const state = pricingState[item.id] || {
                                  loading: false,
                                  error: null,
                                };

                                const recommended =
                                  breakdown &&
                                  typeof breakdown.recommendedPrice === 'number'
                                    ? breakdown.recommendedPrice
                                    : null;

                                return (
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between gap-2">
                                      <div>
                                        <div>
                                          {recommended !== null
                                            ? `${t('order_detail.recommended')}: ${recommended.toFixed(2)}`
                                            : t('common.none')}
                                        </div>
                                        {breakdown &&
                                          typeof breakdown.totalCost === 'number' && (
                                            <div className="text-[11px] text-slate-500">
                                              {t('order_detail.cost')}: {breakdown.totalCost.toFixed(2)}
                                            </div>
                                          )}
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => recalcItemPrice(item.id)}
                                        disabled={state.loading}
                                        className="rounded-md border border-slate-700 px-2 py-0.5 text-[11px] text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                                      >
                                        {state.loading
                                          ? t('order_detail.recalculating')
                                          : t('order_detail.recalculate')}
                                      </button>
                                    </div>
                                    {state.error && (
                                      <div className="text-[11px] text-red-400">
                                        {state.error}
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}
                            </td>
                          </tr>
                          <tr className="border-t border-slate-900 bg-slate-950/80">
                            <td className="px-2 pb-2 pt-1" colSpan={6}>
                              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                                <span>{t('order_detail.offcuts_title')}</span>
                                <button
                                  type="button"
                                  onClick={() => loadOffcutSuggestionsForItem(item.id)}
                                  className="rounded-md border border-slate-700 px-2 py-0.5 text-[11px] text-slate-200 hover:bg-slate-800"
                                >
                                  {t('order_detail.offcuts_view_suggestions')}
                                </button>
                              </div>
                              {suggestionState?.loading && (
                                <p className="mt-1 text-[11px] text-slate-400">
                                  {t('order_detail.offcuts_loading')}
                                </p>
                              )}
                              {suggestionState?.error && !suggestionState.loading && (
                                <p className="mt-1 text-[11px] text-red-400">
                                  {suggestionState.error}
                                </p>
                              )}
                              {suggestionState &&
                                !suggestionState.loading &&
                                !suggestionState.error &&
                                suggestionState.items.length === 0 && (
                                  <p className="mt-1 text-[11px] text-slate-500">
                                    {t('order_detail.offcuts_none_found')}
                                  </p>
                                )}
                              {suggestionState &&
                                !suggestionState.loading &&
                                !suggestionState.error &&
                                suggestionState.items.length > 0 && (
                                  <ul className="mt-2 space-y-1 text-[11px]">
                                    {suggestionState.items.slice(0, 5).map((s) => {
                                      const sizeLabel = (() => {
                                        if (s.widthMm && s.heightMm) {
                                          return `${s.widthMm} × ${s.heightMm} mm`;
                                        }
                                        if (s.estimatedAreaMm2) {
                                          return `~${(s.estimatedAreaMm2 / 1_000_000).toFixed(
                                            2,
                                          )} m²`;
                                        }
                                        return t('order_detail.offcuts_approx_dimensions');
                                      })();
                                      const reserveKey = `reserve:${item.id}:${s.offcutId}`;
                                      const fullKey = `usefull:${item.id}:${s.offcutId}`;
                                      const partialKey = `usepartial:${item.id}:${s.offcutId}`;
                                      return (
                                        <li
                                          key={s.offcutId}
                                          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-900/70 px-2 py-1"
                                        >
                                          <div className="space-y-0.5 text-slate-200">
                                            <div>
                                              {item.material?.name || t('order_detail.material_fallback')} · {s.thicknessMm} mm
                                            </div>
                                            <div className="text-slate-400">
                                              {sizeLabel}
                                              {s.locationLabel &&
                                                ` · ${t('order_detail.location_prefix')} ${s.locationLabel}`}
                                            </div>
                                            <div className="text-slate-400">{s.fitReason}</div>
                                          </div>
                                          <div className="flex flex-wrap gap-1">
                                            <button
                                              type="button"
                                              onClick={() => reserveOffcutForItem(item.id, s.offcutId)}
                                              disabled={offcutActionKey === reserveKey}
                                              className="rounded-md border border-slate-700 px-2 py-0.5 text-[10px] text-slate-200 hover:bg-slate-800 disabled:opacity-60"
                                            >
                                              {t('order_detail.reserve')}
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => markFullOffcutUsedForItem(item.id, s.offcutId)}
                                              disabled={offcutActionKey === fullKey}
                                              className="rounded-md border border-emerald-500 px-2 py-0.5 text-[10px] text-emerald-300 hover:bg-emerald-900/40 disabled:opacity-60"
                                            >
                                              {t('order_detail.use_full')}
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => logPartialOffcutUsageForItem(item.id, s.offcutId)}
                                              disabled={offcutActionKey === partialKey}
                                              className="rounded-md border border-sky-500 px-2 py-0.5 text-[10px] text-sky-300 hover:bg-sky-900/40 disabled:opacity-60"
                                            >
                                              {t('order_detail.use_partial')}
                                            </button>
                                          </div>
                                        </li>
                                      );
                                    })}
                                  </ul>
                                )}
                            </td>
                          </tr>
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
            <div className="mb-2 text-sm font-medium">{t('order_detail.files')}</div>
            {order.files.length === 0 && (
              <p className="text-xs text-slate-400">{t('order_detail.no_files_uploaded')}</p>
            )}
            {order.files.length > 0 && (
              <ul className="space-y-1 text-xs">
                {order.files.map((file) => (
                  <li key={file.id} className="flex items-center justify-between gap-2">
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sky-400 hover:underline"
                    >
                      {file.url.split('/').pop()}
                    </a>
                    <span className="text-[11px] text-slate-500">
                      {Math.round(file.size / 1024)} {t('common.unit_kb')}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-xs text-slate-200">
            <div className="mb-2 text-sm font-medium">{t('order_detail.bulk_add_from_template')}</div>
            {!selectedTemplate && (
              <p className="text-[11px] text-slate-400">
                {t('order_detail.bulk_select_template_notice')}
              </p>
            )}
            {selectedTemplate && (
              <form className="space-y-2" onSubmit={handleAddBulkFromTemplate}>
                <div className="grid gap-2 md:grid-cols-2">
                  <label className="flex flex-col gap-1">
                    <span>{t('order_detail.variant')}</span>
                    <select
                      value={bulkVariantId}
                      onChange={(e) => setBulkVariantId(e.target.value)}
                      disabled={selectedTemplate.variants.length === 0}
                      className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none disabled:opacity-60 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                    >
                      <option value="">{t('order_detail.default')}</option>
                      {selectedTemplate.variants.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1">
                    <span>{t('order_detail.material')}</span>
                    <select
                      value={bulkMaterialId}
                      onChange={(e) => setBulkMaterialId(e.target.value)}
                      className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                    >
                      <option value="">{t('order_detail.use_default_from_template_variant')}</option>
                      {materials.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} {m.thicknessMm}mm {formatUnitType(m.unitType)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 md:col-span-2">
                    <span>{t('order_detail.name_field')}</span>
                    <select
                      value={bulkNameFieldKey}
                      onChange={(e) => setBulkNameFieldKey(e.target.value)}
                      className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                    >
                      <option value="">{t('order_detail.select_field_to_fill')}</option>
                      {selectedTemplate.fields.map((f) => (
                        <option key={f.id} value={f.key}>
                          {f.label} ({f.key})
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <label className="flex flex-col gap-1">
                  <span>{t('order_detail.lines_label')}</span>
                  <textarea
                    rows={5}
                    value={bulkLines}
                    onChange={(e) => setBulkLines(e.target.value)}
                    className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                    placeholder={t('order_detail.lines_placeholder')}
                  />
                </label>
                {bulkPreview.error && (
                  <p className="text-[11px] text-red-400">{bulkPreview.error}</p>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePreviewBulkFromTemplate}
                    disabled={bulkPreview.loading}
                    className="rounded-md border border-slate-700 px-3 py-1 text-[11px] text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {bulkPreview.loading ? t('order_detail.previewing') : t('order_detail.preview_bulk')}
                  </button>
                  <button
                    type="submit"
                    disabled={bulkPreview.loading}
                    className="rounded-md bg-emerald-500 px-3 py-1 text-[11px] font-medium text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {t('order_detail.add_items')}
                  </button>
                </div>
                {bulkPreview.result && bulkPreview.result.items.length > 0 && (
                  <div className="mt-2 space-y-1 rounded-lg border border-slate-800 bg-slate-900/60 p-2 text-[11px]">
                    <div className="mb-1 font-medium text-slate-200">{t('order_detail.preview_items')}</div>
                    <ul className="space-y-1">
                      {bulkPreview.result.items.map((it, idx) => (
                        <li key={idx} className="flex items-center justify-between gap-2">
                          <span className="text-slate-200">
                            {it.title} × {it.quantity}
                          </span>
                          <span className="text-slate-300">
                            {(it.price.recommendedPrice ?? 0).toFixed(2)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </form>
            )}
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
            <div className="mb-2 text-sm font-medium">{t('order_detail.activity_log')}</div>
            {order.activityLog.length === 0 && (
              <p className="text-xs text-slate-400">{t('order_detail.no_activity_yet')}</p>
            )}
            {order.activityLog.length > 0 && (
              <ul className="space-y-2 text-xs">
                {order.activityLog.map((entry) => (
                  <li key={entry.id} className="border-b border-slate-800 pb-1 last:border-b-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{t(`order_detail.activity_field.${entry.field.toLowerCase()}` as any)}</span>
                      <span className="text-[11px] text-slate-500">
                        {new Date(entry.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-300">
                      {entry.newValue}
                    </div>
                    {entry.user && (
                      <div className="text-[11px] text-slate-500">
                        {t('order_detail.by')} {entry.user.name || entry.user.email}
                      </div>
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
