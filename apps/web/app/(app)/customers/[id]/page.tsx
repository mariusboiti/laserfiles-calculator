'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '../../../../lib/api-client';

interface CustomerDetailOrder {
  id: string;
  status: string;
  priority: string;
  createdAt: string;
  notes: string | null;
  _count: {
    items: number;
  };
}

interface CustomerDetail {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  orders: CustomerDetailOrder[];
}

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await apiClient.get<CustomerDetail>(`/customers/${id}`);
        setCustomer(res.data);
        setName(res.data.name);
        setEmail(res.data.email ?? '');
        setPhone(res.data.phone ?? '');
        setNotes(res.data.notes ?? '');
      } catch (err: any) {
        const message = err?.response?.data?.message || 'Failed to load customer';
        setError(Array.isArray(message) ? message.join(', ') : String(message));
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !customer) return;
    if (!name.trim()) {
      setSaveError('Name is required');
      return;
    }

    setSaving(true);
    setSaveError(null);
    try {
      const body: any = {
        name: name.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        notes: notes.trim() || null,
      };

      const res = await apiClient.patch<CustomerDetail>(`/customers/${id}`, body);
      setCustomer(res.data);
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Failed to update customer';
      setSaveError(Array.isArray(message) ? message.join(', ') : String(message));
    } finally {
      setSaving(false);
    }
  }

  if (!id) {
    return <p className="text-sm text-red-400">Missing customer id in URL.</p>;
  }

  if (loading) {
    return <p className="text-sm text-slate-400">Loading customer...</p>;
  }

  if (error) {
    return <p className="text-sm text-red-400">{error}</p>;
  }

  if (!customer) {
    return <p className="text-sm text-slate-400">Customer not found.</p>;
  }

  const totalOrders = customer.orders.length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Link href="/customers" className="text-sky-400 hover:underline">
              Customers
            </Link>
            <span>/</span>
            <span>{customer.name}</span>
          </div>
          <h1 className="mt-1 text-xl font-semibold tracking-tight">{customer.name}</h1>
          {customer.email && (
            <p className="text-xs text-slate-400">{customer.email}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex rounded-full bg-slate-800 px-2 py-0.5">
            Orders: {totalOrders}
          </span>
          <span className="inline-flex rounded-full bg-slate-800 px-2 py-0.5">
            Created: {new Date(customer.createdAt).toLocaleString()}
          </span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <form
          onSubmit={handleSave}
          className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-200"
        >
          <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
            Edit customer
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
            className="rounded-md bg-sky-500 px-3 py-1 text-xs font-medium text-white hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </form>

        <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-200">
          <div className="mb-1 flex items-center justify-between gap-2">
            <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
              Orders for this customer
            </div>
            <div className="text-[11px] text-slate-500">Total: {totalOrders}</div>
          </div>

          {totalOrders === 0 && (
            <p className="text-xs text-slate-400">No orders for this customer yet.</p>
          )}

          {totalOrders > 0 && (
            <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/60">
              <table className="min-w-full text-left text-xs text-slate-200">
                <thead className="border-b border-slate-800 bg-slate-900/80 text-[11px] uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-3 py-2">Order</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Priority</th>
                    <th className="px-3 py-2">Items</th>
                    <th className="px-3 py-2">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {customer.orders.map((order) => (
                    <tr
                      key={order.id}
                      className="border-t border-slate-800 hover:bg-slate-800/60"
                    >
                      <td className="px-3 py-2 align-top">
                        <Link
                          href={`/orders/${order.id}`}
                          className="text-xs font-medium text-sky-400 hover:underline"
                        >
                          {order.id.slice(0, 8)}...
                        </Link>
                        {order.notes && (
                          <div className="text-[11px] text-slate-400">{order.notes}</div>
                        )}
                      </td>
                      <td className="px-3 py-2 align-top">
                        <span className="inline-flex rounded-full bg-slate-800 px-2 py-0.5 text-[11px]">
                          {order.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-3 py-2 align-top">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[11px] ${
                            order.priority === 'URGENT'
                              ? 'bg-red-500/20 text-red-300'
                              : 'bg-slate-800 text-slate-200'
                          }`}
                        >
                          {order.priority}
                        </span>
                      </td>
                      <td className="px-3 py-2 align-top text-xs text-slate-300">
                        {order._count.items}
                      </td>
                      <td className="px-3 py-2 align-top text-xs text-slate-400">
                        {new Date(order.createdAt).toLocaleString()}
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
