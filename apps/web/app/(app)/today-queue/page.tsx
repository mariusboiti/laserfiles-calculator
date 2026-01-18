'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '../../../lib/api-client';
import { useT } from '../i18n';

type BatchStatus =
  | 'PLANNED'
  | 'READY'
  | 'IN_PROGRESS'
  | 'PAUSED'
  | 'DONE'
  | 'CANCELED';

type BatchPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

type OrderStatus =
  | 'NEW'
  | 'IN_PROGRESS'
  | 'WAITING_MATERIALS'
  | 'READY'
  | 'SHIPPED'
  | 'COMPLETED'
  | 'CANCELED';

type OrderPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

type TodayQueueEntityType = 'BATCH' | 'ORDER_ITEM';

interface QueueBatch {
  id: string;
  name: string;
  status: BatchStatus;
  priority: BatchPriority;
  targetDate: string | null;
  season: { id: string; name: string } | null;
  itemsCount: number;
  estimatedMinutesTotal?: number;
}

interface QueueItem {
  id: string;
  title: string;
  quantity: number;
  estimatedMinutes: number | null;
  order: {
    id: string;
    status: OrderStatus;
    priority: OrderPriority;
    createdAt: string;
  } | null;
  template: { id: string; name: string } | null;
  templateVariant: { id: string; name: string } | null;
}

interface TodayQueueResponse {
  generatedAt: string;
  pinned: {
    batches: QueueBatch[];
    items: QueueItem[];
  };
  batchesInProgress: QueueBatch[];
  batchesReady: QueueBatch[];
  urgentItems: QueueItem[];
}

