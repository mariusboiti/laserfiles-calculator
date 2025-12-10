'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '../../../lib/api-client';

type BatchStatus =
  | 'PLANNED'
  | 'READY'
  | 'IN_PROGRESS'
  | 'PAUSED'
  | 'DONE'
  | 'CANCELED';

type BatchPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

type BatchType = 'TEMPLATE_RUN' | 'MIXED' | 'CUSTOM';

interface SeasonOption {
  id: string;
  name: string;
  isActive: boolean;
}

interface TemplateOption {
  id: string;
  name: string;
}

interface BatchListItem {
  id: string;
  name: string;
  batchType: BatchType;
  status: BatchStatus;
  priority: BatchPriority;
  targetDate: string | null;
  createdAt: string;
  season: {
    id: string;
    name: string;
  } | null;
  _count: {
    items: number;
    tasks: number;
  };
  estimatedMinutesTotal?: number;
}

interface BatchesListResponse {
  data: BatchListItem[];
  total: number;
}

interface SeasonsListResponse {
  data: SeasonOption[];
  total: number;
}

interface TemplatesListResponse {
  data: TemplateOption[];
  total: number;
}

const BATCH_STATUS_OPTIONS: BatchStatus[] = [
  'PLANNED',
  'READY',
  'IN_PROGRESS',
  'PAUSED',
  'DONE',
  'CANCELED',
];

