'use client';

import { FormEvent, useEffect, useState } from 'react';
import { apiClient } from '../../../../lib/api-client';

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

interface UsageResponse {
  allowed: boolean;
  remaining: number;
  limit: number;
}

export default function PriceCalculatorPage() {
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

  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [usageInfo, setUsageInfo] = useState<UsageResponse | null>(null);
  const [exporting, setExporting] = useState(false);

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
        const message = err?.response?.data?.message || 'Failed to load materials';
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
        const message = err?.response?.data?.message || 'Failed to load customers';
        setCustomersError(Array.isArray(message) ? message.join(', ') : String(message));
      } finally {
        setCustomersLoading(false);
      }
    }

    loadCustomers();
  }, []);

  async function handleCalculate(e: FormEvent) {
    e.preventDefault();
    if (!materialId) {
      setPreviewError('Please select a material');
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
      const message = err?.response?.data?.message || 'Failed to calculate price';
      setPreviewError(Array.isArray(message) ? message.join(', ') : String(message));
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleSaveQuote() {
    if (!preview) {
      setSaveError('Nothing to save. Calculate a price first.');
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
      setSaveMessage(`Quote saved successfully (ID: ${res.data.id.slice(0, 8)}...)`);
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Failed to save quote';
      setSaveError(Array.isArray(message) ? message.join(', ') : String(message));
    } finally {
      setSavingQuote(false);
    }
  }

  async function handleExport() {
    if (!preview) {
      return;
    }

    setExporting(true);

    try {
      // Call POST /usage/export with toolKey
      const res = await apiClient.post<UsageResponse>('/usage/export', {
        toolKey: 'price-calculator',
      });

      setUsageInfo(res.data);

      // Check if allowed
      if (!res.data.allowed) {
        // Show upgrade modal if blocked
        setShowUpgradeModal(true);
        setExporting(false);
        return;
      }

      // Proceed with export if allowed
      const material = materials.find((m) => m.id === materialId);
      const csvContent = [
        ['Price Calculator Export'],
        [''],
        ['Material', material?.name || 'N/A'],
        ['Thickness', `${material?.thicknessMm || 0}mm`],
        ['Quantity', quantity.toString()],
        ['Dimensions', `${widthMm}mm x ${heightMm}mm`],
        [''],
        ['Breakdown'],
        ['Material Cost', preview.breakdown.materialCost.toFixed(2)],
        ['Machine Cost', preview.breakdown.machineCost.toFixed(2)],
        ['Labor Cost', preview.breakdown.laborCost.toFixed(2)],
        ['Total Cost', preview.breakdown.totalCost.toFixed(2)],
        ['Margin', `${preview.breakdown.marginPercent.toFixed(1)}%`],
        ['Recommended Price', preview.breakdown.recommendedPrice.toFixed(2)],
      ]
        .map((row) => row.join(','))
        .join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `price-calculation-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Failed to export';
      alert(Array.isArray(message) ? message.join(', ') : String(message));
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Price Calculator</h1>
          <p className="mt-1 text-xs text-slate-400">
            Calculate accurate pricing for laser cutting projects
          </p>
        </div>
        {usageInfo && usageInfo.allowed && (
          <div className="text-xs text-slate-400">
            {usageInfo.limit > 100 ? (
              <span className="text-emerald-400">Unlimited exports</span>
            ) : (
              <span>
                {usageInfo.remaining}/{usageInfo.limit} exports remaining today
              </span>
            )}
          </div>
        )}
      </div>

      {materialsLoading && <p className="text-sm text-slate-400">Loading materials...</p>}
      {materialsError && !materialsLoading && <p className="text-sm text-red-400">{materialsError}</p>}

      {!materialsLoading && !materialsError && materials.length === 0 && (
        <p className="text-sm text-slate-400">No materials available. Please add materials first.</p>
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
                  Job Parameters
                </div>
                <label className="flex flex-col gap-1">
                  <span>Material</span>
                  <select
                    value={materialId}
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
                  <span>Customer (optional)</span>
                  <select
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  >
                    <option value="">(none)</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.email ? `(${c.email})` : ''}
                      </option>
                    ))}
                  </select>
                  {customersLoading && (
                    <span className="mt-1 text-[11px] text-slate-500">Loading customers...</span>
                  )}
                  {customersError && (
                    <span className="mt-1 text-[11px] text-red-400">{customersError}</span>
                  )}
                </label>
                <label className="flex flex-col gap-1">
                  <span>Quantity</span>
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
                    <span>Width (mm)</span>
                    <input
                      type="number"
                      min={1}
                      value={widthMm}
                      onChange={(e) => setWidthMm(Math.max(1, Number(e.target.value) || 1))}
                      className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span>Height (mm)</span>
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
                  Costs & Margin
                </div>
                <label className="flex flex-col gap-1">
                  <span>Waste %</span>
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
                    <span>Machine minutes</span>
                    <input
                      type="number"
                      min={0}
                      value={machineMinutes}
                      onChange={(e) => setMachineMinutes(Math.max(0, Number(e.target.value) || 0))}
                      className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span>Hourly cost</span>
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
                  <span>Target margin %</span>
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

            {previewError && <p className="text-xs text-red-400">{previewError}</p>}

            <button
              type="submit"
              disabled={previewLoading}
              className="rounded-md bg-sky-500 px-3 py-1 text-xs font-medium text-white hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {previewLoading ? 'Calculating...' : 'Calculate Price'}
            </button>
          </form>

          <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-200">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                  Price Breakdown
                </div>
                <p className="mt-1 text-[11px] text-slate-400">Detailed cost analysis</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleExport}
                  disabled={!preview || exporting}
                  className="rounded-md bg-sky-500 px-3 py-1 text-[11px] font-medium text-white hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {exporting ? 'Exporting...' : 'Export CSV'}
                </button>
                <button
                  type="button"
                  onClick={handleSaveQuote}
                  disabled={!preview || savingQuote}
                  className="rounded-md bg-emerald-500 px-3 py-1 text-[11px] font-medium text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingQuote ? 'Saving...' : 'Save Quote'}
                </button>
              </div>
            </div>

            {!preview && !previewLoading && (
              <p className="text-xs text-slate-400">Fill the form and calculate to see breakdown</p>
            )}

            {preview && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-xs md:grid-cols-3">
                  <div className="space-y-1 rounded-lg border border-slate-800 bg-slate-900/80 p-2">
                    <div className="text-[11px] text-slate-400">Material</div>
                    <div className="text-sm font-semibold text-slate-50">
                      {preview.breakdown.materialCost.toFixed(2)}
                    </div>
                  </div>
                  <div className="space-y-1 rounded-lg border border-slate-800 bg-slate-900/80 p-2">
                    <div className="text-[11px] text-slate-400">Machine</div>
                    <div className="text-sm font-semibold text-slate-50">
                      {preview.breakdown.machineCost.toFixed(2)}
                    </div>
                  </div>
                  <div className="space-y-1 rounded-lg border border-slate-800 bg-slate-900/80 p-2">
                    <div className="text-[11px] text-slate-400">Labor</div>
                    <div className="text-sm font-semibold text-slate-50">
                      {preview.breakdown.laborCost.toFixed(2)}
                    </div>
                  </div>
                  <div className="space-y-1 rounded-lg border border-slate-800 bg-slate-900/80 p-2 md:col-span-2">
                    <div className="text-[11px] text-slate-400">Total Cost</div>
                    <div className="text-sm font-semibold text-slate-50">
                      {preview.breakdown.totalCost.toFixed(2)}
                    </div>
                  </div>
                  <div className="space-y-1 rounded-lg border border-slate-800 bg-slate-900/80 p-2">
                    <div className="text-[11px] text-slate-400">Margin</div>
                    <div className="text-sm font-semibold text-slate-50">
                      {preview.breakdown.marginPercent.toFixed(1)}%
                    </div>
                  </div>
                </div>

                <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-900/80 p-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <div>
                      <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                        Recommended Price
                      </div>
                      <p className="text-[11px] text-slate-400">Based on total cost + margin</p>
                    </div>
                    <div className="text-lg font-semibold text-emerald-400">
                      {preview.breakdown.recommendedPrice.toFixed(2)}
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                    Add-ons Applied
                  </div>
                  {preview.breakdown.addOns.length === 0 ? (
                    <p className="text-[11px] text-slate-400">No add-ons applied</p>
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

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-slate-100">Export Limit Reached</h2>
              <p className="mt-2 text-sm text-slate-400">
                You&apos;ve reached your daily export limit for the FREE plan.
              </p>
            </div>

            {usageInfo && (
              <div className="mb-4 rounded-lg border border-slate-800 bg-slate-950/50 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Current Plan:</span>
                  <span className="font-semibold text-slate-200">FREE</span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-slate-400">Daily Limit:</span>
                  <span className="font-semibold text-slate-200">
                    {usageInfo.limit} exports/day
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-slate-400">Remaining Today:</span>
                  <span className="font-semibold text-red-400">{usageInfo.remaining}</span>
                </div>
              </div>
            )}

            <div className="mb-6 space-y-3">
              <div className="rounded-lg border border-sky-800/50 bg-sky-950/30 p-3">
                <div className="mb-1 flex items-center justify-between">
                  <span className="font-semibold text-sky-400">PRO Plan</span>
                  <span className="text-sm text-slate-400">$29/month</span>
                </div>
                <ul className="space-y-1 text-xs text-slate-300">
                  <li>✓ Unlimited exports</li>
                  <li>✓ Advanced features</li>
                  <li>✓ Priority support</li>
                </ul>
              </div>

              <div className="rounded-lg border border-purple-800/50 bg-purple-950/30 p-3">
                <div className="mb-1 flex items-center justify-between">
                  <span className="font-semibold text-purple-400">BUSINESS Plan</span>
                  <span className="text-sm text-slate-400">$99/month</span>
                </div>
                <ul className="space-y-1 text-xs text-slate-300">
                  <li>✓ Everything in PRO</li>
                  <li>✓ Team collaboration</li>
                  <li>✓ API access</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowUpgradeModal(false)}
                className="flex-1 rounded-md border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800"
              >
                Maybe Later
              </button>
              <button
                type="button"
                onClick={() => {
                  window.open('https://example.com/upgrade', '_blank');
                  setShowUpgradeModal(false);
                }}
                className="flex-1 rounded-md bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600"
              >
                Upgrade Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