export default function TodayQueuePage() {
  const t = useT();
  const [data, setData] = useState<TodayQueueResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pinning, setPinning] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<TodayQueueResponse>('/today-queue');
      setData(res.data);
    } catch (err: any) {
      const message = err?.response?.data?.message || t('today_queue.failed_to_load');
      setError(Array.isArray(message) ? message.join(', ') : String(message));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function pin(entityType: TodayQueueEntityType, id: string) {
    setPinning(`${entityType}:${id}`);
    try {
      await apiClient.post('/today-queue/pin', { entityType, id });
      await load();
    } catch (err: any) {
      const message = err?.response?.data?.message || t('today_queue.failed_to_pin');
      alert(Array.isArray(message) ? message.join(', ') : String(message));
    } finally {
      setPinning(null);
    }
  }

  async function unpin(entityType: TodayQueueEntityType, id: string) {
    setPinning(`${entityType}:${id}`);
    try {
      await apiClient.delete('/today-queue/pin', { data: { entityType, id } });
      await load();
    } catch (err: any) {
      const message = err?.response?.data?.message || t('today_queue.failed_to_unpin');
      alert(Array.isArray(message) ? message.join(', ') : String(message));
    } finally {
      setPinning(null);
    }
  }

  function formatBatchStatus(status: string): string {
    return t(`batches.status.${String(status).toLowerCase()}` as any);
  }

  function formatOrderStatus(status: string): string {
    return t(`order.status.${String(status).toLowerCase()}` as any);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{t('today_queue.title')}</h1>
          <p className="mt-1 text-xs text-slate-400">{t('today_queue.subtitle')}</p>
        </div>
        {data && (
          <div className="text-[11px] text-slate-500">
            {t('today_queue.generated_at_prefix').replace(
              '{0}',
              new Date(data.generatedAt).toLocaleTimeString(),
            )}
          </div>
        )}
      </div>

      {loading && <p className="text-sm text-slate-400">{t('today_queue.loading')}</p>}
      {error && !loading && <p className="text-sm text-red-400">{error}</p>}

      {!loading && !error && data && (
        <div className="space-y-4">
          {/* Pinned section */}
          {(data.pinned.batches.length > 0 || data.pinned.items.length > 0) && (
            <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-200">
              <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">{t('today_queue.pinned_for_today')}</div>
              <div className="grid gap-3 md:grid-cols-2">
                {data.pinned.batches.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-[11px] text-slate-400">{t('today_queue.pinned_batches')}</div>
                    <div className="flex flex-col gap-2">
                      {data.pinned.batches.map((b) => (
                        <div
                          key={b.id}
                          className="flex items-start justify-between gap-2 rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2"
                        >
                          <div>
                            <div className="text-xs font-medium text-slate-100">{b.name}</div>
                            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                              <span
                                className={`inline-flex rounded-full px-2 py-0.5 text-[11px] ${
                                  b.status === 'IN_PROGRESS'
                                    ? 'bg-emerald-500/20 text-emerald-300'
                                    : b.status === 'READY'
                                    ? 'bg-sky-500/20 text-sky-300'
                                    : 'bg-slate-800 text-slate-300'
                                }`}
                              >
                                {formatBatchStatus(b.status)}
                              </span>
                              <span
                                className={`inline-flex rounded-full px-2 py-0.5 text-[11px] ${
                                  b.priority === 'URGENT'
                                    ? 'bg-red-500/20 text-red-300'
                                    : b.priority === 'HIGH'
                                    ? 'bg-amber-500/20 text-amber-300'
                                    : 'bg-slate-700 text-slate-200'
                                }`}
                              >
                                {t(`batches.priority.${b.priority.toLowerCase()}` as any)}
                              </span>
                              {b.targetDate && (
                                <span className="text-[11px] text-slate-400">
                                  {t('today_queue.target_prefix').replace('{0}', new Date(b.targetDate).toLocaleDateString())}
                                </span>
                              )}
                              <span className="text-[11px] text-slate-400">{t('today_queue.items_prefix').replace('{0}', String(b.itemsCount))}</span>
                              {typeof b.estimatedMinutesTotal === 'number' && (
                                <span className="text-[11px] text-slate-400">{t('today_queue.est_prefix').replace('{0}', String(b.estimatedMinutesTotal))}</span>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => unpin('BATCH', b.id)}
                            disabled={pinning === `BATCH:${b.id}`}
                            className="rounded-md border border-slate-700 px-2 py-0.5 text-[11px] text-slate-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {t('today_queue.unpin')}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {data.pinned.items.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-[11px] text-slate-400">{t('today_queue.pinned_urgent_items')}</div>
                    <div className="flex flex-col gap-2">
                      {data.pinned.items.map((it) => (
                        <div
                          key={it.id}
                          className="flex items-start justify-between gap-2 rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2"
                        >
                          <div>
                            <div className="text-xs font-medium text-slate-100">{it.title}</div>
                            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                              <span>{t('today_queue.qty_prefix').replace('{0}', String(it.quantity))}</span>
                              {it.order && (
                                <span>
                                  {t('today_queue.order_prefix')} {it.order.id.slice(0, 8)}… · {formatOrderStatus(it.order.status)}
                                </span>
                              )}
                              {it.template && <span>{t('today_queue.template_prefix').replace('{0}', it.template.name)}</span>}
                              {it.estimatedMinutes != null && <span>{t('today_queue.est_prefix').replace('{0}', String(it.estimatedMinutes))}</span>}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => unpin('ORDER_ITEM', it.id)}
                            disabled={pinning === `ORDER_ITEM:${it.id}`}
                            className="rounded-md border border-slate-700 px-2 py-0.5 text-[11px] text-slate-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {t('today_queue.unpin')}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Batches in progress and ready */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-200">
              <div className="mb-1 flex items-center justify-between gap-2">
                <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{t('today_queue.batches_in_progress')}</div>
              </div>
              {data.batchesInProgress.length === 0 && (
                <p className="text-[11px] text-slate-400">{t('today_queue.no_batches_in_progress')}</p>
              )}
              {data.batchesInProgress.length > 0 && (
                <div className="flex flex-col gap-2">
                  {data.batchesInProgress.map((b) => (
                    <div
                      key={b.id}
                      className="flex items-start justify-between gap-2 rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2"
                    >
                      <div>
                        <div className="text-xs font-medium text-slate-100">{b.name}</div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                          {b.season && <span>{t('today_queue.season_prefix').replace('{0}', b.season.name)}</span>}
                          <span>{t('today_queue.items_prefix').replace('{0}', String(b.itemsCount))}</span>
                          {typeof b.estimatedMinutesTotal === 'number' && <span>{t('today_queue.est_prefix').replace('{0}', String(b.estimatedMinutesTotal))}</span>}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => pin('BATCH', b.id)}
                        disabled={pinning === `BATCH:${b.id}`}
                        className="rounded-md border border-slate-700 px-2 py-0.5 text-[11px] text-slate-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {t('today_queue.pin')}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-200">
              <div className="mb-1 flex items-center justify-between gap-2">
                <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{t('today_queue.batches_ready_to_cut')}</div>
              </div>
              {data.batchesReady.length === 0 && (
                <p className="text-[11px] text-slate-400">{t('today_queue.no_ready_batches')}</p>
              )}
              {data.batchesReady.length > 0 && (
                <div className="flex flex-col gap-2">
                  {data.batchesReady.map((b) => (
                    <div
                      key={b.id}
                      className="flex items-start justify-between gap-2 rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2"
                    >
                      <div>
                        <div className="text-xs font-medium text-slate-100">{b.name}</div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                          {b.season && <span>{t('today_queue.season_prefix').replace('{0}', b.season.name)}</span>}
                          <span>{t('today_queue.items_prefix').replace('{0}', String(b.itemsCount))}</span>
                          {b.targetDate && <span>{t('today_queue.target_prefix').replace('{0}', new Date(b.targetDate).toLocaleDateString())}</span>}
                          {typeof b.estimatedMinutesTotal === 'number' && <span>{t('today_queue.est_prefix').replace('{0}', String(b.estimatedMinutesTotal))}</span>}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => pin('BATCH', b.id)}
                        disabled={pinning === `BATCH:${b.id}`}
                        className="rounded-md border border-slate-700 px-2 py-0.5 text-[11px] text-slate-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {t('today_queue.pin')}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Urgent items not batched */}
          <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-200">
            <div className="mb-1 flex items-center justify-between gap-2">
              <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{t('today_queue.urgent_items_not_in_batch')}</div>
            </div>
            {data.urgentItems.length === 0 && (
              <p className="text-[11px] text-slate-400">{t('today_queue.none_urgent_unbatched')}</p>
            )}
            {data.urgentItems.length > 0 && (
              <div className="flex flex-col gap-2">
                {data.urgentItems.map((it) => (
                  <div
                    key={it.id}
                    className="flex items-start justify-between gap-2 rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2"
                  >
                    <div>
                      <div className="text-xs font-medium text-slate-100">{it.title}</div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                        <span>{t('today_queue.qty_prefix').replace('{0}', String(it.quantity))}</span>
                        {it.order && (
                          <span>
                            {t('today_queue.order_prefix')} {it.order.id.slice(0, 8)}… · {formatOrderStatus(it.order.status)}
                          </span>
                        )}
                        {it.template && <span>{t('today_queue.template_prefix').replace('{0}', it.template.name)}</span>}
                        {it.estimatedMinutes != null && <span>{t('today_queue.est_prefix').replace('{0}', String(it.estimatedMinutes))}</span>}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => pin('ORDER_ITEM', it.id)}
                      disabled={pinning === `ORDER_ITEM:${it.id}`}
                      className="rounded-md border border-slate-700 px-2 py-0.5 text-[11px] text-slate-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {t('today_queue.pin')}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
