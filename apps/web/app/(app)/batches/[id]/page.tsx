'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '../../../../lib/api-client';

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
  const params = useParams();
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
          const message = err?.response?.data?.message || 'Failed to load offcut suggestions';
          setOffcutSuggestions([]);
          setOffcutSuggestionsError(Array.isArray(message) ? message.join(', ') : String(message));
        }
      } catch (err: any) {
        const message = err?.response?.data?.message || 'Failed to load batch';
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
      const message = err?.response?.data?.message || 'Failed to update batch status';
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
      const message = err?.response?.data?.message || 'Failed to create task';
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
      const message = err?.response?.data?.message || 'Failed to update task';
      alert(Array.isArray(message) ? message.join(', ') : String(message));
    }
  }

  function formatStatus(status: string): string {
    return status.replace(/_/g, ' ');
  }

  if (!id) {
    return <div className="text-sm text-slate-400">Invalid batch id.</div>;
  }

  if (loading) {
    return <div className="text-sm text-slate-400">Loading batch…</div>;
  }

  if (error) {
    return <div className="text-sm text-red-400">{error}</div>;
  }

  if (!batch) {
    return <div className="text-sm text-slate-400">Batch not found.</div>;
  }

  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => t.status === 'DONE').length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Link href="/seasons" className="text-sky-400 hover:underline">
              Seasons &amp; Batches
            </Link>
            <span>/</span>
            <Link href="/batches" className="text-sky-400 hover:underline">
              Batches
            </Link>
            <span>/</span>
            <span>Batch detail</span>
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
              {batch.priority}
            </span>
            {batch.targetDate && (
              <span className="inline-flex rounded-full bg-slate-800 px-2 py-0.5 text-[11px]">
                Target: {new Date(batch.targetDate).toLocaleDateString()}
              </span>
            )}
            {batch.season && (
              <span className="inline-flex rounded-full bg-slate-900 px-2 py-0.5 text-[11px] text-slate-300">
                Season: {batch.season.name}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-300">
          <span className="text-slate-400">Quick status:</span>
          <button
            type="button"
            onClick={() => handleStatusChange('READY')}
            className="rounded-md border border-sky-600 px-2 py-0.5 text-[11px] text-sky-300 hover:bg-sky-900/40"
          >
            Mark READY
          </button>
          <button
            type="button"
            onClick={() => handleStatusChange('IN_PROGRESS')}
            className="rounded-md border border-emerald-600 px-2 py-0.5 text-[11px] text-emerald-300 hover:bg-emerald-900/40"
          >
            In progress
          </button>
          <button
            type="button"
            onClick={() => handleStatusChange('DONE')}
            className="rounded-md border border-slate-600 px-2 py-0.5 text-[11px] text-slate-200 hover:bg-slate-800"
          >
            Done
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
          Overview
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
          Items
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
          Tasks
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
          Material forecast
        </button>
      </div>

      {activeTab === 'overview' && (
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-200">
            <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">
              Summary
            </div>
            <div className="space-y-1">
              <div>Items in batch: {batch._count.items}</div>
              <div>Tasks: {totalTasks}</div>
              <div>
                Tasks done: {doneTasks} / {totalTasks}
              </div>
              <div>
                Estimated minutes total: {batch.estimatedMinutesTotal ?? 0}
              </div>
              <div>
                Actual minutes total: {batch.actualMinutesTotal ?? 0}
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-200">
            <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">
              Defaults
            </div>
            <div className="space-y-1">
              <div>Batch type: {batch.batchType}</div>
              <div>Default material: {batch.defaultMaterial?.name ?? '-'}</div>
              <div>Default variant: {batch.defaultVariant?.name ?? '-'}</div>
              {batch.notes && (
                <div className="mt-1 text-[11px] text-slate-300">Notes: {batch.notes}</div>
              )}
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-200">
            <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">
              Timing
            </div>
            <div className="space-y-1">
              <div>Created: {new Date(batch.createdAt).toLocaleString()}</div>
              {batch.targetDate && (
                <div>Target date: {new Date(batch.targetDate).toLocaleDateString()}</div>
              )}
              <div className="text-[11px] text-slate-400">
                These times are approximate and based on existing item estimates and time logs.
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'items' && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-200">
          <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-slate-400">
            Batch items
          </div>
          {items.length === 0 && (
            <p className="text-[11px] text-slate-400">No items linked to this batch yet.</p>
          )}
          {items.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/60">
              <table className="min-w-full text-left text-xs text-slate-200">
                <thead className="border-b border-slate-800 bg-slate-900/80 text-[11px] uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-3 py-2">Order / Item</th>
                    <th className="px-3 py-2">Template</th>
                    <th className="px-3 py-2">Qty</th>
                    <th className="px-3 py-2">Est. minutes</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((link) => (
                    <tr key={link.id} className="border-t border-slate-800">
                      <td className="px-3 py-2 align-top text-xs text-slate-200">
                        <div className="font-medium">{link.orderItem.title}</div>
                        <div className="text-[11px] text-slate-400">
                          Order{' '}
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
                            Variant: {link.orderItem.templateVariant.name}
                          </div>
                        )}
                        {link.orderItem.material && (
                          <div className="text-[11px] text-slate-400">
                            Material: {link.orderItem.material.name}
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
                        {link.orderItem.order.status.replace(/_/g, ' ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 rounded-lg border border-slate-800 bg-slate-900/60 p-3">
            <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">
              Suggested offcuts for this batch
            </div>
            <p className="mb-2 text-[11px] text-slate-400">
              Sugestii de resturi reutilizabile (offcuts) care pot acoperi aria aproximativă a
              item-elor din acest batch. Aceste estimări sunt orientative, nu nesting perfect.
            </p>
            {offcutSuggestionsError && (
              <p className="mb-1 text-[11px] text-amber-300">
                {offcutSuggestionsError} – producția poate continua și fără aceste sugestii.
              </p>
            )}
            {offcutSuggestions && offcutSuggestions.length === 0 && !offcutSuggestionsError && (
              <p className="text-[11px] text-slate-500">
                Nu există încă offcuts disponibile care să acopere aria necesară pentru acest
                batch. Poți înregistra resturi în secțiunea &quot;Scrap &amp; Offcuts&quot;.
              </p>
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
                      <span className="text-[10px] text-slate-400">
                        Top {Math.min(group.suggestions.length, 5)} offcuts
                      </span>
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
                          return 'dimensiuni aproximative';
                        })();
                        return (
                          <li
                            key={s.offcutId}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-800 bg-slate-900/80 px-2 py-1"
                          >
                            <div className="space-y-0.5 text-slate-200">
                              <div>{sizeLabel}</div>
                              <div className="text-slate-400">
                                {s.locationLabel ? `Locație: ${s.locationLabel}` : 'Locație necunoscută'}
                              </div>
                              <div className="text-slate-400">{s.fitReason}</div>
                            </div>
                            <span className="text-[10px] text-slate-500">
                              Vezi detalii și acțiuni în panoul &#34;Scrap &amp; Offcuts&#34; sau la nivel de
                              item de comandă.
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
            <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
              Batch tasks
            </div>
          </div>
          <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-300">
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="Add a checklist item: e.g. Cut all bases"
              className="w-64 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
            <button
              type="button"
              onClick={handleCreateTask}
              disabled={creatingTask}
              className="rounded-md bg-emerald-500 px-3 py-1 text-[11px] font-medium text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {creatingTask ? 'Adding…' : 'Add task'}
            </button>
          </div>
          {tasks.length === 0 && (
            <p className="text-[11px] text-slate-400">No tasks yet. Use the field above to add one.</p>
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
                      Status: {task.status}
                      {task.assignedUser && (
                        <span className="ml-2">
                          · Assigned to {task.assignedUser.name || task.assignedUser.email}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1 text-[11px]">
                    <button
                      type="button"
                      onClick={() => handleUpdateTask(task.id, { status: 'TODO' })}
                      className="rounded-md border border-slate-700 px-2 py-0.5 hover:bg-slate-800"
                    >
                      TODO
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateTask(task.id, { status: 'DOING' })}
                      className="rounded-md border border-sky-600 px-2 py-0.5 text-sky-300 hover:bg-sky-900/40"
                    >
                      Doing
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateTask(task.id, { status: 'DONE' })}
                      className="rounded-md border border-emerald-600 px-2 py-0.5 text-emerald-300 hover:bg-emerald-900/40"
                    >
                      Done
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
          <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-slate-400">
            Material forecast
          </div>
          <p className="mb-2 text-[11px] text-slate-400">
            This is a craft-friendly estimate based on template material hints and current stock.
            It is not a precise nesting optimizer.
          </p>
          {!forecast && (
            <p className="text-[11px] text-slate-400">
              No forecast data yet. Add items with templates that have material hints configured.
            </p>
          )}
          {forecast && forecast.materials.length === 0 && (
            <p className="text-[11px] text-slate-400">No materials found for this batch.</p>
          )}
          {forecast && forecast.materials.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/60">
              <table className="min-w-full text-left text-xs text-slate-200">
                <thead className="border-b border-slate-800 bg-slate-900/80 text-[11px] uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-3 py-2">Material</th>
                    <th className="px-3 py-2">Estimated usage</th>
                    <th className="px-3 py-2">Stock</th>
                    <th className="px-3 py-2">Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {forecast.materials.map((m) => (
                    <tr key={m.materialId} className="border-t border-slate-800">
                      <td className="px-3 py-2 align-top text-xs text-slate-200">
                        <div className="font-medium">{m.materialName}</div>
                        <div className="text-[11px] text-slate-400">Unit: {m.unitType}</div>
                      </td>
                      <td className="px-3 py-2 align-top text-[11px] text-slate-300">
                        {m.estimatedUnits != null
                          ? m.unitType === 'SHEET'
                            ? `${m.estimatedUnits.toFixed(2)} sheets`
                            : `${m.estimatedUnits.toFixed(3)} m²`
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
                            ? 'At risk'
                            : m.status === 'LIKELY_ENOUGH'
                            ? 'Likely enough'
                            : 'Unknown'}
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
