'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '../../../../lib/api-client';

interface QuoteDetail {
  id: string;
  customerId: string | null;
  customer: {
    id: string;
    name: string;
    email: string | null;
  } | null;
  dataJson: any;
  createdAt: string;
}

export default function QuoteDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [quote, setQuote] = useState<QuoteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [createOrderError, setCreateOrderError] = useState<string | null>(null);

  const router = useRouter();

  useEffect(() => {
    if (!id) return;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await apiClient.get<QuoteDetail>(`/quotes/${id}`);
        setQuote(res.data);
      } catch (err: any) {
        const message = err?.response?.data?.message || 'Failed to load quote';
        setError(Array.isArray(message) ? message.join(', ') : String(message));
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id]);

  if (!id) {
    return <p className="text-sm text-red-400">Missing quote id in URL.</p>;
  }

  if (loading) {
    return <p className="text-sm text-slate-400">Loading quote...</p>;
  }

  if (error) {
    return <p className="text-sm text-red-400">{error}</p>;
  }

  if (!quote) {
    return <p className="text-sm text-slate-400">Quote not found.</p>;
  }

  const data = quote.dataJson || {};
  const pricingInput = data.pricingInput ?? data.input ?? null;
  const breakdown = data.breakdown ?? null;
  const material = data.material ?? null;

  let recommended: number | null = null;
  if (breakdown && breakdown.recommendedPrice != null) {
    const num = Number(breakdown.recommendedPrice);
    recommended = Number.isFinite(num) ? num : null;
  }

  async function handleCreateOrderFromQuote() {
    if (!id || !quote) return;

    // If quote has a linked customer, create order directly via API
    if (quote.customerId) {
      setCreatingOrder(true);
      setCreateOrderError(null);
      try {
        const res = await apiClient.post<{ id: string }>(
          `/quotes/${id}/create-order`,
        );
        const orderId = (res.data as any).id;
        if (orderId) {
          router.push(`/orders/${orderId}`);
        }
      } catch (err: any) {
        const message =
          err?.response?.data?.message || 'Failed to create order from quote';
        setCreateOrderError(
          Array.isArray(message) ? message.join(', ') : String(message),
        );
      } finally {
        setCreatingOrder(false);
      }
    } else {
      // No customer linked: go to New Order page and prefill from quote
      router.push(`/orders/new?fromQuote=${id}`);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Link href="/quotes" className="text-sky-400 hover:underline">
              Quotes
            </Link>
            <span>/</span>
            <span>{quote.id.slice(0, 8)}...</span>
          </div>
          <h1 className="mt-1 text-xl font-semibold tracking-tight">Quote detail</h1>
          <p className="text-xs text-slate-400">
            Created at {new Date(quote.createdAt).toLocaleString()}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 text-xs">
          <button
            type="button"
            onClick={handleCreateOrderFromQuote}
            disabled={creatingOrder}
            className="rounded-md bg-emerald-500 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {creatingOrder
              ? 'Creating order…'
              : quote.customer
              ? 'Create order from quote'
              : 'Start order from quote'}
          </button>
          {!quote.customer && (
            <p className="max-w-xs text-right text-[11px] text-amber-300">
              This quote is not linked to a customer. You will choose the customer on
              the New order page.
            </p>
          )}
          {createOrderError && (
            <p className="max-w-xs text-right text-[11px] text-red-400">
              {createOrderError}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-xs text-slate-200">
            <div className="mb-2 text-sm font-medium">Job &amp; material</div>
            <div className="grid gap-2 md:grid-cols-2">
              <div>
                <div className="text-slate-400">Customer</div>
                {quote.customer ? (
                  <div>
                    <div className="font-medium">{quote.customer.name}</div>
                    {quote.customer.email && (
                      <div className="text-[11px] text-slate-400">{quote.customer.email}</div>
                    )}
                  </div>
                ) : (
                  <div className="text-slate-400">No customer linked</div>
                )}
              </div>
              <div>
                <div className="text-slate-400">Material</div>
                {material ? (
                  <div>
                    <div className="font-medium">{material.name}</div>
                    <div className="text-[11px] text-slate-400">
                      {material.category} • {material.thicknessMm} mm • {material.unitType}
                    </div>
                  </div>
                ) : (
                  <div className="text-slate-400">N/A</div>
                )}
              </div>
              <div>
                <div className="text-slate-400">Dimensions &amp; quantity</div>
                {pricingInput ? (
                  <div>
                    <div>
                      {pricingInput.widthMm} × {pricingInput.heightMm} mm
                    </div>
                    <div>Qty: {pricingInput.quantity}</div>
                  </div>
                ) : (
                  <div className="text-slate-400">N/A</div>
                )}
              </div>
              <div>
                <div className="text-slate-400">Machine &amp; margin</div>
                {pricingInput ? (
                  <div>
                    <div>
                      Machine: {pricingInput.machineMinutes ?? pricingInput.machineMinutes === 0
                        ? pricingInput.machineMinutes
                        : '-'}{' '}
                      min
                    </div>
                    <div>
                      Hourly cost: {pricingInput.machineHourlyCost ?? '-'}
                    </div>
                    <div>
                      Target margin: {pricingInput.targetMarginPercent ?? '-'}%
                    </div>
                  </div>
                ) : (
                  <div className="text-slate-400">N/A</div>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-xs text-slate-200">
            <div className="mb-2 text-sm font-medium">Raw data</div>
            <pre className="max-h-72 overflow-auto rounded-md bg-slate-950/80 p-2 text-[11px] text-slate-300">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-xs text-slate-200">
            <div className="mb-2 text-sm font-medium">Breakdown</div>
            {!breakdown ? (
              <p className="text-xs text-slate-400">No breakdown stored for this quote.</p>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1 rounded-lg border border-slate-800 bg-slate-900/80 p-2">
                    <div className="text-[11px] text-slate-400">Material cost</div>
                    <div className="text-sm font-semibold text-slate-50">
                      {Number(breakdown.materialCost).toFixed(2)}
                    </div>
                  </div>
                  <div className="space-y-1 rounded-lg border border-slate-800 bg-slate-900/80 p-2">
                    <div className="text-[11px] text-slate-400">Machine cost</div>
                    <div className="text-sm font-semibold text-slate-50">
                      {Number(breakdown.machineCost).toFixed(2)}
                    </div>
                  </div>
                  <div className="space-y-1 rounded-lg border border-slate-800 bg-slate-900/80 p-2">
                    <div className="text-[11px] text-slate-400">Labor / add-ons</div>
                    <div className="text-sm font-semibold text-slate-50">
                      {Number(breakdown.laborCost).toFixed(2)}
                    </div>
                  </div>
                  <div className="space-y-1 rounded-lg border border-slate-800 bg-slate-900/80 p-2">
                    <div className="text-[11px] text-slate-400">Total cost</div>
                    <div className="text-sm font-semibold text-slate-50">
                      {Number(breakdown.totalCost).toFixed(2)}
                    </div>
                  </div>
                </div>

                <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-900/80 p-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <div>
                      <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                        Recommended price
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Based on total cost and target margin.
                      </p>
                    </div>
                    <div className="text-lg font-semibold text-emerald-400">
                      {recommended != null ? recommended.toFixed(2) : 'N/A'}
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                    Add-ons applied
                  </div>
                  {!breakdown.addOns || breakdown.addOns.length === 0 ? (
                    <p className="text-[11px] text-slate-400">No add-ons applied.</p>
                  ) : (
                    <ul className="space-y-1 text-[11px]">
                      {breakdown.addOns.map((a: any) => (
                        <li key={a.id} className="flex items-center justify-between gap-2">
                          <span className="text-slate-300">{a.name}</span>
                          <span className="text-slate-100">
                            {Number(a.cost).toFixed(2)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
