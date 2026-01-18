'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '../../../../lib/api-client';
import { useT } from '../../i18n';

type BatchStatus =
  | 'PLANNED'
  | 'READY'
  | 'IN_PROGRESS'
  | 'PAUSED'
  | 'DONE'
  | 'CANCELED';

type BatchPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

type BatchType = 'TEMPLATE_RUN' | 'MIXED' | 'CUSTOM';

interface BatchDetail {
  id: string;
  name: string;
  batchType: BatchType;
  status: BatchStatus;
  priority: BatchPriority;
  targetDate: string | null;
  notes: string | null;
  createdAt: string;
  season: { id: string; name: string } | null;
  defaultMaterial?: { id: string; name: string } | null;
  defaultVariant?: { id: string; name: string } | null;
  _count: {
    items: number;
    tasks: number;
  };
  estimatedMinutesTotal?: number;
  actualMinutesTotal?: number;
}

interface BatchItemLinkWithItem {
  id: string;
  orderItem: {
    id: string;
    title: string;
    quantity: number;
    estimatedMinutes: number | null;
    order: {
      id: string;
      status: string;
      priority: string;
      createdAt: string;
    };
    material: { id: string; name: string } | null;
    template: { id: string; name: string } | null;
    templateVariant: { id: string; name: string } | null;
    templateProduct: { id: string; name: string } | null;
  };
}

interface BatchTask {
  id: string;
  title: string;
  status: string;
  assignedUser?: { id: string; name: string; email: string } | null;
  createdAt: string;
}

interface ForecastMaterial {
  materialId: string;
  materialName: string;
  unitType: 'SHEET' | 'M2';
  estimatedUnits: number | null;
  stockQty: number;
  status: 'LIKELY_ENOUGH' | 'AT_RISK' | 'UNKNOWN';
  message: string;
}

interface ForecastResponse {
  batchId: string;
  materials: ForecastMaterial[];
}

