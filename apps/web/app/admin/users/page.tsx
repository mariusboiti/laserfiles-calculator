'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, ChevronLeft, ChevronRight } from 'lucide-react';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
  updatedAt: string;
  plan: string;
  aiCreditsTotal: number;
  aiCreditsUsed: number;
  aiCreditsRemaining: number;
  entitlementUpdatedAt: string | null;
}

interface UsersResponse {
  users: User[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export default function AdminUsersPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [data, setData] = useState<UsersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [planFilter, setPlanFilter] = useState(searchParams.get('plan') || '');
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);

  useEffect(() => {
    async function fetchUsers() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        if (planFilter) params.set('plan', planFilter);
        params.set('page', String(page));
        params.set('pageSize', '25');

        const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
        const res = await fetch(`${apiBase}/admin/users?${params.toString()}`, {
          credentials: 'include',
        });
        if (!res.ok) throw new Error('Failed to fetch users');
        const result = await res.json();
        setData(result);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchUsers();
  }, [search, planFilter, page]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (planFilter) params.set('plan', planFilter);
    router.push(`/admin/users?${params.toString()}`);
  };

  const getPlanBadgeClass = (plan: string) => {
    switch (plan) {
      case 'ACTIVE':
        return 'bg-emerald-900/40 text-emerald-300';
      case 'TRIALING':
        return 'bg-amber-900/40 text-amber-300';
      case 'CANCELED':
        return 'bg-red-900/40 text-red-300';
      default:
        return 'bg-slate-700 text-slate-300';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Users</h1>
        <p className="text-slate-400">Manage user accounts and entitlements</p>
      </div>

      {/* Filters */}
      <form onSubmit={handleSearch} className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search by email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
        />
        <select
          value={planFilter}
          onChange={(e) => {
            setPlanFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white focus:border-sky-500 focus:outline-none"
        >
          <option value="">All Plans</option>
          <option value="ACTIVE">Active</option>
          <option value="TRIALING">Trialing</option>
          <option value="CANCELED">Canceled</option>
          <option value="INACTIVE">Inactive</option>
        </select>
        <button
          type="submit"
          className="rounded-lg bg-sky-600 px-4 py-2 font-medium text-white hover:bg-sky-500"
        >
          Search
        </button>
      </form>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-slate-400">Loading users...</div>
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-800 bg-red-950/50 p-4 text-red-400">
          Error: {error}
        </div>
      ) : (
        <>
          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full">
              <thead className="bg-slate-900/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">Email</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">Plan</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">Credits</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">Updated</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {data?.users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-900/30">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-white">{user.email}</p>
                        <p className="text-sm text-slate-500">{user.name}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${getPlanBadgeClass(user.plan)}`}>
                        {user.plan}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-white">
                        {user.aiCreditsRemaining} / {user.aiCreditsTotal}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-400">
                      {user.entitlementUpdatedAt
                        ? new Date(user.entitlementUpdatedAt).toLocaleDateString()
                        : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/users/${user.id}`}
                        className="inline-flex items-center gap-1 rounded-lg bg-slate-700 px-3 py-1.5 text-sm text-white hover:bg-slate-600"
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
                {data?.users.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                      No users found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-400">
                Showing {(page - 1) * data.pageSize + 1} to{' '}
                {Math.min(page * data.pageSize, data.total)} of {data.total} users
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="inline-flex items-center gap-1 rounded-lg bg-slate-700 px-3 py-1.5 text-sm text-white hover:bg-slate-600 disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                  disabled={page === data.totalPages}
                  className="inline-flex items-center gap-1 rounded-lg bg-slate-700 px-3 py-1.5 text-sm text-white hover:bg-slate-600 disabled:opacity-50"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
