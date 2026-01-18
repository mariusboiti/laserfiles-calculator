'use client';

import { FormEvent, useEffect, useState } from 'react';
import { apiClient } from '../../../lib/api-client';
import { useT } from '../i18n';

interface MaterialListItem {
  id: string;
  name: string;
  category: string;
  thicknessMm: number;
  unitType: 'SHEET' | 'M2';
  costPerSheet: number | null;
  costPerM2: number | null;
  sheetWidthMm: number | null;
  sheetHeightMm: number | null;
}

interface MaterialsListResponse {
  data: MaterialListItem[];
  total: number;
  page: number;
  pageSize: number;
}

interface CustomerOption {
  id: string;
  name: string;
  email: string | null;
}

interface CustomersListResponse {
  data: CustomerOption[];
  total: number;
}

interface PriceBreakdownAddOn {
  id: string;
  name: string;
  cost: number;
}

interface PriceBreakdown {
  materialCost: number;
  machineCost: number;
  laborCost: number;
  addOns: PriceBreakdownAddOn[];
  marginPercent: number;
  totalCost: number;
  recommendedPrice: number;
}

interface PricePreviewResult {
  input: any;
  breakdown: PriceBreakdown;
}

export default function PricingPage() {
  const t = useT();
  const [materials, setMaterials] = useState<MaterialListItem[]>([]);
  const [materialsLoading, setMaterialsLoading] = useState(true);
  const [materialsError, setMaterialsError] = useState<string | null>(null);

  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [customersError, setCustomersError] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState('');

  const [materialId, setMaterialId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [widthMm, setWidthMm] = useState(100);
  const [heightMm, setHeightMm] = useState(100);
  const [wastePercent, setWastePercent] = useState(15);
  const [machineMinutes, setMachineMinutes] = useState(0);
  const [machineHourlyCost, setMachineHourlyCost] = useState(0);
  const [targetMarginPercent, setTargetMarginPercent] = useState(40);

  const [preview, setPreview] = useState<PricePreviewResult | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [savingQuote, setSavingQuote] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    async function loadMaterials() {
      setMaterialsLoading(true);
      setMaterialsError(null);
      try {
        const res = await apiClient.get<MaterialsListResponse>('/materials');
        setMaterials(res.data.data);
        if (res.data.data.length > 0 && !materialId) {
          setMaterialId(res.data.data[0].id);
        }
      } catch (err: any) {
        const message = err?.response?.data?.message || t('materials.failed_to_load');
        setMaterialsError(Array.isArray(message) ? message.join(', ') : String(message));
      } finally {
        setMaterialsLoading(false);
      }
    }

    loadMaterials();
  }, [materialId]);

  useEffect(() => {
    async function loadCustomers() {
      setCustomersLoading(true);
      setCustomersError(null);
      try {
        const res = await apiClient.get<CustomersListResponse>('/customers');
        setCustomers(res.data.data);
      } catch (err: any) {
        const message = err?.response?.data?.message || t('customers.failed_to_load');
        setCustomersError(
          Array.isArray(message) ? message.join(', ') : String(message),
        );
      } finally {
        setCustomersLoading(false);
      }
    }

    loadCustomers();
  }, []);

  async function handleCalculate(e: FormEvent) {
    e.preventDefault();
    if (!materialId) {
      setPreviewError(t('pricing.validation.select_material'));
      return;
    }

    setPreviewLoading(true);
    setPreviewError(null);
    setPreview(null);
    setSaveMessage(null);
    setSaveError(null);

    try {
      const body = {
        materialId,
        quantity,
        widthMm,
        heightMm,
        wastePercent,
        machineMinutes,
        machineHourlyCost,
        targetMarginPercent,
        addOnIds: [] as string[],
      };

      const res = await apiClient.post<PricePreviewResult>('/pricing/preview', body);
      setPreview(res.data);
    } catch (err: any) {
      const message = err?.response?.data?.message || t('pricing.failed_to_calculate');
      setPreviewError(Array.isArray(message) ? message.join(', ') : String(message));
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleSaveQuote() {
    if (!preview) {
      setSaveError(t('pricing.validation.nothing_to_save'));
      return;
    }

    setSavingQuote(true);
    setSaveMessage(null);
    setSaveError(null);

    try {
      const material = materials.find((m) => m.id === materialId) || null;
      const payload: any = {
        data: {
          pricingInput: preview.input,
          breakdown: preview.breakdown,
          material,
        },
      };

      if (customerId) {
        payload.customerId = customerId;
      }

      const res = await apiClient.post<{ id: string }>('/quotes', payload);
      setSaveMessage(
        t('pricing.quote_saved_prefix') +
          ' ' +
          t('pricing.quote_saved_id_suffix')
            .replace('{0}', String(res.data.id.slice(0, 8)))
            .replace('{1}', '...'),
      );
    } catch (err: any) {
      const message = err?.response?.data?.message || t('pricing.failed_to_save_quote');
      setSaveError(Array.isArray(message) ? message.join(', ') : String(message));
    } finally {
      setSavingQuote(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{t('pricing.title')}</h1>
          <p className="mt-1 text-xs text-slate-400">
            {t('pricing.subtitle')}
          </p>
        </div>
      </div>

      {materialsLoading && <p className="text-sm text-slate-400">{t('pricing.loading_materials')}</p>}
      {materialsError && !materialsLoading && (
        <p className="text-sm text-red-400">{materialsError}</p>
      )}

      {!materialsLoading && !materialsError && materials.length === 0 && (
        <p className="text-sm text-slate-400">{t('pricing.no_materials_available')}</p>
      )}

      {materials.length > 0 && (
        <div className="grid gap-4 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <form
            onSubmit={handleCalculate}
            className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-200"
          >
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                  {t('pricing.job_parameters')}
                </div>
                <label className="flex flex-col gap-1">
                  <span>{t('pricing.material')}</span>
                  <select
                    value={materialId}
                    data-tour="pricing-material-select"
                    onChange={(e) => setMaterialId(e.target.value)}
                    className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  >
                    {materials.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.thicknessMm}mm {m.category})
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span>{t('pricing.customer_optional')}</span>
                  <select
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  >
                    <option value="">{t('common.none')}</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.email ? `(${c.email})` : ''}
                      </option>
                    ))}
                  </select>
                  {customersLoading && (
                    <span className="mt-1 text-[11px] text-slate-500">
                      {t('pricing.loading_customers')}
                    </span>
                  )}
                  {customersError && (
                    <span className="mt-1 text-[11px] text-red-400">
                      {customersError}
                    </span>
                  )}
                </label>
                <label className="flex flex-col gap-1">
                  <span>{t('pricing.quantity')}</span>
                  <input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
                    className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  />
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex flex-col gap-1">
                    <span>{t('pricing.width_mm')}</span>
                    <input
                      type="number"
                      min={1}
                      value={widthMm}
                      onChange={(e) => setWidthMm(Math.max(1, Number(e.target.value) || 1))}
                      className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span>{t('pricing.height_mm')}</span>
                    <input
                      type="number"
                      min={1}
                      value={heightMm}
                      onChange={(e) => setHeightMm(Math.max(1, Number(e.target.value) || 1))}
                      className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                    />
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                  {t('pricing.costs_margin')}
                </div>
                <label className="flex flex-col gap-1">
                  <span>{t('pricing.waste_percent')}</span>
                  <input
                    type="number"
                    min={0}
                    value={wastePercent}
                    onChange={(e) => setWastePercent(Math.max(0, Number(e.target.value) || 0))}
                    className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  />
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex flex-col gap-1">
                    <span>{t('pricing.machine_minutes')}</span>
                    <input
                      type="number"
                      min={0}
                      value={machineMinutes}
                      onChange={(e) => setMachineMinutes(Math.max(0, Number(e.target.value) || 0))}
                      className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span>{t('pricing.machine_hourly_cost')}</span>
                    <input
                      type="number"
                      min={0}
                      value={machineHourlyCost}
                      onChange={(e) => setMachineHourlyCost(Math.max(0, Number(e.target.value) || 0))}
                      className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                    />
                  </label>
                </div>
                <label className="flex flex-col gap-1">
                  <span>{t('pricing.target_margin_percent')}</span>
                  <input
                    type="number"
                    min={0}
                    value={targetMarginPercent}
                    onChange={(e) =>
                      setTargetMarginPercent(Math.max(0, Number(e.target.value) || 0))
                    }
                    className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  />
                </label>
              </div>
            </div>

            {previewError && (
              <p className="text-xs text-red-400">{previewError}</p>
            )}

            <button
              type="submit"
              disabled={previewLoading}
              data-tour="pricing-calc-button"
              className="rounded-md bg-sky-500 px-3 py-1 text-xs font-medium text-white hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {previewLoading ? t('pricing.calculating') : t('pricing.calculate_price')}
            </button>
          </form>

          <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-200">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                  {t('pricing.breakdown')}
                </div>
                <p className="mt-1 text-[11px] text-slate-400">
                  {t('pricing.breakdown_subtitle')}
                </p>
              </div>
              <button
                type="button"
                onClick={handleSaveQuote}
                disabled={!preview || savingQuote}
                data-tour="pricing-save-quote"
                className="rounded-md bg-emerald-500 px-3 py-1 text-[11px] font-medium text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingQuote ? t('pricing.saving') : t('pricing.save_quote')}
              </button>
            </div>

            {!preview && !previewLoading && (
              <p className="text-xs text-slate-400">{t('pricing.fill_form_to_breakdown')}</p>
            )}

            {preview && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-xs md:grid-cols-3">
                  <div className="space-y-1 rounded-lg border border-slate-800 bg-slate-900/80 p-2">
                    <div className="text-[11px] text-slate-400">{t('pricing.material_cost')}</div>
                    <div className="text-sm font-semibold text-slate-50">
                      {preview.breakdown.materialCost.toFixed(2)}
                    </div>
                  </div>
                  <div className="space-y-1 rounded-lg border border-slate-800 bg-slate-900/80 p-2">
                    <div className="text-[11px] text-slate-400">{t('pricing.machine_cost')}</div>
                    <div className="text-sm font-semibold text-slate-50">
                      {preview.breakdown.machineCost.toFixed(2)}
                    </div>
                  </div>
                  <div className="space-y-1 rounded-lg border border-slate-800 bg-slate-900/80 p-2">
                    <div className="text-[11px] text-slate-400">{t('pricing.labor_addons')}</div>
                    <div className="text-sm font-semibold text-slate-50">
                      {preview.breakdown.laborCost.toFixed(2)}
                    </div>
                  </div>
                  <div className="space-y-1 rounded-lg border border-slate-800 bg-slate-900/80 p-2 md:col-span-2">
                    <div className="text-[11px] text-slate-400">{t('pricing.total_cost')}</div>
                    <div className="text-sm font-semibold text-slate-50">
                      {preview.breakdown.totalCost.toFixed(2)}
                    </div>
                  </div>
                  <div className="space-y-1 rounded-lg border border-slate-800 bg-slate-900/80 p-2">
                    <div className="text-[11px] text-slate-400">{t('pricing.margin')}</div>
                    <div className="text-sm font-semibold text-slate-50">
                      {preview.breakdown.marginPercent.toFixed(1)}%
                    </div>
                  </div>
                </div>

                <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-900/80 p-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <div>
                      <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                        {t('pricing.recommended_price')}
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {t('pricing.based_on_total_cost')}
                      </p>
                    </div>
                    <div className="text-lg font-semibold text-emerald-400">
                      {preview.breakdown.recommendedPrice.toFixed(2)}
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                    {t('pricing.addons_applied')}
                  </div>
                  {preview.breakdown.addOns.length === 0 ? (
                    <p className="text-[11px] text-slate-400">{t('pricing.no_addons_applied')}</p>
                  ) : (
                    <ul className="space-y-1 text-[11px]">
                      {preview.breakdown.addOns.map((a) => (
                        <li key={a.id} className="flex items-center justify-between gap-2">
                          <span className="text-slate-300">{a.name}</span>
                          <span className="text-slate-100">{a.cost.toFixed(2)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}

            {saveMessage && <p className="text-[11px] text-emerald-400">{saveMessage}</p>}
            {saveError && <p className="text-[11px] text-red-400">{saveError}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