interface BatchOffcutSuggestion {
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

interface BatchOffcutSuggestionGroup {
  materialId: string;
  materialName: string;
  thicknessMm: number;
  suggestions: BatchOffcutSuggestion[];
}

export default function BatchDetailPage() {
  const t = useT();
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : '';

  const [batch, setBatch] = useState<BatchDetail | null>(null);
  const [items, setItems] = useState<BatchItemLinkWithItem[]>([]);
  const [tasks, setTasks] = useState<BatchTask[]>([]);
  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [offcutSuggestions, setOffcutSuggestions] = useState<BatchOffcutSuggestionGroup[] | null>(
    null,
  );
  const [offcutSuggestionsError, setOffcutSuggestionsError] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'items' | 'tasks' | 'forecast'>('overview');

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [creatingTask, setCreatingTask] = useState(false);

  function formatUnitType(value: string) {
    const upper = String(value).toUpperCase();
    if (upper === 'SHEET') return t('unit.sheet');
    if (upper === 'M2') return t('unit.m2');
    return String(value);
  }

  useEffect(() => {
    if (!id) return;
    async function loadAll() {
      setLoading(true);
      setError(null);
      try {
        const [batchRes, itemsRes, tasksRes, forecastRes] = await Promise.all([
          apiClient.get<BatchDetail>(`/batches/${id}`),
          apiClient.get<BatchItemLinkWithItem[]>(`/batches/${id}/items`),
          apiClient.get<BatchTask[]>(`/batches/${id}/tasks`),
          apiClient.get<ForecastResponse>(`/batches/${id}/forecast`).catch(() => null),
        ]);
        setBatch(batchRes.data);
        setItems(itemsRes.data);
        setTasks(tasksRes.data);
        if (forecastRes && forecastRes.data) {
          setForecast(forecastRes.data);
        } else {
          setForecast(null);
        }

        try {
          const offcutsRes = await apiClient.get<BatchOffcutSuggestionGroup[]>(
            `/batches/${id}/offcut-suggestions`,
          );
          setOffcutSuggestions(offcutsRes.data || []);
          setOffcutSuggestionsError(null);
        } catch (err: any) {
          const message = err?.response?.data?.message || t('batch_detail.offcuts.failed_to_load');
          setOffcutSuggestions([]);
          setOffcutSuggestionsError(Array.isArray(message) ? message.join(', ') : String(message));
        }
      } catch (err: any) {
        const message = err?.response?.data?.message || t('batch_detail.failed_to_load');
        setError(Array.isArray(message) ? message.join(', ') : String(message));
      } finally {
        setLoading(false);
      }
    }
    loadAll();
  }, [id]);

  async function refreshBatch() {
    if (!id) return;
    try {
      const res = await apiClient.get<BatchDetail>(`/batches/${id}`);
      setBatch(res.data);
    } catch {}
  }

  async function handleStatusChange(newStatus: BatchStatus) {
    if (!id) return;
    try {
      await apiClient.patch(`/batches/${id}`, { status: newStatus });
      await refreshBatch();
    } catch (err: any) {
      const message = err?.response?.data?.message || t('batches.failed_to_update_status');
      alert(Array.isArray(message) ? message.join(', ') : String(message));
    }
  }

  async function handleCreateTask() {
    if (!id || !newTaskTitle.trim()) return;
    setCreatingTask(true);
    try {
      const res = await apiClient.post<BatchTask>(`/batches/${id}/tasks`, {
        title: newTaskTitle.trim(),
      });
      setTasks((prev) => [...prev, res.data]);
      setNewTaskTitle('');
    } catch (err: any) {
      const message = err?.response?.data?.message || t('batch_detail.tasks.failed_to_create');
      alert(Array.isArray(message) ? message.join(', ') : String(message));
    } finally {
      setCreatingTask(false);
    }
  }

  async function handleUpdateTask(taskId: string, updates: { status?: string }) {
    if (!id) return;
    try {
      const res = await apiClient.patch<BatchTask>(`/batches/${id}/tasks/${taskId}`, updates);
      setTasks((prev) => prev.map((t) => (t.id === taskId ? res.data : t)));
    } catch (err: any) {
      const message = err?.response?.data?.message || t('batch_detail.tasks.failed_to_update');
      alert(Array.isArray(message) ? message.join(', ') : String(message));
    }
  }

  function formatStatus(status: string): string {
    return t(`batches.status.${String(status).toLowerCase()}` as any);
  }

  if (!id) {
    return <div className="text-sm text-slate-400">{t('batch_detail.invalid_id')}</div>;
  }

  if (loading) {
    return <div className="text-sm text-slate-400">{t('batch_detail.loading')}</div>;
  }

  if (error) {
    return <div className="text-sm text-red-400">{error}</div>;
  }

  if (!batch) {
    return <div className="text-sm text-slate-400">{t('batch_detail.not_found')}</div>;
  }

  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => t.status === 'DONE').length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Link href="/seasons" className="text-sky-400 hover:underline">
              {t('tutorial.step.production.link.seasons')}
            </Link>
            <span>/</span>
            <Link href="/batches" className="text-sky-400 hover:underline">
              {t('batches.title')}
            </Link>
            <span>/</span>
            <span>{t('batch_detail.breadcrumb_current')}</span>
          </div>
          <h1 className="mt-1 text-xl font-semibold tracking-tight">{batch.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-300">
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-[11px] ${
                batch.status === 'IN_PROGRESS'
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : batch.status === 'READY'
                  ? 'bg-sky-500/20 text-sky-300'
                  : batch.status === 'PLANNED'
                  ? 'bg-slate-800 text-slate-300'
                  : batch.status === 'DONE'
                  ? 'bg-slate-700 text-slate-300'
                  : batch.status === 'PAUSED'
                  ? 'bg-amber-500/20 text-amber-300'
                  : 'bg-slate-800 text-slate-300'
              }`}
            >
              {formatStatus(batch.status)}
            </span>
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-[11px] ${
                batch.priority === 'URGENT'
                  ? 'bg-red-500/20 text-red-300'
                  : batch.priority === 'HIGH'
                  ? 'bg-amber-500/20 text-amber-300'
                  : batch.priority === 'LOW'
                  ? 'bg-slate-800 text-slate-300'
                  : 'bg-slate-700 text-slate-200'
              }`}
            >
              {t(`batches.priority.${batch.priority.toLowerCase()}` as any)}
            </span>
            {batch.targetDate && (
              <span className="inline-flex rounded-full bg-slate-800 px-2 py-0.5 text-[11px]">
                {t('batch_detail.header.target_prefix').replace(
                  '{0}',
                  new Date(batch.targetDate).toLocaleDateString(),
                )}
              </span>
            )}
            {batch.season && (
              <span className="inline-flex rounded-full bg-slate-900 px-2 py-0.5 text-[11px] text-slate-300">
                {t('batch_detail.header.season_prefix').replace('{0}', batch.season.name)}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-300">
          <span className="text-slate-400">{t('batch_detail.quick_status')}</span>
          <button
            type="button"
            onClick={() => handleStatusChange('READY')}
            className="rounded-md border border-sky-600 px-2 py-0.5 text-[11px] text-sky-300 hover:bg-sky-900/40"
          >
            {t('batches.actions.mark_ready')}
          </button>
          <button
            type="button"
            onClick={() => handleStatusChange('IN_PROGRESS')}
            className="rounded-md border border-emerald-600 px-2 py-0.5 text-[11px] text-emerald-300 hover:bg-emerald-900/40"
          >
            {t('batches.actions.in_progress')}
          </button>
          <button
            type="button"
            onClick={() => handleStatusChange('DONE')}
            className="rounded-md border border-slate-600 px-2 py-0.5 text-[11px] text-slate-200 hover:bg-slate-800"
          >
            {t('batches.actions.done')}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`rounded-md px-3 py-1 ${
            activeTab === 'overview'
              ? 'bg-slate-800 text-sky-300'
              : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
          }`}
        >
          {t('batch_detail.tabs.overview')}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('items')}
          className={`rounded-md px-3 py-1 ${
            activeTab === 'items'
              ? 'bg-slate-800 text-sky-300'
              : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
          }`}
        >
          {t('batch_detail.tabs.items')}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('tasks')}
          className={`rounded-md px-3 py-1 ${
            activeTab === 'tasks'
              ? 'bg-slate-800 text-sky-300'
              : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
          }`}
        >
          {t('batch_detail.tabs.tasks')}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('forecast')}
          className={`rounded-md px-3 py-1 ${
            activeTab === 'forecast'
              ? 'bg-slate-800 text-sky-300'
              : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
          }`}
        >
          {t('batch_detail.tabs.forecast')}
        </button>
      </div>

      {activeTab === 'overview' && (
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-200">
            <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">
              {t('batch_detail.overview.summary')}
            </div>
            <div className="space-y-1">
              <div>{t('batch_detail.overview.items_in_batch').replace('{0}', String(batch._count.items))}</div>
              <div>{t('batch_detail.overview.tasks_count').replace('{0}', String(totalTasks))}</div>
              <div>{t('batch_detail.overview.tasks_done').replace('{0}', String(doneTasks)).replace('{1}', String(totalTasks))}</div>
              <div>{t('batch_detail.overview.estimated_minutes').replace('{0}', String(batch.estimatedMinutesTotal ?? 0))}</div>
              <div>{t('batch_detail.overview.actual_minutes').replace('{0}', String(batch.actualMinutesTotal ?? 0))}</div>
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-200">
            <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">{t('batch_detail.defaults.title')}</div>
            <div className="space-y-1">
              <div>{t('batch_detail.defaults.batch_type').replace('{0}', String(batch.batchType))}</div>
              <div>{t('batch_detail.defaults.default_material').replace('{0}', String(batch.defaultMaterial?.name ?? '-'))}</div>
              <div>{t('batch_detail.defaults.default_variant').replace('{0}', String(batch.defaultVariant?.name ?? '-'))}</div>
              {batch.notes && (
                <div className="mt-1 text-[11px] text-slate-300">{t('batch_detail.defaults.notes').replace('{0}', String(batch.notes))}</div>
              )}
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-200">
            <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">{t('batch_detail.timing.title')}</div>
            <div className="space-y-1">
              <div>{t('batch_detail.timing.created').replace('{0}', new Date(batch.createdAt).toLocaleString())}</div>
              {batch.targetDate && (
                <div>{t('batch_detail.timing.target_date').replace('{0}', new Date(batch.targetDate).toLocaleDateString())}</div>
              )}
              <div className="text-[11px] text-slate-400">{t('batch_detail.timing.note')}</div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'items' && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-200">
          <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-slate-400">{t('batch_detail.items.title')}</div>
          {items.length === 0 && (
            <p className="text-[11px] text-slate-400">{t('batch_detail.items.none')}</p>
          )}
          {items.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/60">
              <table className="min-w-full text-left text-xs text-slate-200">
                <thead className="border-b border-slate-800 bg-slate-900/80 text-[11px] uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-3 py-2">{t('batch_detail.items.table.order_item')}</th>
                    <th className="px-3 py-2">{t('batch_detail.items.table.template')}</th>
                    <th className="px-3 py-2">{t('batch_detail.items.table.qty')}</th>
                    <th className="px-3 py-2">{t('batch_detail.items.table.estimated_minutes')}</th>
                    <th className="px-3 py-2">{t('batch_detail.items.table.status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((link) => (
                    <tr key={link.id} className="border-t border-slate-800">
                      <td className="px-3 py-2 align-top text-xs text-slate-200">
                        <div className="font-medium">{link.orderItem.title}</div>
                        <div className="text-[11px] text-slate-400">
                          {t('batch_detail.items.order_prefix')}{' '}
                          <Link
                            href={`/orders/${link.orderItem.order.id}`}
                            className="text-sky-400 hover:underline"
                          >
                            {link.orderItem.order.id.slice(0, 8)}...
                          </Link>
                        </div>
                      </td>
                      <td className="px-3 py-2 align-top text-[11px] text-slate-300">
                        <div>{link.orderItem.template?.name ?? '-'}</div>
                        {link.orderItem.templateVariant && (
                          <div className="text-[11px] text-slate-400">
                            {t('batch_detail.items.variant_prefix').replace('{0}', link.orderItem.templateVariant.name)}
                          </div>
                        )}
                        {link.orderItem.material && (
                          <div className="text-[11px] text-slate-400">
                            {t('batch_detail.items.material_prefix').replace('{0}', link.orderItem.material.name)}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 align-top text-[11px] text-slate-300">
                        {link.orderItem.quantity}
                      </td>
                      <td className="px-3 py-2 align-top text-[11px] text-slate-300">
                        {link.orderItem.estimatedMinutes ?? '-'}
                      </td>
                      <td className="px-3 py-2 align-top text-[11px] text-slate-300">
                        {t(`order.status.${link.orderItem.order.status.toLowerCase()}` as any)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 rounded-lg border border-slate-800 bg-slate-900/60 p-3">
            <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">{t('batch_detail.offcuts.title')}</div>
            <p className="mb-2 text-[11px] text-slate-400">{t('batch_detail.offcuts.description')}</p>
            {offcutSuggestionsError && (
              <p className="mb-1 text-[11px] text-amber-300">{offcutSuggestionsError} – {t('batch_detail.offcuts.error_advice')}</p>
            )}
            {offcutSuggestions && offcutSuggestions.length === 0 && !offcutSuggestionsError && (
              <p className="text-[11px] text-slate-500">{t('batch_detail.offcuts.none')}</p>
            )}
            {offcutSuggestions && offcutSuggestions.length > 0 && (
              <div className="space-y-2">
                {offcutSuggestions.map((group) => (
                  <div
                    key={group.materialId}
                    className="rounded-md border border-slate-800 bg-slate-900/80 p-2"
                  >
                    <div className="mb-1 flex items-center justify-between text-[11px] text-slate-200">
                      <span>
                        {group.materialName} · {group.thicknessMm}mm
                      </span>
                      <span className="text-[10px] text-slate-400">{t('batch_detail.offcuts.top_n').replace('{0}', String(Math.min(group.suggestions.length, 5)))}</span>
                    </div>
                    <ul className="space-y-1 text-[11px]">
                      {group.suggestions.slice(0, 5).map((s) => {
                        const sizeLabel = (() => {
                          if (s.widthMm && s.heightMm) {
                            return `${s.widthMm} × ${s.heightMm} mm`;
                          }
                          if (s.estimatedAreaMm2) {
                            return `~${(s.estimatedAreaMm2 / 1_000_000).toFixed(2)} m²`;
                          }
                          return t('batch_detail.offcuts.dimensions_approx');
                        })();
                        return (
                          <li
                            key={s.offcutId}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-800 bg-slate-900/80 px-2 py-1"
                          >
                            <div className="space-y-0.5 text-slate-200">
                              <div>{sizeLabel}</div>
                              <div className="text-slate-400">
                                {s.locationLabel
                                  ? t('batch_detail.offcuts.location_prefix').replace('{0}', String(s.locationLabel))
                                  : t('batch_detail.offcuts.location_unknown')}
                              </div>
                              <div className="text-slate-400">{s.fitReason}</div>
                            </div>
                            <span className="text-[10px] text-slate-500">
                              {t('batch_detail.offcuts.see_details_note')}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'tasks' && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-200">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{t('batch_detail.tasks.title')}</div>
          </div>
          <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-300">
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder={t('batch_detail.tasks.add_placeholder')}
              className="w-64 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
            <button
              type="button"
              onClick={handleCreateTask}
              disabled={creatingTask}
              className="rounded-md bg-emerald-500 px-3 py-1 text-[11px] font-medium text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {creatingTask ? t('batch_detail.tasks.adding') : t('batch_detail.tasks.add')}
            </button>
          </div>
          {tasks.length === 0 && (
            <p className="text-[11px] text-slate-400">{t('batch_detail.tasks.none')}</p>
          )}
          {tasks.length > 0 && (
            <ul className="space-y-2">
              {tasks.map((task) => (
                <li
                  key={task.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2"
                >
                  <div className="space-y-0.5">
                    <div className="text-xs text-slate-200">{task.title}</div>
                    <div className="text-[11px] text-slate-500">
                      {t('batch_detail.tasks.status_prefix').replace('{0}', String(task.status))}
                      {task.assignedUser && (
                        <span className="ml-2">· {t('batch_detail.tasks.assigned_to').replace('{0}', String(task.assignedUser.name || task.assignedUser.email))}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1 text-[11px]">
                    <button
                      type="button"
                      onClick={() => handleUpdateTask(task.id, { status: 'TODO' })}
                      className="rounded-md border border-slate-700 px-2 py-0.5 hover:bg-slate-800"
                    >
                      {t('batch_detail.tasks.set.todo')}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateTask(task.id, { status: 'DOING' })}
                      className="rounded-md border border-sky-600 px-2 py-0.5 text-sky-300 hover:bg-sky-900/40"
                    >
                      {t('batch_detail.tasks.set.doing')}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateTask(task.id, { status: 'DONE' })}
                      className="rounded-md border border-emerald-600 px-2 py-0.5 text-emerald-300 hover:bg-emerald-900/40"
                    >
                      {t('batch_detail.tasks.set.done')}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {activeTab === 'forecast' && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-200">
          <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-slate-400">{t('batch_detail.forecast.title')}</div>
          <p className="mb-2 text-[11px] text-slate-400">{t('batch_detail.forecast.subtitle')}</p>
          {!forecast && (
            <p className="text-[11px] text-slate-400">{t('batch_detail.forecast.none_yet')}</p>
          )}
          {forecast && forecast.materials.length === 0 && (
            <p className="text-[11px] text-slate-400">{t('batch_detail.forecast.none_materials')}</p>
          )}
          {forecast && forecast.materials.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/60">
              <table className="min-w-full text-left text-xs text-slate-200">
                <thead className="border-b border-slate-800 bg-slate-900/80 text-[11px] uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-3 py-2">{t('batch_detail.forecast.table.material')}</th>
                    <th className="px-3 py-2">{t('batch_detail.forecast.table.estimated_usage')}</th>
                    <th className="px-3 py-2">{t('batch_detail.forecast.table.stock')}</th>
                    <th className="px-3 py-2">{t('batch_detail.forecast.table.risk')}</th>
                  </tr>
                </thead>
                <tbody>
                  {forecast.materials.map((m) => (
                    <tr key={m.materialId} className="border-t border-slate-800">
                      <td className="px-3 py-2 align-top text-xs text-slate-200">
                        <div className="font-medium">{m.materialName}</div>
                        <div className="text-[11px] text-slate-400">
                          {t('materials.table.unit')}: {formatUnitType(m.unitType)}
                        </div>
                      </td>
                      <td className="px-3 py-2 align-top text-[11px] text-slate-300">
                        {m.estimatedUnits != null
                          ? m.unitType === 'SHEET'
                            ? `${m.estimatedUnits.toFixed(2)} ${t('unit.sheet')}`
                            : `${m.estimatedUnits.toFixed(3)} ${t('unit.m2')}`
                          : '-'}
                      </td>
                      <td className="px-3 py-2 align-top text-[11px] text-slate-300">
                        {m.stockQty}
                      </td>
                      <td className="px-3 py-2 align-top text-[11px] text-slate-300">
                        <div
                          className={
                            m.status === 'AT_RISK'
                              ? 'text-red-300'
                              : m.status === 'LIKELY_ENOUGH'
                              ? 'text-emerald-300'
                              : 'text-slate-300'
                          }
                        >
                          {m.status === 'AT_RISK'
                            ? t('batch_detail.forecast.risk.at_risk')
                            : m.status === 'LIKELY_ENOUGH'
                            ? t('batch_detail.forecast.risk.likely_enough')
                            : t('batch_detail.forecast.risk.unknown')}
                        </div>
                        <div className="text-[10px] text-slate-500">{m.message}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
