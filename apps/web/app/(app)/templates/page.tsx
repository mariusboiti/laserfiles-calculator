'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '../../../lib/api-client';

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
        setError(
          'Templates are not available on your current plan. Upgrade your membership to unlock this feature.',
        );
      } else {
        const message = data?.message || 'Failed to load templates';
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
      setCreateError('Name is required');
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
        setCreateError(
          'You cannot create templates on your current plan. Upgrade your membership to add more templates.',
        );
      } else if (data?.code === 'LIMIT_REACHED' && data?.limitKey === 'max_templates') {
        const limit = data?.limit;
        setCreateError(
          typeof limit === 'number'
            ? `You reached the maximum of ${limit} templates for your current plan. Delete an existing template or upgrade your membership to add more.`
            : 'You reached the maximum number of templates allowed for your current plan. Delete an existing template or upgrade your membership to add more.',
        );
      } else {
        const message = data?.message || 'Failed to create template';
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
          <h1 className="text-xl font-semibold tracking-tight">Templates</h1>
          <p className="mt-1 text-xs text-slate-400">
            Create reusable product templates with variants, personalization fields and pricing rules.
          </p>
        </div>
        <form onSubmit={handleFilterSubmit} className="flex flex-wrap items-center gap-2 text-sm">
          <input
            type="text"
            placeholder="Search name or description..."
            className="w-40 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 md:w-60"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
          >
            <option value="">All categories</option>
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
            <span>Only active</span>
          </label>
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
          onSubmit={handleCreateTemplate}
          className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-200"
        >
          <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
            Add template
          </div>
          <label className="flex flex-col gap-1">
            <span>Name *</span>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              required
            />
          </label>
          <label className="flex flex-col gap-1">
            <span>Category</span>
            <select
              value={newCategoryId}
              onChange={(e) => setNewCategoryId(e.target.value)}
              className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            >
              <option value="">(none)</option>
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
            {creating ? 'Creating…' : 'Create template'}
          </button>
        </form>

        <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-200">
          <div className="mb-1 flex items-center justify-between gap-2">
            <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
              Templates list
            </div>
            <div className="text-[11px] text-slate-500">Total: {templates.length}</div>
          </div>

          {loading && <p className="text-xs text-slate-400">Loading templates...</p>}
          {error && !loading && <p className="text-xs text-red-400">{error}</p>}

          {!loading && !error && templates.length === 0 && (
            <p className="text-xs text-slate-400">No templates found.</p>
          )}

          {!loading && !error && templates.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/60">
              <table className="min-w-full text-left text-xs text-slate-200">
                <thead className="border-b border-slate-800 bg-slate-900/80 text-[11px] uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Category</th>
                    <th className="px-3 py-2">Material</th>
                    <th className="px-3 py-2">Counts</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {templates.map((t) => (
                    <tr key={t.id} className="border-t border-slate-800 hover:bg-slate-800/60">
                      <td className="px-3 py-2 align-top text-xs font-medium text-slate-100">
                        <Link href={`/templates/${t.id}`} className="text-sky-400 hover:underline">
                          {t.name}
                        </Link>
                        <div className="text-[11px] text-slate-500">{t.slug}</div>
                      </td>
                      <td className="px-3 py-2 align-top text-xs text-slate-300">
                        {t.category ? t.category.name : '-'}
                      </td>
                      <td className="px-3 py-2 align-top text-xs text-slate-300">
                        {t.defaultMaterial ? t.defaultMaterial.name : '-'}
                      </td>
                      <td className="px-3 py-2 align-top text-[11px] text-slate-300">
                        <div>Variants: {t._count?.variants ?? 0}</div>
                        <div>Fields: {t._count?.fields ?? 0}</div>
                        <div>Rules: {t._count?.pricingRules ?? 0}</div>
                      </td>
                      <td className="px-3 py-2 align-top">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[11px] ${
                            t.isActive
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {t.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-3 py-2 align-top text-[11px] text-slate-400">
                        {new Date(t.createdAt).toLocaleString()}
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
