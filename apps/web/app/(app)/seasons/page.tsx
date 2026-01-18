'use client';

import { FormEvent, useEffect, useState } from 'react';
import { apiClient } from '../../../lib/api-client';
import { useT } from '../i18n';

interface Season {
  id: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
  notes: string | null;
  createdAt: string;
  _count?: {
    orders: number;
    batches: number;
  };
  itemsCount?: number;
}

interface SeasonsListResponse {
  data: Season[];
  total: number;
}

export default function SeasonsPage() {
  const t = useT();
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function loadSeasons() {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<SeasonsListResponse>('/seasons');
      setSeasons(res.data.data);
    } catch (err: any) {
      const message = err?.response?.data?.message || t('seasons.failed_to_load');
      setError(Array.isArray(message) ? message.join(', ') : String(message));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSeasons();
  }, []);

  function resetForm() {
    setEditingId(null);
    setName('');
    setStartDate('');
    setEndDate('');
    setNotes('');
    setIsActive(false);
    setSaveError(null);
  }

  function startEdit(season: Season) {
    setEditingId(season.id);
    setName(season.name);
    setStartDate(season.startDate ? season.startDate.slice(0, 10) : '');
    setEndDate(season.endDate ? season.endDate.slice(0, 10) : '');
    setNotes(season.notes ?? '');
    setIsActive(season.isActive);
    setSaveError(null);
  }

  async function handleSaveSeason(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setSaveError(t('seasons.form.name_required'));
      return;
    }

    setSaving(true);
    setSaveError(null);
    try {
      if (editingId) {
        await apiClient.patch(`/seasons/${editingId}`, {
          name: name.trim(),
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          isActive,
          notes: notes.trim() || undefined,
        });
      } else {
        await apiClient.post('/seasons', {
          name: name.trim(),
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          isActive,
          notes: notes.trim() || undefined,
        });
      }
      resetForm();
      await loadSeasons();
    } catch (err: any) {
      const message = err?.response?.data?.message || t('seasons.failed_to_save');
      setSaveError(Array.isArray(message) ? message.join(', ') : String(message));
    } finally {
      setSaving(false);
    }
  }

  async function handleSetActive(id: string) {
    try {
      await apiClient.post(`/seasons/${id}/set-active`, {});
      await loadSeasons();
    } catch (err: any) {
      const message = err?.response?.data?.message || t('seasons.failed_to_set_active');
      alert(Array.isArray(message) ? message.join(', ') : String(message));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{t('seasons.title')}</h1>
          <p className="mt-1 text-xs text-slate-400">{t('seasons.subtitle')}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <form
          onSubmit={handleSaveSeason}
          className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-200"
        >
          <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{editingId ? t('seasons.form.edit') : t('seasons.form.create')}</div>
          <label className="flex flex-col gap-1">
            <span>{t('seasons.form.name')}</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
          </label>
          <div className="grid gap-2 md:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span>{t('seasons.form.start_date_optional')}</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span>{t('seasons.form.end_date_optional')}</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              />
            </label>
          </div>
          <label className="flex items-center gap-2 text-[11px] text-slate-300">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-3 w-3 rounded border-slate-600 bg-slate-900 text-sky-500"
            />
            <span>{t('seasons.form.set_active')}</span>
          </label>
          <label className="flex flex-col gap-1">
            <span>{t('seasons.form.notes')}</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
          </label>
          {saveError && <p className="text-[11px] text-red-400">{saveError}</p>}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-emerald-500 px-3 py-1 text-[11px] font-medium text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? t('common.saving') : editingId ? t('common.save_changes') : t('seasons.create')}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-md border border-slate-700 px-3 py-1 text-[11px] text-slate-200 hover:bg-slate-800"
              >
                {t('common.cancel')}
              </button>
            )}
          </div>
        </form>

        <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-200">
          <div className="mb-1 flex items-center justify-between gap-2">
            <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{t('seasons.list.title')}</div>
            {loading && <div className="text-[11px] text-slate-400">{t('seasons.loading')}</div>}
          </div>
          {error && <p className="text-[11px] text-red-400">{error}</p>}
          {!loading && !error && seasons.length === 0 && (
            <p className="text-[11px] text-slate-400">{t('seasons.none_found')}</p>
          )}
          {!loading && !error && seasons.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/60">
              <table className="min-w-full text-left text-xs text-slate-200">
                <thead className="border-b border-slate-800 bg-slate-900/80 text-[11px] uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-3 py-2">{t('seasons.table.season')}</th>
                    <th className="px-3 py-2">{t('seasons.table.dates')}</th>
                    <th className="px-3 py-2">{t('seasons.table.summary')}</th>
                    <th className="px-3 py-2">{t('seasons.table.batches')}</th>
                    <th className="px-3 py-2">{t('seasons.table.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {seasons.map((s) => (
                    <tr key={s.id} className="border-t border-slate-800">
                      <td className="px-3 py-2 align-top text-xs text-slate-200">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{s.name}</span>
                          {s.isActive && (
                            <span className="inline-flex rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-300">
                              {t('common.active')}
                            </span>
                          )}
                        </div>
                        {s.notes && (
                          <div className="mt-0.5 max-w-xs text-[11px] text-slate-400">
                            {s.notes}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 align-top text-[11px] text-slate-300">
                        <div>
                          {s.startDate
                            ? new Date(s.startDate).toLocaleDateString()
                            : '-'}
                          {' '}
                          –
                          {' '}
                          {s.endDate ? new Date(s.endDate).toLocaleDateString() : '-'}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {t('seasons.created_prefix').replace('{0}', new Date(s.createdAt).toLocaleDateString())}
                        </div>
                      </td>
                      <td className="px-3 py-2 align-top text-[11px] text-slate-300">
                        <div>{t('seasons.summary.orders_prefix').replace('{0}', String(s._count?.orders ?? 0))}</div>
                        <div>{t('seasons.summary.items_prefix').replace('{0}', String(s.itemsCount ?? 0))}</div>
                      </td>
                      <td className="px-3 py-2 align-top text-[11px] text-slate-300">
                        {s._count?.batches ?? 0}
                      </td>
                      <td className="px-3 py-2 align-top text-[11px] text-slate-300">
                        <button
                          type="button"
                          onClick={() => startEdit(s)}
                          className="mr-2 rounded-md border border-slate-700 px-2 py-0.5 text-[11px] hover:bg-slate-800"
                        >
                          {t('common.edit')}
                        </button>
                        {!s.isActive && (
                          <button
                            type="button"
                            onClick={() => handleSetActive(s.id)}
                            className="rounded-md border border-emerald-600 px-2 py-0.5 text-[11px] text-emerald-300 hover:bg-emerald-900/40"
                          >
                            {t('seasons.actions.set_active')}
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
      </div>
    </div>
  );
}