export default function BatchesPage() {
  const [batches, setBatches] = useState<BatchListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [seasons, setSeasons] = useState<SeasonOption[]>([]);
  const [templates, setTemplates] = useState<TemplateOption[]>([]);

  const [status, setStatus] = useState<string>('');
  const [seasonId, setSeasonId] = useState<string>('');
  const [templateId, setTemplateId] = useState<string>('');
  const [targetDateFrom, setTargetDateFrom] = useState<string>('');
  const [targetDateTo, setTargetDateTo] = useState<string>('');

  const [creatingName, setCreatingName] = useState('');
  const [creatingSeasonId, setCreatingSeasonId] = useState('');
  const [creatingBatchType, setCreatingBatchType] = useState<BatchType>('TEMPLATE_RUN');
  const [creatingPriority, setCreatingPriority] = useState<BatchPriority>('NORMAL');
  const [creatingTargetDate, setCreatingTargetDate] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  async function loadMeta() {
    try {
      const [seasonsRes, templatesRes] = await Promise.all([
        apiClient.get<SeasonsListResponse>('/seasons'),
        apiClient.get<TemplatesListResponse>('/templates', {
          params: { isActive: true },
        }),
      ]);
      setSeasons(seasonsRes.data.data);
      setTemplates(templatesRes.data.data);
    } catch (err: any) {
      // soft-fail meta; main list will still load
    }
  }

  async function loadBatches(params?: {
    status?: string;
    seasonId?: string;
    templateId?: string;
    targetDateFrom?: string;
    targetDateTo?: string;
  }) {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<BatchesListResponse>('/batches', {
        params: {
          ...(params?.status ? { status: params.status } : {}),
          ...(params?.seasonId ? { seasonId: params.seasonId } : {}),
          ...(params?.templateId ? { templateId: params.templateId } : {}),
          ...(params?.targetDateFrom ? { targetDateFrom: params.targetDateFrom } : {}),
          ...(params?.targetDateTo ? { targetDateTo: params.targetDateTo } : {}),
        },
      });
      setBatches(res.data.data);
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Failed to load batches';
      setError(Array.isArray(message) ? message.join(', ') : String(message));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMeta();
    loadBatches({ status, seasonId, templateId, targetDateFrom, targetDateTo });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleFilterSubmit(e: FormEvent) {
    e.preventDefault();
    loadBatches({ status, seasonId, templateId, targetDateFrom, targetDateTo });
  }

  async function handleCreateBatch(e: FormEvent) {
    e.preventDefault();
    if (!creatingName.trim()) {
      setCreateError('Batch name is required.');
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      await apiClient.post('/batches', {
        name: creatingName.trim(),
        seasonId: creatingSeasonId || undefined,
        batchType: creatingBatchType,
        priority: creatingPriority,
        targetDate: creatingTargetDate || undefined,
      });
      setCreatingName('');
      setCreatingSeasonId('');
      setCreatingTargetDate('');
      setCreatingBatchType('TEMPLATE_RUN');
      setCreatingPriority('NORMAL');
      await loadBatches({ status, seasonId, templateId, targetDateFrom, targetDateTo });
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Failed to create batch';
      setCreateError(Array.isArray(message) ? message.join(', ') : String(message));
    } finally {
      setCreating(false);
    }
  }

  async function handleQuickStatus(id: string, newStatus: BatchStatus) {
    try {
      await apiClient.patch(`/batches/${id}`, { status: newStatus });
      await loadBatches({ status, seasonId, templateId, targetDateFrom, targetDateTo });
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Failed to update batch status';
      alert(Array.isArray(message) ? message.join(', ') : String(message));
    }
  }

  function formatStatus(status: string): string {
    return status.replace(/_/g, ' ');
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Batches</h1>
          <p className="mt-1 text-xs text-slate-400">
            Group similar items into production batches so you can work more efficiently in busy
            seasons.
          </p>
        </div>
        <form
          onSubmit={handleFilterSubmit}
          className="flex flex-wrap items-center gap-2 text-xs text-slate-200"
        >
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
          >
            <option value="">All statuses</option>
            {BATCH_STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {formatStatus(s)}
              </option>
            ))}
          </select>
          <select
            value={seasonId}
            onChange={(e) => setSeasonId(e.target.value)}
            className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
          >
            <option value="">All seasons</option>
            {seasons.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {s.isActive ? ' (active)' : ''}
              </option>
            ))}
          </select>
          <select
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
            className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
          >
            <option value="">All templates</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={targetDateFrom}
            onChange={(e) => setTargetDateFrom(e.target.value)}
            className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
          />
          <input
            type="date"
            value={targetDateTo}
            onChange={(e) => setTargetDateTo(e.target.value)}
            className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
          />
          <button
            type="submit"
            className="rounded-md bg-sky-500 px-3 py-1 text-xs font-medium text-white hover:bg-sky-600"
          >
            Apply
          </button>
        </form>
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <form
          onSubmit={handleCreateBatch}
          className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-200"
        >
          <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
            Quick create batch
          </div>
          <label className="flex flex-col gap-1">
            <span>Batch name *</span>
            <input
              type="text"
              value={creatingName}
              onChange={(e) => setCreatingName(e.target.value)}
              className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span>Season (optional)</span>
            <select
              value={creatingSeasonId}
              onChange={(e) => setCreatingSeasonId(e.target.value)}
              className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            >
              <option value="">(none)</option>
              {seasons.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {s.isActive ? ' (active)' : ''}
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-2 md:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span>Batch type</span>
              <select
                value={creatingBatchType}
                onChange={(e) => setCreatingBatchType(e.target.value as BatchType)}
                className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              >
                <option value="TEMPLATE_RUN">Template run</option>
                <option value="MIXED">Mixed</option>
                <option value="CUSTOM">Custom</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span>Priority</span>
              <select
                value={creatingPriority}
                onChange={(e) => setCreatingPriority(e.target.value as BatchPriority)}
                className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              >
                <option value="LOW">Low</option>
                <option value="NORMAL">Normal</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </label>
          </div>
          <label className="flex flex-col gap-1">
            <span>Target date (optional)</span>
            <input
              type="date"
              value={creatingTargetDate}
              onChange={(e) => setCreatingTargetDate(e.target.value)}
              className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
          </label>
          {createError && <p className="text-[11px] text-red-400">{createError}</p>}
          <button
            type="submit"
            disabled={creating}
            className="rounded-md bg-emerald-500 px-3 py-1 text-[11px] font-medium text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {creating ? 'Creating…' : 'Create batch'}
          </button>
        </form>

        <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-200">
          <div className="mb-1 flex items-center justify-between gap-2">
            <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
              Batches
            </div>
            {loading && <div className="text-[11px] text-slate-400">Loading…</div>}
          </div>
          {error && <p className="text-[11px] text-red-400">{error}</p>}
          {!loading && !error && batches.length === 0 && (
            <p className="text-[11px] text-slate-400">No batches found.</p>
          )}
          {!loading && !error && batches.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/60">
              <table className="min-w-full text-left text-xs text-slate-200">
                <thead className="border-b border-slate-800 bg-slate-900/80 text-[11px] uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-3 py-2">Batch</th>
                    <th className="px-3 py-2">Season</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Priority</th>
                    <th className="px-3 py-2">Items</th>
                    <th className="px-3 py-2">Target date</th>
                    <th className="px-3 py-2">Est. minutes</th>
                    <th className="px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {batches.map((b) => (
                    <tr key={b.id} className="border-t border-slate-800">
                      <td className="px-3 py-2 align-top text-xs text-slate-200">
                        <div className="flex flex-col">
                          <Link
                            href={`/batches/${b.id}`}
                            className="font-medium text-sky-400 hover:underline"
                          >
                            {b.name}
                          </Link>
                          <span className="text-[10px] text-slate-500">
                            {b.batchType === 'TEMPLATE_RUN'
                              ? 'Template run'
                              : b.batchType === 'MIXED'
                              ? 'Mixed'
                              : 'Custom'}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2 align-top text-[11px] text-slate-300">
                        {b.season ? b.season.name : '-'}
                      </td>
                      <td className="px-3 py-2 align-top">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[11px] ${
                            b.status === 'IN_PROGRESS'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : b.status === 'READY'
                              ? 'bg-sky-500/20 text-sky-300'
                              : b.status === 'PLANNED'
                              ? 'bg-slate-800 text-slate-300'
                              : b.status === 'DONE'
                              ? 'bg-slate-700 text-slate-300'
                              : b.status === 'PAUSED'
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {formatStatus(b.status)}
                        </span>
                      </td>
                      <td className="px-3 py-2 align-top">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[11px] ${
                            b.priority === 'URGENT'
                              ? 'bg-red-500/20 text-red-300'
                              : b.priority === 'HIGH'
                              ? 'bg-amber-500/20 text-amber-300'
                              : b.priority === 'LOW'
                              ? 'bg-slate-800 text-slate-300'
                              : 'bg-slate-700 text-slate-200'
                          }`}
                        >
                          {b.priority}
                        </span>
                      </td>
                      <td className="px-3 py-2 align-top text-[11px] text-slate-300">
                        {b._count.items}
                      </td>
                      <td className="px-3 py-2 align-top text-[11px] text-slate-300">
                        {b.targetDate ? new Date(b.targetDate).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-3 py-2 align-top text-[11px] text-slate-300">
                        {typeof b.estimatedMinutesTotal === 'number'
                          ? b.estimatedMinutesTotal
                          : '-'}
                      </td>
                      <td className="px-3 py-2 align-top text-[11px] text-slate-300">
                        <button
                          type="button"
                          onClick={() => handleQuickStatus(b.id, 'READY')}
                          className="mr-1 rounded-md border border-sky-600 px-2 py-0.5 text-[11px] text-sky-300 hover:bg-sky-900/40"
                        >
                          Mark READY
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickStatus(b.id, 'IN_PROGRESS')}
                          className="mr-1 rounded-md border border-emerald-600 px-2 py-0.5 text-[11px] text-emerald-300 hover:bg-emerald-900/40"
                        >
                          In progress
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickStatus(b.id, 'DONE')}
                          className="rounded-md border border-slate-600 px-2 py-0.5 text-[11px] text-slate-200 hover:bg-slate-800"
                        >
                          Done
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
