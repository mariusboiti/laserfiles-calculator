'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import {
  Activity, Wifi, WifiOff, Zap, Clock, AlertTriangle, TrendingUp,
  DollarSign, Package, ShoppingBag, Send, Plus, RefreshCw, ChevronRight,
  Monitor, Layers, BarChart3, CheckCircle, XCircle, Pause, Loader2,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────
interface MachineInfo {
  id: string; name: string; machineType: string | null;
  connectionStatus: 'ONLINE' | 'OFFLINE' | 'BUSY' | 'ERROR';
  lastJobAt: string | null;
}
interface JobInfo {
  id: string; jobName: string; status: string; productType: string | null;
  progressPct: number; estimatedTimeSec: number | null; createdAt: string;
  machine: { name: string };
}
interface DashboardData {
  machines: { total: number; online: number; busy: number; list: MachineInfo[] };
  production: { activeJobs: number; recentJobs: JobInfo[] };
  marketplace: { listings: Record<string, number> };
  trends: Array<{ periodStart: string; totalJobsCompleted: number; totalProfit: number | null; machineUtilization: number | null }>;
}

// ─── Helpers ─────────────────────────────────────────────────────
const statusColors: Record<string, string> = {
  ONLINE: 'bg-emerald-500', OFFLINE: 'bg-slate-600', BUSY: 'bg-amber-500', ERROR: 'bg-red-500',
  DRAFT: 'text-slate-400', QUEUED: 'text-sky-400', SENDING: 'text-amber-400',
  CUTTING: 'text-orange-400', ENGRAVING: 'text-violet-400', COMPLETED: 'text-emerald-400',
  FAILED: 'text-red-400', CANCELLED: 'text-slate-500', PAUSED: 'text-amber-300',
};
const statusIcons: Record<string, any> = {
  COMPLETED: CheckCircle, FAILED: XCircle, PAUSED: Pause,
  CUTTING: Zap, ENGRAVING: Zap, SENDING: Send, QUEUED: Clock,
};

