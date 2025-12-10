'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '../../../lib/api-client';

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  createdAt: string;
  _count?: {
    orders: number;
  };
}

interface CustomersListResponse {
  data: Customer[];
  total: number;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function loadCustomers(params?: { search?: string }) {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<CustomersListResponse>('/customers', {
        params: params?.search ? { search: params.search } : undefined,
      });
      setCustomers(res.data.data);
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Failed to load customers';
      setError(Array.isArray(message) ? message.join(', ') : String(message));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCustomers();
  }, []);

  function handleSearchSubmit(e: FormEvent) {
    e.preventDefault();
    loadCustomers({ search });
  }

  async function handleCreateCustomer(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setSaveError('Name is required');
      return;
    }

    setSaving(true);
    setSaveError(null);
    try {
      const res = await apiClient.post<Customer>('/customers', {
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      setCustomers((prev) => [res.data, ...prev]);
      setName('');
      setEmail('');
      setPhone('');
      setNotes('');
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Failed to create customer';
      setSaveError(Array.isArray(message) ? message.join(', ') : String(message));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Customers</h1>
          <p className="mt-1 text-xs text-slate-400">
            Manage your customers so you can attach them to orders.
          </p>
        </div>
        <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-2 text-sm">
          <input
            type="text"
            placeholder="Search name, email or phone..."
            className="w-40 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 md:w-60"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button
            type="submit"
            className="rounded-md bg-sky-500 px-3 py-1 text-xs font-medium text-white hover:bg-sky-600"
          >
            Search
          </button>
        </form>
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <form
          onSubmit={handleCreateCustomer}
          className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-200"
        >
          <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
            Add customer
          </div>
          <label className="flex flex-col gap-1">
            <span>Name *</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              required
            />
          </label>
          <label className="flex flex-col gap-1">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span>Phone</span>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span>Notes</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
          </label>
          {saveError && <p className="text-[11px] text-red-400">{saveError}</p>}
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-emerald-500 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save customer'}
          </button>
        </form>

        <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-200">
          <div className="mb-1 flex items-center justify-between gap-2">
            <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
              Customers list
            </div>
            <div className="text-[11px] text-slate-500">Total: {customers.length}</div>
          </div>

          {loading && <p className="text-xs text-slate-400">Loading customers...</p>}
          {error && !loading && <p className="text-xs text-red-400">{error}</p>}

          {!loading && !error && customers.length === 0 && (
            <p className="text-xs text-slate-400">No customers found.</p>
          )}

          {!loading && !error && customers.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/60">
              <table className="min-w-full text-left text-xs text-slate-200">
                <thead className="border-b border-slate-800 bg-slate-900/80 text-[11px] uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Contact</th>
                    <th className="px-3 py-2">Notes</th>
                    <th className="px-3 py-2">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => (
                    <tr key={c.id} className="border-t border-slate-800 hover:bg-slate-800/60">
                      <td className="px-3 py-2 align-top text-xs font-medium text-slate-100">
                        <Link
                          href={`/customers/${c.id}`}
                          className="text-sky-400 hover:underline"
                        >
                          {c.name}
                        </Link>
                      </td>
                      <td className="px-3 py-2 align-top text-xs text-slate-300">
                        {c.email && <div>{c.email}</div>}
                        {c.phone && (
                          <div className="text-[11px] text-slate-400">{c.phone}</div>
                        )}
                        {!c.email && !c.phone && <div className="text-slate-400">-</div>}
                      </td>
                      <td className="px-3 py-2 align-top text-xs text-slate-300 max-w-xs">
                        {c.notes ?? '-'}
                      </td>
                      <td className="px-3 py-2 align-top text-xs text-slate-400">
                        <div>{new Date(c.createdAt).toLocaleString()}</div>
                        {typeof c._count?.orders === 'number' && (
                          <div className="text-[11px] text-slate-500">
                            Orders: {c._count.orders}
                          </div>
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
