'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '../../../lib/api-client';
import { useT } from '../i18n';

interface TemplateCategory {
  id: string;
  name: string;
}

interface TemplateListItem {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  category?: TemplateCategory | null;
  defaultMaterial?: {
    id: string;
    name: string;
  } | null;
  _count?: {
    variants: number;
    fields: number;
    pricingRules: number;
  };
  createdAt: string;
}

interface TemplatesListResponse {
  data: TemplateListItem[];
  total: number;
}

export default function TemplatesPage() {
  const t = useT();
  const [templates, setTemplates] = useState<TemplateListItem[]>([]);
  const [categories, setCategories] = useState<TemplateCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [onlyActive, setOnlyActive] = useState(true);

  const [newName, setNewName] = useState('');
  const [newCategoryId, setNewCategoryId] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  async function loadTemplates(params?: { search?: string; categoryId?: string; isActive?: boolean }) {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<TemplatesListResponse>('/templates', {
        params: {
          ...(params?.search ? { search: params.search } : {}),
          ...(params?.categoryId ? { categoryId: params.categoryId } : {}),
          ...(typeof params?.isActive === 'boolean' ? { isActive: params.isActive } : {}),
        },
      });
      setTemplates(res.data.data);
    } catch (err: any) {
      const data = err?.response?.data;
      if (data?.code === 'FEATURE_LOCKED') {
        setError(t('templates.feature_locked'));
      } else {
        const message = data?.message || t('templates.failed_to_load');
        setError(Array.isArray(message) ? message.join(', ') : String(message));
      }
    } finally {
      setLoading(false);
    }
  }

  async function loadCategories() {
    try {
      const res = await apiClient.get<TemplateCategory[]>('/template-categories');
      setCategories(res.data);
    } catch {
      // ignore; categories are optional for the list view
    }
  }

  useEffect(() => {
    loadTemplates({ isActive: true });
    loadCategories();
  }, []);

  function handleFilterSubmit(e: FormEvent) {
    e.preventDefault();
    loadTemplates({
      search,
      categoryId: categoryId || undefined,
      isActive: onlyActive ? true : undefined,
    });
  }

  async function handleCreateTemplate(e: FormEvent) {
    e.preventDefault();
    if (!newName.trim()) {
      setCreateError(t('templates.form.name_required'));
      return;
    }

    setCreating(true);
    setCreateError(null);
    try {
      const body: any = {
        name: newName.trim(),
      };
      if (newCategoryId) {
        body.categoryId = newCategoryId;
      }
      const res = await apiClient.post<TemplateListItem>('/templates', body);
      setTemplates((prev) => [res.data, ...prev]);
      setNewName('');
      setNewCategoryId('');
    } catch (err: any) {
      const data = err?.response?.data;
      if (data?.code === 'FEATURE_LOCKED') {
        setCreateError(t('templates.create_locked'));
      } else if (data?.code === 'LIMIT_REACHED' && data?.limitKey === 'max_templates') {
        const limit = data?.limit;
        setCreateError(
          typeof limit === 'number'
            ? t('templates.limit_reached_with_limit').replace('{0}', String(limit))
            : t('templates.limit_reached_generic'),
        );
      } else {
        const message = data?.message || t('templates.failed_to_create');
        setCreateError(Array.isArray(message) ? message.join(', ') : String(message));
      }
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{t('templates.title')}</h1>
          <p className="mt-1 text-xs text-slate-400">{t('templates.subtitle')}</p>
        </div>
        <form onSubmit={handleFilterSubmit} className="flex flex-wrap items-center gap-2 text-sm">
          <input
            type="text"
            placeholder={t('templates.search_placeholder')}
            className="w-40 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 md:w-60"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
          >
            <option value="">{t('templates.filters.all_categories')}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-1 text-xs text-slate-300">
            <input
              type="checkbox"
              checked={onlyActive}
              onChange={(e) => setOnlyActive(e.target.checked)}
              className="h-3 w-3 rounded border-slate-600 bg-slate-900 text-sky-500 focus:ring-sky-500"
            />
            <span>{t('templates.only_active')}</span>
          </label>
          <button
            type="submit"
            className="rounded-md bg-sky-500 px-3 py-1 text-xs font-medium text-white hover:bg-sky-600"
          >
            {t('templates.apply')}
          </button>
        </form>
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <form
          onSubmit={handleCreateTemplate}
          className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-200"
        >
          <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{t('templates.add_title')}</div>
          <label className="flex flex-col gap-1">
            <span>{t('templates.form.name')}</span>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              required
            />
          </label>
          <label className="flex flex-col gap-1">
            <span>{t('templates.form.category')}</span>
            <select
              value={newCategoryId}
              onChange={(e) => setNewCategoryId(e.target.value)}
              className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            >
              <option value="">{t('common.none')}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          {createError && <p className="text-[11px] text-red-400">{createError}</p>}
          <button
            type="submit"
            disabled={creating}
            className="rounded-md bg-emerald-500 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {creating ? t('templates.creating') : t('templates.create')}
          </button>
        </form>

        <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-200">
          <div className="mb-1 flex items-center justify-between gap-2">
            <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{t('templates.list_title')}</div>
            <div className="text-[11px] text-slate-500">{t('common.total').replace('{0}', String(templates.length))}</div>
          </div>

          {loading && <p className="text-xs text-slate-400">{t('templates.loading')}</p>}
          {error && !loading && <p className="text-xs text-red-400">{error}</p>}

          {!loading && !error && templates.length === 0 && (
            <p className="text-xs text-slate-400">{t('templates.none_found')}</p>
          )}

          {!loading && !error && templates.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/60">
              <table className="min-w-full text-left text-xs text-slate-200">
                <thead className="border-b border-slate-800 bg-slate-900/80 text-[11px] uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-3 py-2">{t('templates.table.name')}</th>
                    <th className="px-3 py-2">{t('templates.table.category')}</th>
                    <th className="px-3 py-2">{t('templates.table.material')}</th>
                    <th className="px-3 py-2">{t('templates.table.counts')}</th>
                    <th className="px-3 py-2">{t('templates.table.status')}</th>
                    <th className="px-3 py-2">{t('templates.table.created')}</th>
                  </tr>
                </thead>
                <tbody>
                  {templates.map((tpl) => (
                    <tr key={tpl.id} className="border-t border-slate-800 hover:bg-slate-800/60">
                      <td className="px-3 py-2 align-top text-xs font-medium text-slate-100">
                        <Link href={`/templates/${tpl.id}`} className="text-sky-400 hover:underline">
                          {tpl.name}
                        </Link>
                        <div className="text-[11px] text-slate-500">{tpl.slug}</div>
                      </td>
                      <td className="px-3 py-2 align-top text-xs text-slate-300">
                        {tpl.category ? tpl.category.name : '-'}
                      </td>
                      <td className="px-3 py-2 align-top text-xs text-slate-300">
                        {tpl.defaultMaterial ? tpl.defaultMaterial.name : '-'}
                      </td>
                      <td className="px-3 py-2 align-top text-[11px] text-slate-300">
                        <div>{t('templates.counts.variants').replace('{0}', String(tpl._count?.variants ?? 0))}</div>
                        <div>{t('templates.counts.fields').replace('{0}', String(tpl._count?.fields ?? 0))}</div>
                        <div>{t('templates.counts.rules').replace('{0}', String(tpl._count?.pricingRules ?? 0))}</div>
                      </td>
                      <td className="px-3 py-2 align-top">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[11px] ${
                            tpl.isActive
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {tpl.isActive ? t('common.active') : t('common.inactive')}
                        </span>
                      </td>
                      <td className="px-3 py-2 align-top text-[11px] text-slate-400">
                        {new Date(tpl.createdAt).toLocaleString()}
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