function formatTime(sec: number | null) {
  if (!sec) return '—';
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.round(sec / 60)}m`;
  return `${(sec / 3600).toFixed(1)}h`;
}

// ─── Page ────────────────────────────────────────────────────────
export default function ProductionDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const fetchUser = useCallback(async () => {
    try {
      const res = await apiClient.get('/auth/me');
      setUserId(res.data?.user?.id || null);
      return res.data?.user?.id;
    } catch { return null; }
  }, []);

  const fetchDashboard = useCallback(async (uid: string) => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/business-intelligence/dashboard/${uid}`);
      setData(res.data);
      setError(null);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load dashboard');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    (async () => {
      const uid = await fetchUser();
      if (uid) await fetchDashboard(uid);
      else setLoading(false);
    })();
  }, [fetchUser, fetchDashboard]);

  const refresh = () => { if (userId) fetchDashboard(userId); };

  if (loading) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* WIP Banner */}
      <div className="flex items-center gap-3 rounded-xl border border-amber-700/40 bg-amber-900/15 px-4 py-3">
        <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400" />
        <div>
          <p className="text-sm font-semibold text-amber-300">Work in Progress</p>
          <p className="text-xs text-amber-400/70">This section is currently under development. Features shown here are not yet functional or tested. We are actively building this experience.</p>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
            <Activity className="h-7 w-7 text-sky-400" />
            Production Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-500">Laser machines, jobs, marketplace, and business intelligence</p>
        </div>
        <button onClick={refresh} className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 transition-colors">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-amber-800/50 bg-amber-900/20 p-4 text-sm text-amber-300">
          <AlertTriangle className="mr-2 inline h-4 w-4" /> {error}
        </div>
      )}

      {/* Top Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<Monitor className="h-5 w-5 text-sky-400" />} label="Machines" value={`${data?.machines.online || 0}/${data?.machines.total || 0} online`} sub={data?.machines.busy ? `${data.machines.busy} busy` : 'All idle'} accent="sky" />
        <StatCard icon={<Zap className="h-5 w-5 text-orange-400" />} label="Active Jobs" value={String(data?.production.activeJobs || 0)} sub="In progress" accent="orange" />
        <StatCard icon={<ShoppingBag className="h-5 w-5 text-emerald-400" />} label="Listings" value={String(data?.marketplace.listings?.published || 0)} sub={`${data?.marketplace.listings?.draft || 0} drafts`} accent="emerald" />
        <StatCard icon={<TrendingUp className="h-5 w-5 text-violet-400" />} label="30-Day Trend" value={data?.trends.length ? `${data.trends.reduce((s, t) => s + t.totalJobsCompleted, 0)} jobs` : '—'} sub="Completed" accent="violet" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Machines Panel */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-200">
              <Monitor className="h-4 w-4 text-sky-400" /> Laser Machines
            </h2>
            <a href="/studio/production/machines" className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300">
              Manage <ChevronRight className="h-3 w-3" />
            </a>
          </div>
          {data?.machines.list.length === 0 && (
            <div className="rounded-lg border border-dashed border-slate-700 p-6 text-center">
              <Monitor className="mx-auto h-8 w-8 text-slate-600 mb-2" />
              <p className="text-sm text-slate-500">No machines configured</p>
              <a href="/studio/production/machines" className="mt-2 inline-flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300"><Plus className="h-3 w-3" /> Add Machine</a>
            </div>
          )}
          <div className="space-y-2">
            {data?.machines.list.map(m => (
              <div key={m.id} className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-800/30 px-3 py-2">
                <div className={`h-2.5 w-2.5 rounded-full ${statusColors[m.connectionStatus] || 'bg-slate-600'}`} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-slate-200">{m.name}</div>
                  <div className="text-[10px] text-slate-500">{m.machineType || 'Unknown'} — {m.connectionStatus.toLowerCase()}</div>
                </div>
                {m.connectionStatus === 'ONLINE' && <Wifi className="h-3.5 w-3.5 text-emerald-500" />}
                {m.connectionStatus === 'OFFLINE' && <WifiOff className="h-3.5 w-3.5 text-slate-600" />}
                {m.connectionStatus === 'BUSY' && <Zap className="h-3.5 w-3.5 text-amber-500 animate-pulse" />}
              </div>
            ))}
          </div>
        </div>

        {/* Recent Jobs */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-200">
              <Layers className="h-4 w-4 text-orange-400" /> Recent Jobs
            </h2>
            <a href="/studio/production/jobs" className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300">
              All Jobs <ChevronRight className="h-3 w-3" />
            </a>
          </div>
          {(!data?.production.recentJobs || data.production.recentJobs.length === 0) && (
            <div className="rounded-lg border border-dashed border-slate-700 p-6 text-center">
              <Layers className="mx-auto h-8 w-8 text-slate-600 mb-2" />
              <p className="text-sm text-slate-500">No jobs yet</p>
              <p className="mt-1 text-xs text-slate-600">Generate a product and click &quot;Send to Laser&quot;</p>
            </div>
          )}
          <div className="space-y-1.5">
            {data?.production.recentJobs.map(job => {
              const Icon = statusIcons[job.status] || Clock;
              return (
                <div key={job.id} className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-800/20 px-3 py-2">
                  <Icon className={`h-4 w-4 shrink-0 ${statusColors[job.status] || 'text-slate-500'}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-slate-200">{job.jobName}</span>
                      {job.productType && <span className="shrink-0 rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400">{job.productType}</span>}
                    </div>
                    <div className="text-[10px] text-slate-500">{job.machine.name} — {formatTime(job.estimatedTimeSec)}</div>
                  </div>
                  {job.status === 'CUTTING' || job.status === 'ENGRAVING' ? (
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-700">
                        <div className="h-full rounded-full bg-sky-500 transition-all" style={{ width: `${job.progressPct}%` }} />
                      </div>
                      <span className="text-[10px] text-slate-400">{job.progressPct}%</span>
                    </div>
                  ) : (
                    <span className={`text-[10px] font-medium ${statusColors[job.status] || 'text-slate-500'}`}>{job.status}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Row: Marketplace + Trends */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Marketplace Overview */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-200">
              <ShoppingBag className="h-4 w-4 text-emerald-400" /> Marketplace
            </h2>
            <a href="/studio/production/marketplace" className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300">
              Manage <ChevronRight className="h-3 w-3" />
            </a>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {['published', 'draft', 'paused'].map(status => (
              <div key={status} className="rounded-lg border border-slate-800 bg-slate-800/30 p-3 text-center">
                <div className="text-xl font-bold text-slate-200">{data?.marketplace.listings?.[status] || 0}</div>
                <div className="text-[10px] text-slate-500 capitalize">{status}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <a href="/studio/production/marketplace" className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-emerald-700/50 bg-emerald-900/20 px-3 py-2 text-xs text-emerald-400 hover:bg-emerald-900/30 transition-colors">
              <Package className="h-3.5 w-3.5" /> View Listings
            </a>
          </div>
        </div>

        {/* Mini Trend Chart (text-based) */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-200">
              <BarChart3 className="h-4 w-4 text-violet-400" /> Business Trends
            </h2>
            <a href="/studio/production/analytics" className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300">
              Full Report <ChevronRight className="h-3 w-3" />
            </a>
          </div>
          {(!data?.trends || data.trends.length === 0) ? (
            <div className="rounded-lg border border-dashed border-slate-700 p-6 text-center">
              <BarChart3 className="mx-auto h-8 w-8 text-slate-600 mb-2" />
              <p className="text-sm text-slate-500">No analytics data yet</p>
              <p className="mt-1 text-xs text-slate-600">Complete laser jobs to build trend data</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {data.trends.slice(-7).map((t, i) => {
                const maxJobs = Math.max(...data.trends.map(x => x.totalJobsCompleted), 1);
                const barPct = (t.totalJobsCompleted / maxJobs) * 100;
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="w-14 shrink-0 text-[10px] text-slate-500">
                      {new Date(t.periodStart).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                    <div className="flex-1 h-3 rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full rounded-full bg-violet-600/60 transition-all" style={{ width: `${barPct}%` }} />
                    </div>
                    <span className="w-8 text-right text-[10px] text-slate-400">{t.totalJobsCompleted}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── StatCard ────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, accent }: { icon: React.ReactNode; label: string; value: string; sub: string; accent: string }) {
  return (
    <div className={`rounded-xl border border-slate-800 bg-slate-900/50 p-4`}>
      <div className="flex items-center gap-3">
        <div className={`rounded-lg bg-${accent}-900/30 p-2`}>{icon}</div>
        <div>
          <div className="text-xs text-slate-500">{label}</div>
          <div className="text-lg font-bold text-slate-100">{value}</div>
          <div className="text-[10px] text-slate-500">{sub}</div>
        </div>
      </div>
    </div>
  );
}
