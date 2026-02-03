'use client';

import { useEffect, useState } from 'react';
import { Users, CreditCard, TrendingUp, Clock } from 'lucide-react';
import Link from 'next/link';

interface Stats {
  totalUsers: number;
  usersByPlan: {
    ACTIVE: number;
    TRIALING: number;
    CANCELED: number;
    INACTIVE: number;
  };
  totalCreditsRemaining: number;
  totalCreditsUsed: number;
  totalCreditsGranted: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function fetchStats() {
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
        const res = await fetch(`${apiBase}/admin/stats`, { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to fetch stats');
        const data = await res.json();
        setStats(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-slate-400">Loading stats...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-800 bg-red-950/50 p-4 text-red-400">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
        <p className="text-slate-400">Overview of users and credits</p>
      </div>

      {/* Quick Search */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Search user by email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
        />
        <Link
          href={`/admin/users${searchQuery ? `?search=${encodeURIComponent(searchQuery)}` : ''}`}
          className="rounded-lg bg-sky-600 px-4 py-2 font-medium text-white hover:bg-sky-500"
        >
          Search
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Users"
          value={stats?.totalUsers ?? 0}
          icon={<Users className="h-5 w-5" />}
          color="sky"
        />
        <StatCard
          title="Active"
          value={stats?.usersByPlan.ACTIVE ?? 0}
          icon={<TrendingUp className="h-5 w-5" />}
          color="emerald"
        />
        <StatCard
          title="Trialing"
          value={stats?.usersByPlan.TRIALING ?? 0}
          icon={<Clock className="h-5 w-5" />}
          color="amber"
        />
        <StatCard
          title="Inactive"
          value={stats?.usersByPlan.INACTIVE ?? 0}
          icon={<Users className="h-5 w-5" />}
          color="slate"
        />
      </div>

      {/* Credits Overview */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-900/50 p-2">
              <CreditCard className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Total Credits Remaining</p>
              <p className="text-2xl font-bold text-white">
                {stats?.totalCreditsRemaining?.toLocaleString() ?? 0}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-sky-900/50 p-2">
              <CreditCard className="h-5 w-5 text-sky-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Total Credits Used</p>
              <p className="text-2xl font-bold text-white">
                {stats?.totalCreditsUsed?.toLocaleString() ?? 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Plan Distribution */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">Users by Plan</h2>
        <div className="grid gap-3 sm:grid-cols-4">
          <PlanBadge label="Active" count={stats?.usersByPlan.ACTIVE ?? 0} color="emerald" />
          <PlanBadge label="Trialing" count={stats?.usersByPlan.TRIALING ?? 0} color="amber" />
          <PlanBadge label="Canceled" count={stats?.usersByPlan.CANCELED ?? 0} color="red" />
          <PlanBadge label="Inactive" count={stats?.usersByPlan.INACTIVE ?? 0} color="slate" />
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: 'sky' | 'emerald' | 'amber' | 'slate';
}) {
  const colorClasses = {
    sky: 'bg-sky-900/50 text-sky-400',
    emerald: 'bg-emerald-900/50 text-emerald-400',
    amber: 'bg-amber-900/50 text-amber-400',
    slate: 'bg-slate-800 text-slate-400',
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
      <div className="flex items-center gap-3">
        <div className={`rounded-lg p-2 ${colorClasses[color]}`}>{icon}</div>
        <div>
          <p className="text-sm text-slate-400">{title}</p>
          <p className="text-2xl font-bold text-white">{value.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}

function PlanBadge({
  label,
  count,
  color,
}: {
  label: string;
  count: number;
  color: 'emerald' | 'amber' | 'red' | 'slate';
}) {
  const colorClasses = {
    emerald: 'bg-emerald-900/30 text-emerald-400 border-emerald-800',
    amber: 'bg-amber-900/30 text-amber-400 border-amber-800',
    red: 'bg-red-900/30 text-red-400 border-red-800',
    slate: 'bg-slate-800/50 text-slate-400 border-slate-700',
  };

  return (
    <div className={`rounded-lg border p-3 text-center ${colorClasses[color]}`}>
      <p className="text-2xl font-bold">{count}</p>
      <p className="text-sm">{label}</p>
    </div>
  );
}
