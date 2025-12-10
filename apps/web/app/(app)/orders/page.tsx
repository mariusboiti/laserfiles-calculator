'use client';

import { useEffect, useState, FormEvent } from 'react';
import Link from 'next/link';
import { apiClient } from '../../../lib/api-client';

interface OrderListItem {
  id: string;
  status: string;
  priority: string;
  notes: string | null;
  createdAt: string;
  customer: {
    id: string;
    name: string;
    email: string | null;
  };
  _count: {
    items: number;
  };
}

interface OrdersListResponse {
  data: OrderListItem[];
  total: number;
  page: number;
  pageSize: number;
}

const STATUS_OPTIONS = ['ALL', 'NEW', 'IN_PROGRESS', 'WAITING_MATERIALS', 'READY', 'SHIPPED', 'COMPLETED', 'CANCELED'] as const;

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');

  async function loadOrders(params?: { status?: string; search?: string }) {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<OrdersListResponse>('/orders', {
        params: {
          ...(params?.status && params.status !== 'ALL' ? { status: params.status } : {}),
          ...(params?.search ? { search: params.search } : {}),
        },
      });
      setOrders(res.data.data);
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Failed to load orders';
      setError(Array.isArray(message) ? message.join(', ') : String(message));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders({ status, search });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleFilterSubmit(e: FormEvent) {
    e.preventDefault();
    loadOrders({ status, search });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold tracking-tight">Orders</h1>
          <Link
            href="/orders/new"
            className="rounded-md bg-emerald-500 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-600"
          >
            New order
          </Link>
        </div>
        <form onSubmit={handleFilterSubmit} className="flex flex-wrap items-center gap-2 text-sm">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s === 'ALL' ? 'All statuses' : s.replace('_', ' ')}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Search customer or notes..."
            className="w-40 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 md:w-60"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button
            type="submit"
            className="rounded-md bg-sky-500 px-3 py-1 text-xs font-medium text-white hover:bg-sky-600"
          >
            Apply
          </button>
        </form>
      </div>

      {loading && <p className="text-sm text-slate-400">Loading orders...</p>}
      {error && !loading && <p className="text-sm text-red-400">{error}</p>}

      {!loading && !error && orders.length === 0 && (
        <p className="text-sm text-slate-400">No orders found.</p>
      )}

      {!loading && !error && orders.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60">
          <table className="min-w-full text-left text-xs text-slate-200">
            <thead className="border-b border-slate-800 bg-slate-900/80 text-[11px] uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-3 py-2">Order</th>
                <th className="px-3 py-2">Customer</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Priority</th>
                <th className="px-3 py-2">Items</th>
                <th className="px-3 py-2">Created</th>
                <th className="px-3 py-2">Notes</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-t border-slate-800 hover:bg-slate-800/60">
                  <td className="px-3 py-2 align-top">
                    <Link
                      href={`/orders/${order.id}`}
                      className="text-xs font-medium text-sky-400 hover:underline"
                    >
                      {order.id.slice(0, 8)}...
                    </Link>
                  </td>
                  <td className="px-3 py-2 align-top">
                    <div className="text-xs font-medium">{order.customer.name}</div>
                    {order.customer.email && (
                      <div className="text-[11px] text-slate-400">{order.customer.email}</div>
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
                  <td className="px-3 py-2 align-top text-xs text-slate-300">{order._count.items}</td>
                  <td className="px-3 py-2 align-top text-xs text-slate-400">
                    {new Date(order.createdAt).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 align-top max-w-xs text-xs text-slate-300">
                    {order.notes ?? '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
