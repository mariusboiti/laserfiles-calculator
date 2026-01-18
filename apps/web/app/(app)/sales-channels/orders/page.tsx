'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '../../../../lib/api-client';
import { useT } from '../../i18n';

interface StoreConnection {
  id: string;
  name: string;
  channel: 'WOOCOMMERCE' | 'ETSY' | 'CSV';
}

interface ExternalOrderItem {
  id: string;
  externalProductId?: string | null;
  title: string;
  quantity: number;
  unitPrice?: number | null;
  optionsJson?: any;
}

interface ExternalOrder {
  id: string;
  connectionId: string;
  externalOrderId: string;
  externalOrderNumber: string;
  externalStatus?: string | null;
  currency?: string | null;
  importedAt: string;
  processedState: 'NEW' | 'MAPPED' | 'CREATED_INTERNAL' | 'NEEDS_REVIEW' | 'ERROR' | 'IGNORED';
  errorMessage?: string | null;
  connection: StoreConnection;
}

interface ExternalOrdersListResponse {
  data: ExternalOrder[];
  total: number;
}

interface ExternalOrderReview extends ExternalOrder {
  items: ExternalOrderItem[];
}

export default function SalesChannelsOrdersPage() {
  const t = useT();
  const [connections, setConnections] = useState<StoreConnection[]>([]);
  const [orders, setOrders] = useState<ExternalOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedConnectionId, setSelectedConnectionId] = useState('');
  const [selectedState, setSelectedState] = useState<string>('NEEDS_REVIEW');

  const [selectedOrder, setSelectedOrder] = useState<ExternalOrderReview | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [quickActionLoading, setQuickActionLoading] = useState(false);

  async function loadMeta() {
    try {
      const [connectionsRes] = await Promise.all([
        apiClient.get<StoreConnection[]>('/sales-channels/connections'),
      ]);
      setConnections(connectionsRes.data);
      if (!selectedConnectionId && connectionsRes.data.length > 0) {
        setSelectedConnectionId(connectionsRes.data[0].id);
      }
    } catch (err: any) {
      const message = err?.response?.data?.message || t('sales_channels.failed_to_load_connections');
      setError(Array.isArray(message) ? message.join(', ') : String(message));
    }
  }

  async function loadOrders() {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<ExternalOrdersListResponse>(
        '/sales-channels/external-orders',
        {
          params: {
            connectionId: selectedConnectionId || undefined,
            processedState: selectedState || undefined,
          },
        },
      );
      setOrders(res.data.data);
    } catch (err: any) {
      const message = err?.response?.data?.message || t('sales_channels_orders.failed_to_load_orders');
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
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConnectionId, selectedState]);

  async function loadOrderDetail(id: string) {
    setSelectedOrder(null);
    setDetailError(null);
    setDetailLoading(true);
    try {
      const res = await apiClient.get<ExternalOrderReview>(
        `/sales-channels/external-orders/${id}/review`,
      );
      setSelectedOrder(res.data);
    } catch (err: any) {
      const message = err?.response?.data?.message || t('sales_channels_orders.failed_to_load_details');
      setDetailError(Array.isArray(message) ? message.join(', ') : String(message));
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleCreateInternal(id: string) {
    try {
      const res = await apiClient.post<{
        externalOrderId: string;
        internalOrderId: string;
        alreadyCreated?: boolean;
      }>(`/sales-channels/external-orders/${id}/create-internal`, {});
      await loadOrders();
      if (res.data.internalOrderId) {
        alert(t('sales_channels_orders.alert.created_internal').replace('{0}', String(res.data.internalOrderId)));
      } else if (res.data.alreadyCreated) {
        alert(t('sales_channels_orders.alert.already_created'));
      }
    } catch (err: any) {
      const message = err?.response?.data?.message || t('sales_channels_orders.failed_to_create_internal');
      alert(Array.isArray(message) ? message.join(', ') : String(message));
      await loadOrders();
    }
  }

  async function handleIgnore(id: string) {
    if (!window.confirm(t('sales_channels_orders.confirm_mark_ignored'))) return;
    try {
      await apiClient.post(`/sales-channels/external-orders/${id}/ignore`, {});
      if (selectedOrder && selectedOrder.id === id) {
        setSelectedOrder(null);
      }
      await loadOrders();
    } catch (err: any) {
      const message = err?.response?.data?.message || t('sales_channels_orders.failed_to_mark_ignored');
      alert(Array.isArray(message) ? message.join(', ') : String(message));
    }
  }

  async function handleApplySuggestionsForConnection() {
    const connectionId = selectedOrder?.connectionId || selectedConnectionId;
    if (!connectionId) {
      alert(t('sales_channels_orders.alert.select_connection_first'));
      return;
    }
    setQuickActionLoading(true);
    try {
      const res = await apiClient.post<{
        created: number;
        skipped: number;
      }>('/sales-channels/mappings/suggestions/apply-high-confidence', {
        connectionId,
        minScore: 80,
      });
      await loadOrders();
      if (selectedOrder) {
        await loadOrderDetail(selectedOrder.id);
      }
      alert(
        t('sales_channels_orders.suggestions_applied')
          .replace('{0}', String(res.data.created))
          .replace('{1}', String(res.data.skipped)),
      );
    } catch (err: any) {
      const message = err?.response?.data?.message || t('sales_channels_mappings.failed_to_apply_suggestions');
      alert(Array.isArray(message) ? message.join(', ') : String(message));
    } finally {
      setQuickActionLoading(false);
    }
  }

  function stateLabel(state: string) {
    switch (state) {
      case 'NEW':
        return t('sales_channels_orders.state.new');
      case 'MAPPED':
        return t('sales_channels_orders.state.mapped');
      case 'CREATED_INTERNAL':
        return t('sales_channels_orders.state.created_internal');
      case 'NEEDS_REVIEW':
        return t('sales_channels_orders.state.needs_review');
      case 'ERROR':
        return t('sales_channels_orders.state.error');
      case 'IGNORED':
        return t('sales_channels_orders.state.ignored');
      default:
        return state;
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
            <span>{t('sales_channels_orders.title')}</span>
          </div>
          <h1 className="mt-1 text-xl font-semibold tracking-tight">{t('sales_channels_orders.title')}</h1>
          <p className="text-xs text-slate-400">{t('sales_channels_orders.subtitle')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-200">
          <select
            value={selectedConnectionId}
            onChange={(e) => setSelectedConnectionId(e.target.value)}
            className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
          >
            <option value="">{t('sales_channels_orders.filters.all_connections')}</option>
            {connections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({t(`sales_channels.channel.${c.channel.toLowerCase()}` as any)})
              </option>
            ))}
          </select>
          <select
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
            className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
          >
            <option value="">{t('sales_channels_orders.filters.all_states')}</option>
            <option value="NEW">{t('sales_channels_orders.state.new')}</option>
            <option value="NEEDS_REVIEW">{t('sales_channels_orders.state.needs_review')}</option>
            <option value="CREATED_INTERNAL">{t('sales_channels_orders.state.created_internal')}</option>
            <option value="ERROR">{t('sales_channels_orders.state.error')}</option>
            <option value="IGNORED">{t('sales_channels_orders.state.ignored')}</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-200">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
              {t('sales_channels_orders.list_title')}
            </div>
            {loading && <div className="text-[11px] text-slate-400">{t('common.loading')}</div>}
          </div>
          {error && <p className="text-[11px] text-red-400">{error}</p>}
          {!loading && !error && orders.length === 0 && (
            <p className="text-[11px] text-slate-400">{t('sales_channels_orders.none_found')}</p>
          )}
          {!loading && !error && orders.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/60">
              <table className="min-w-full text-left text-xs text-slate-200">
                <thead className="border-b border-slate-800 bg-slate-900/80 text-[11px] uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-3 py-2">{t('sales_channels_orders.table.order')}</th>
                    <th className="px-3 py-2">{t('sales_channels_orders.table.channel')}</th>
                    <th className="px-3 py-2">{t('sales_channels_orders.table.state')}</th>
                    <th className="px-3 py-2">{t('sales_channels_orders.table.imported')}</th>
                    <th className="px-3 py-2">{t('sales_channels_orders.table.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id} className="border-t border-slate-800">
                      <td className="px-3 py-2 align-top text-xs text-slate-200">
                        <div className="font-medium">#{o.externalOrderNumber}</div>
                        {o.externalStatus && (
                          <div className="text-[11px] text-slate-400">
                            {t('sales_channels_orders.store_status')}: {o.externalStatus}
                          </div>
                        )}
                        {o.errorMessage && (
                          <div className="text-[11px] text-red-400">{o.errorMessage}</div>
                        )}
                      </td>
                      <td className="px-3 py-2 align-top text-xs text-slate-300">
                        <div>{o.connection.name}</div>
                        <div className="text-[11px] text-slate-500">{t(`sales_channels.channel.${o.connection.channel.toLowerCase()}` as any)}</div>
                      </td>
                      <td className="px-3 py-2 align-top">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[11px] ${
                            o.processedState === 'CREATED_INTERNAL'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : o.processedState === 'NEEDS_REVIEW'
                              ? 'bg-amber-500/20 text-amber-300'
                              : o.processedState === 'ERROR'
                              ? 'bg-red-500/20 text-red-300'
                              : o.processedState === 'IGNORED'
                              ? 'bg-slate-700 text-slate-300'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {stateLabel(o.processedState)}
                        </span>
                      </td>
                      <td className="px-3 py-2 align-top text-[11px] text-slate-400">
                        {new Date(o.importedAt).toLocaleString()}
                      </td>
                      <td className="px-3 py-2 align-top text-[11px] text-slate-300">
                        <button
                          type="button"
                          onClick={() => loadOrderDetail(o.id)}
                          className="mr-2 rounded-md border border-slate-700 px-2 py-0.5 text-[11px] hover:bg-slate-800"
                        >
                          {t('sales_channels_orders.actions.view')}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCreateInternal(o.id)}
                          className="rounded-md border border-emerald-600 px-2 py-0.5 text-[11px] text-emerald-300 hover:bg-emerald-900/40"
                          disabled={o.processedState === 'CREATED_INTERNAL'}
                        >
                          {t('sales_channels_orders.actions.create_internal')}
                        </button>
                        {o.processedState !== 'IGNORED' && (
                          <button
                            type="button"
                            onClick={() => handleIgnore(o.id)}
                            className="ml-2 rounded-md border border-slate-700 px-2 py-0.5 text-[11px] text-slate-300 hover:bg-slate-800"
                          >
                            {t('sales_channels_orders.actions.ignore')}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-200">
          <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-slate-400">
            {t('sales_channels_orders.details.title')}
          </div>
          {detailLoading && <p className="text-[11px] text-slate-400">{t('sales_channels_orders.details.loading')}</p>}
          {detailError && <p className="text-[11px] text-red-400">{detailError}</p>}
          {!detailLoading && !selectedOrder && !detailError && (
            <p className="text-[11px] text-slate-400">{t('sales_channels_orders.details.select_to_see')}</p>
          )}
          {!detailLoading && selectedOrder && (
            <div className="space-y-2">
              <div className="text-xs text-slate-200">
                <div className="font-medium">#{selectedOrder.externalOrderNumber}</div>
                <div className="text-[11px] text-slate-400">
                  {selectedOrder.connection.name} ({t(`sales_channels.channel.${selectedOrder.connection.channel.toLowerCase()}` as any)})
                </div>
                {selectedOrder.externalStatus && (
                  <div className="text-[11px] text-slate-400">
                    {t('sales_channels_orders.store_status')}: {selectedOrder.externalStatus}
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-300">
                <button
                  type="button"
                  onClick={handleApplySuggestionsForConnection}
                  disabled={quickActionLoading}
                  className="rounded-md border border-emerald-600 px-2 py-0.5 text-[11px] text-emerald-300 hover:bg-emerald-900/40 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {quickActionLoading
                    ? t('sales_channels_orders.actions.applying_suggestions')
                    : t('sales_channels_orders.actions.auto_apply_mappings')}
                </button>
                {selectedOrder.processedState !== 'IGNORED' && (
                  <button
                    type="button"
                    onClick={() => handleIgnore(selectedOrder.id)}
                    className="rounded-md border border-slate-700 px-2 py-0.5 text-[11px] text-slate-300 hover:bg-slate-800"
                  >
                    {t('sales_channels_orders.actions.mark_as_ignored')}
                  </button>
                )}
              </div>
              <div className="mt-2 rounded-lg border border-slate-800 bg-slate-900/60 p-2">
                <div className="mb-1 text-[11px] font-medium text-slate-400">{t('sales_channels_orders.details.items')}</div>
                {selectedOrder.items.length === 0 && (
                  <p className="text-[11px] text-slate-400">{t('sales_channels_orders.details.no_items')}</p>
                )}
                {selectedOrder.items.length > 0 && (
                  <ul className="space-y-1 text-[11px] text-slate-200">
                    {selectedOrder.items.map((item) => (
                      <li key={item.id} className="border-b border-slate-800 pb-1 last:border-b-0">
                        <div className="font-medium">{item.title}</div>
                        <div className="text-slate-400">
                          {t('sales_channels_orders.details.qty')}: {item.quantity}
                          {typeof item.unitPrice === 'number' && (
                            <span>
                              {' '}· {t('sales_channels_orders.details.price')}: {item.unitPrice.toFixed(2)}
                            </span>
                          )}
                        </div>
                        {item.externalProductId && (
                          <div className="text-slate-500">{t('sales_channels_orders.details.product_id')}: {item.externalProductId}</div>
                        )}
                        {item.optionsJson && Object.keys(item.optionsJson).length > 0 && (
                          <div className="mt-0.5 text-slate-400">
                            {t('sales_channels_orders.details.personalization')}: {' '}
                            {Object.entries(item.optionsJson)
                              .slice(0, 4)
                              .map(([k, v], idx) => (
                                <span key={k}>
                                  {idx > 0 && ', '}
                                  {k}: {String(v)}
                                </span>
                              ))}
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
      </div>
    </div>
  );
}
