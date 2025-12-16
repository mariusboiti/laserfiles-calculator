'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiClient } from '../../../../lib/api-client';
import { useT } from '../../i18n';

interface CustomerOption {
  id: string;
  name: string;
  email: string | null;
}

interface CustomersListResponse {
  data: CustomerOption[];
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
}

interface CreateOrderResponse {
  id: string;
}

type OrderPriority = 'NORMAL' | 'URGENT';

type ItemForm = {
  title: string;
  materialId: string;
  quantity: string;
  widthMm: string;
  heightMm: string;
  customizationText: string;
  estimatedMinutes: string;
  pricePreview?: {
    recommendedPrice: number;
    totalCost: number;
    materialCost: number;
    machineCost: number;
    laborCost: number;
    marginPercent: number;
  } | null;
  pricePreviewError?: string | null;
  pricePreviewLoading?: boolean;
};

const emptyItem: ItemForm = {
  title: '',
  materialId: '',
  quantity: '1',
  widthMm: '',
  heightMm: '',
  customizationText: '',
  estimatedMinutes: '',
  pricePreview: null,
  pricePreviewError: null,
  pricePreviewLoading: false,
};

export default function NewOrderPage() {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromQuoteId = searchParams.get('fromQuote');

  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [materials, setMaterials] = useState<MaterialOption[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [metaError, setMetaError] = useState<string | null>(null);

  const [customerId, setCustomerId] = useState('');
  const [priority, setPriority] = useState<OrderPriority>('NORMAL');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<ItemForm[]>([emptyItem]);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [prefillFromQuoteDone, setPrefillFromQuoteDone] = useState(false);

  useEffect(() => {
    async function loadMeta() {
      setLoadingMeta(true);
      setMetaError(null);
      try {
        const [customersRes, materialsRes] = await Promise.all([
          apiClient.get<CustomersListResponse>('/customers'),
          apiClient.get<MaterialsListResponse>('/materials'),
        ]);
        setCustomers(customersRes.data.data);
        setMaterials(materialsRes.data.data);
        if (customersRes.data.data.length > 0) {
          setCustomerId(customersRes.data.data[0].id);
        }
      } catch (err: any) {
        const message = err?.response?.data?.message || t('new_order.failed_to_load_meta');
        setMetaError(Array.isArray(message) ? message.join(', ') : String(message));
      } finally {
        setLoadingMeta(false);
      }
    }

    loadMeta();
  }, []);

  useEffect(() => {
    if (!fromQuoteId || loadingMeta || metaError || prefillFromQuoteDone) return;

    async function prefillFromQuote() {
      try {
        const res = await apiClient.get<any>(`/quotes/${fromQuoteId}`);
        const quote = res.data;
        const data = quote.dataJson || {};
        const pricingInput = data.pricingInput ?? data.input ?? null;
        const material = data.material ?? null;

        if (quote.customerId && customers.some((c) => c.id === quote.customerId)) {
          setCustomerId(quote.customerId);
        }

        if (
          pricingInput &&
          material &&
          materials.some((m) => m.id === material.id)
        ) {
          setItems([
            {
              ...emptyItem,
              title: `${t('new_order.from_quote')} ${quote.id.slice(0, 8)}...`,
              materialId: material.id,
              quantity: String(pricingInput.quantity ?? 1),
              widthMm:
                pricingInput.widthMm != null
                  ? String(pricingInput.widthMm)
                  : '',
              heightMm:
                pricingInput.heightMm != null
                  ? String(pricingInput.heightMm)
                  : '',
              customizationText: '',
              estimatedMinutes:
                pricingInput.machineMinutes != null
                  ? String(pricingInput.machineMinutes)
                  : '',
              pricePreview: null,
              pricePreviewError: null,
              pricePreviewLoading: false,
            },
          ]);
        }
      } catch {
        // ignore; user can still fill manually
      } finally {
        setPrefillFromQuoteDone(true);
      }
    }

    prefillFromQuote();
  }, [
    fromQuoteId,
    loadingMeta,
    metaError,
    prefillFromQuoteDone,
    customers,
    materials,
  ]);

  function formatUnitType(value: string) {
    const upper = String(value).toUpperCase();
    if (upper === 'SHEET') return t('unit.sheet');
    if (upper === 'M2') return t('unit.m2');
    return String(value);
  }

  function updateItem(index: number, patch: Partial<ItemForm>) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function addItem() {
    setItems((prev) => [...prev, emptyItem]);
  }

  function removeItem(index: number) {
    setItems((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaveError(null);

    if (!customerId) {
      setSaveError(t('new_order.validation.select_customer'));
      return;
    }

    const preparedItems = items
      .map((item) => ({
        ...item,
        title: item.title.trim(),
        quantity: Number(item.quantity),
        widthMm: item.widthMm ? Number(item.widthMm) : undefined,
        heightMm: item.heightMm ? Number(item.heightMm) : undefined,
        estimatedMinutes: item.estimatedMinutes ? Number(item.estimatedMinutes) : undefined,
      }))
      .filter((item) => item.title && item.quantity && item.quantity > 0);

    if (preparedItems.length === 0) {
      setSaveError(t('new_order.validation.define_item'));
      return;
    }

    setSaving(true);
    try {
      const body = {
        customerId,
        notes: notes.trim() || undefined,
        priority,
        items: preparedItems.map((item) => ({
          title: item.title,
          materialId: item.materialId || undefined,
          quantity: item.quantity,
          widthMm: item.widthMm,
          heightMm: item.heightMm,
          customizationText: item.customizationText.trim() || undefined,
          estimatedMinutes: item.estimatedMinutes,
        })),
      };

      const res = await apiClient.post<CreateOrderResponse>('/orders', body);
      router.push(`/orders/${res.data.id}`);
    } catch (err: any) {
      const message = err?.response?.data?.message || t('new_order.failed_to_create');
      setSaveError(Array.isArray(message) ? message.join(', ') : String(message));
    } finally {
      setSaving(false);
    }
  }

  async function previewItemPrice(index: number) {
    const item = items[index];
    if (!item) return;

    const quantity = Number(item.quantity);
    const widthMm = Number(item.widthMm);
    const heightMm = Number(item.heightMm);

    if (!item.materialId || !quantity || quantity <= 0 || !widthMm || widthMm <= 0 || !heightMm || heightMm <= 0) {
      updateItem(index, {
        pricePreviewError: t('new_order.validation.item_pricing_requirements'),
        pricePreviewLoading: false,
      });
      return;
    }

    updateItem(index, {
      pricePreviewLoading: true,
      pricePreviewError: null,
    });

    try {
      const body = {
        materialId: item.materialId,
        quantity,
        widthMm,
        heightMm,
      };

      const res = await apiClient.post('/pricing/preview', body);
      const breakdown = (res.data as any).breakdown;

      if (!breakdown || typeof breakdown.recommendedPrice !== 'number') {
        updateItem(index, {
          pricePreviewError: t('new_order.validation.pricing_invalid_result'),
          pricePreviewLoading: false,
        });
        return;
      }

      updateItem(index, {
        pricePreviewLoading: false,
        pricePreview: {
          recommendedPrice: Number(breakdown.recommendedPrice) || 0,
          totalCost: Number(breakdown.totalCost) || 0,
          materialCost: Number(breakdown.materialCost) || 0,
          machineCost: Number(breakdown.machineCost) || 0,
          laborCost: Number(breakdown.laborCost) || 0,
          marginPercent: Number(breakdown.marginPercent) || 0,
        },
      });
    } catch (err: any) {
      const message = err?.response?.data?.message || t('new_order.failed_to_preview_price');
      updateItem(index, {
        pricePreviewError: Array.isArray(message) ? message.join(', ') : String(message),
        pricePreviewLoading: false,
      });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Link href="/orders" className="text-sky-400 hover:underline">
              {t('new_order.breadcrumb_orders')}
            </Link>
            <span>/</span>
            <span>{t('new_order.breadcrumb_new')}</span>
          </div>
          <h1 className="mt-1 text-xl font-semibold tracking-tight">{t('new_order.title')}</h1>
          <p className="text-xs text-slate-400">
            {t('new_order.subtitle')}
          </p>
        </div>
      </div>

      {metaError && (
        <p className="text-sm text-red-400">{metaError}</p>
      )}

      {loadingMeta && !metaError && (
        <p className="text-sm text-slate-400">{t('new_order.loading_meta')}</p>
      )}

      {!loadingMeta && !metaError && customers.length === 0 && (
        <p className="text-sm text-slate-400">
          {t('new_order.no_customers_yet')}
        </p>
      )}

      {!loadingMeta && !metaError && customers.length > 0 && (
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-200"
        >
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                {t('new_order.customer_meta')}
              </div>
              <label className="flex flex-col gap-1">
                <span>{t('new_order.customer')}</span>
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.email ? `(${c.email})` : ''}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span>{t('new_order.priority')}</span>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as OrderPriority)}
                  className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                >
                  <option value="NORMAL">{t('new_order.priority.normal')}</option>
                  <option value="URGENT">{t('new_order.priority.urgent')}</option>
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span>{t('new_order.notes')}</span>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  placeholder={t('new_order.notes_placeholder')}
                />
              </label>
            </div>

            <div className="space-y-2">
              <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                {t('new_order.items')}
              </div>
              <p className="text-[11px] text-slate-400">
                {t('new_order.items_subtitle')}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {items.map((item, index) => (
              <div
                key={index}
                className="rounded-lg border border-slate-800 bg-slate-900/80 p-3 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                    {t('new_order.item')} {index + 1}
                  </div>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="text-[11px] text-red-300 hover:text-red-200"
                    >
                      {t('new_order.remove')}
                    </button>
                  )}
                </div>
                <div className="grid gap-2 md:grid-cols-3">
                  <label className="flex flex-col gap-1 md:col-span-2">
                    <span>{t('new_order.item_title')}</span>
                    <input
                      type="text"
                      value={item.title}
                      onChange={(e) => updateItem(index, { title: e.target.value })}
                      className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span>{t('new_order.item_quantity')}</span>
                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => updateItem(index, { quantity: e.target.value })}
                      className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                    />
                  </label>
                </div>
                <div className="grid gap-2 md:grid-cols-3">
                  <label className="flex flex-col gap-1">
                    <span>{t('new_order.item_material')}</span>
                    <select
                      value={item.materialId}
                      onChange={(e) => updateItem(index, { materialId: e.target.value })}
                      className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                    >
                      <option value="">{t('common.none')}</option>
                      {materials.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} {m.thicknessMm}mm {formatUnitType(m.unitType)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1">
                    <span>{t('pricing.width_mm')}</span>
                    <input
                      type="number"
                      min={1}
                      value={item.widthMm}
                      onChange={(e) => updateItem(index, { widthMm: e.target.value })}
                      className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span>{t('pricing.height_mm')}</span>
                    <input
                      type="number"
                      min={1}
                      value={item.heightMm}
                      onChange={(e) => updateItem(index, { heightMm: e.target.value })}
                      className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                    />
                  </label>
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  <label className="flex flex-col gap-1">
                    <span>{t('new_order.item_customization')}</span>
                    <input
                      type="text"
                      value={item.customizationText}
                      onChange={(e) => updateItem(index, { customizationText: e.target.value })}
                      className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span>{t('new_order.item_estimated_minutes')}</span>
                    <input
                      type="number"
                      min={1}
                      value={item.estimatedMinutes}
                      onChange={(e) => updateItem(index, { estimatedMinutes: e.target.value })}
                      className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                    />
                  </label>
                </div>
                <div className="mt-2 border-t border-slate-800 pt-2 text-[11px]">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => previewItemPrice(index)}
                      disabled={item.pricePreviewLoading}
                      className="rounded-md border border-slate-700 px-2 py-0.5 text-[11px] text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {item.pricePreviewLoading
                        ? t('new_order.calculating_price')
                        : t('new_order.preview_price')}
                    </button>
                    {item.pricePreview && (
                      <div className="text-right text-[11px] text-slate-200">
                        <div>
                          {t('new_order.recommended')}: {item.pricePreview.recommendedPrice.toFixed(2)}
                        </div>
                        <div className="text-slate-500">
                          {t('new_order.cost')}: {item.pricePreview.totalCost.toFixed(2)}
                        </div>
                      </div>
                    )}
                  </div>
                  {item.pricePreviewError && (
                    <div className="mt-1 text-[11px] text-red-400">
                      {item.pricePreviewError}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={addItem}
              className="rounded-md border border-slate-700 px-3 py-1 text-[11px] text-slate-200 hover:bg-slate-800"
            >
              {t('new_order.add_another_item')}
            </button>
          </div>

          {saveError && <p className="text-xs text-red-400">{saveError}</p>}

          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-sky-500 px-3 py-1 text-xs font-medium text-white hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? t('new_order.creating') : t('new_order.create')}
          </button>
        </form>
      )}
    </div>
  );
}
