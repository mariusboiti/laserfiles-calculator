'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import {
  Layers, ArrowLeft, Loader2, Zap, Clock, Send, CheckCircle, XCircle,
  Pause, AlertTriangle, RefreshCw, Ban, Play,
} from 'lucide-react';

interface Job {
  id: string; jobName: string; status: string; priority: string;
  productType: string | null; materialLabel: string | null;
  progressPct: number; currentOperation: string | null;
  estimatedTimeSec: number | null; actualTimeSec: number | null;
  speedMmS: number | null; powerPct: number | null;
  jobWidthMm: number | null; jobHeightMm: number | null;
  totalCost: number | null; materialCost: number | null; machineCost: number | null;
  safetyValidated: boolean; safetyWarningsJson: string[] | null;
  retryCount: number; errorMessage: string | null;
  createdAt: string; startedAt: string | null; completedAt: string | null;
  machine: { name: string; machineType: string | null; connectionStatus: string };
}

const statusColors: Record<string, string> = {
  DRAFT: 'bg-slate-700 text-slate-300', QUEUED: 'bg-sky-900/50 text-sky-400',
  VALIDATING: 'bg-amber-900/50 text-amber-400', SENDING: 'bg-amber-900/50 text-amber-300',
  CUTTING: 'bg-orange-900/50 text-orange-400', ENGRAVING: 'bg-violet-900/50 text-violet-400',
  PAUSED: 'bg-amber-900/50 text-amber-300', COMPLETED: 'bg-emerald-900/50 text-emerald-400',
  FAILED: 'bg-red-900/50 text-red-400', CANCELLED: 'bg-slate-800 text-slate-500',
};
const statusIcons: Record<string, any> = {
  DRAFT: Clock, QUEUED: Clock, SENDING: Send, CUTTING: Zap, ENGRAVING: Zap,
  COMPLETED: CheckCircle, FAILED: XCircle, PAUSED: Pause, CANCELLED: Ban,
};

function formatTime(sec: number | null) {
  if (!sec) return '--';
  if (sec < 60) return sec + 's';
  if (sec < 3600) return Math.round(sec / 60) + 'm';
  return (sec / 3600).toFixed(1) + 'h';
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [userId, setUserId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchUser = useCallback(async () => {
    try {
      const res = await apiClient.get('/auth/me');
      const uid = res.data?.user?.id;
      setUserId(uid);
      return uid;
    } catch { return null; }
  }, []);

  const fetchJobs = useCallback(async (uid?: string) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (uid) params.set('userId', uid);
      if (filter !== 'all') params.set('status', filter);
      params.set('limit', '50');
      const res = await apiClient.get('/laser-machines/jobs/list?' + params.toString());
      setJobs(res.data || []);
    } catch {} finally { setLoading(false); }
  }, [filter]);

  useEffect(() => {
    (async () => {
      const uid = await fetchUser();
      if (uid) await fetchJobs(uid);
      else setLoading(false);
    })();
  }, [fetchUser, fetchJobs]);

  const handleSend = async (jobId: string) => {
    setActionLoading(jobId);
    try {
      await apiClient.post('/laser-machines/jobs/' + jobId + '/send');
      if (userId) await fetchJobs(userId);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Send failed');
    } finally { setActionLoading(null); }
  };

  const handleCancel = async (jobId: string) => {
    if (!confirm('Cancel this job?')) return;
    setActionLoading(jobId);
    try {
      await apiClient.post('/laser-machines/jobs/' + jobId + '/cancel');
      if (userId) await fetchJobs(userId);
    } catch {} finally { setActionLoading(null); }
  };

  const filters = ['all', 'DRAFT', 'QUEUED', 'CUTTING', 'ENGRAVING', 'COMPLETED', 'FAILED'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <a href="/studio/production" className="mb-2 flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300">
            <ArrowLeft className="h-3 w-3" /> Production Dashboard
          </a>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
            <Layers className="h-7 w-7 text-orange-400" /> Laser Jobs
          </h1>
          <p className="mt-1 text-sm text-slate-500">Track and manage laser cutting jobs</p>
        </div>
        <button onClick={() => userId && fetchJobs(userId)} className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 transition-colors">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-1.5">
        {filters.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === f ? 'bg-sky-600 text-white' : 'border border-slate-700 text-slate-400 hover:bg-slate-800'
            }`}
          >
            {f === 'all' ? 'All' : f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      ) : jobs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700 p-12 text-center">
          <Layers className="mx-auto h-12 w-12 text-slate-600 mb-3" />
          <h3 className="text-lg font-medium text-slate-300">No jobs found</h3>
          <p className="mt-1 text-sm text-slate-500">
            {filter === 'all'
              ? 'Generate a product in Photo Product AI and click "Send to Laser"'
              : 'No jobs with status ' + filter}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {jobs.map(job => {
            const Icon = statusIcons[job.status] || Clock;
            const isActive = ['CUTTING', 'ENGRAVING', 'SENDING'].includes(job.status);
            return (
              <div key={job.id} className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
                <div className="flex items-start gap-4">
                  <div className={`mt-0.5 rounded-lg p-2 ${isActive ? 'bg-orange-900/30' : 'bg-slate-800/50'}`}>
                    <Icon className={`h-4 w-4 ${isActive ? 'text-orange-400 animate-pulse' : 'text-slate-500'}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="text-sm font-semibold text-slate-200">{job.jobName}</h3>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColors[job.status] || 'bg-slate-700 text-slate-400'}`}>
                        {job.status}
                      </span>
                      {job.priority !== 'NORMAL' && (
                        <span className="rounded bg-amber-900/30 px-1.5 py-0.5 text-[10px] text-amber-400">{job.priority}</span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
                      <span>Machine: <strong className="text-slate-300">{job.machine.name}</strong></span>
                      {job.productType && <span>Product: <strong className="text-slate-300">{job.productType}</strong></span>}
                      {job.materialLabel && <span>Material: <strong className="text-slate-300">{job.materialLabel}</strong></span>}
                      {job.jobWidthMm && job.jobHeightMm && <span>Size: <strong className="text-slate-300">{job.jobWidthMm}x{job.jobHeightMm}mm</strong></span>}
                      {job.speedMmS && <span>Speed: <strong className="text-slate-300">{job.speedMmS}mm/s</strong></span>}
                      {job.powerPct && <span>Power: <strong className="text-slate-300">{job.powerPct}%</strong></span>}
                    </div>

                    {/* Progress bar for active jobs */}
                    {isActive && (
                      <div className="mt-2 flex items-center gap-3">
                        <div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden">
                          <div className="h-full rounded-full bg-sky-500 transition-all duration-500" style={{ width: job.progressPct + '%' }} />
                        </div>
                        <span className="text-xs text-slate-400 font-medium">{job.progressPct}%</span>
                        {job.currentOperation && <span className="text-[10px] text-slate-500">{job.currentOperation}</span>}
                      </div>
                    )}

                    {/* Time + cost row */}
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
                      <span className="text-slate-500">Est: <strong className="text-slate-400">{formatTime(job.estimatedTimeSec)}</strong></span>
                      {job.actualTimeSec && <span className="text-slate-500">Actual: <strong className="text-emerald-400">{formatTime(job.actualTimeSec)}</strong></span>}
                      {job.totalCost && <span className="text-slate-500">Cost: <strong className="text-emerald-400">${Number(job.totalCost).toFixed(2)}</strong></span>}
                    </div>

                    {/* Warnings */}
                    {!job.safetyValidated && job.safetyWarningsJson && (
                      <div className="mt-2 space-y-0.5">
                        {(job.safetyWarningsJson as string[]).map((w, i) => (
                          <div key={i} className="flex items-center gap-1 text-[10px] text-amber-400">
                            <AlertTriangle className="h-3 w-3 shrink-0" /> {w}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Error */}
                    {job.errorMessage && (
                      <div className="mt-2 flex items-center gap-1 text-[10px] text-red-400">
                        <XCircle className="h-3 w-3 shrink-0" /> {job.errorMessage}
                        {job.retryCount > 0 && <span className="text-slate-500">(retry {job.retryCount})</span>}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex shrink-0 flex-col gap-1.5">
                    {job.status === 'DRAFT' && (
                      <button
                        onClick={() => handleSend(job.id)}
                        disabled={actionLoading === job.id}
                        className="flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-500 disabled:opacity-50"
                      >
                        {actionLoading === job.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                        Send to Laser
                      </button>
                    )}
                    {['DRAFT', 'QUEUED', 'CUTTING', 'ENGRAVING', 'SENDING', 'PAUSED'].includes(job.status) && (
                      <button
                        onClick={() => handleCancel(job.id)}
                        disabled={actionLoading === job.id}
                        className="flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-red-400/70 hover:text-red-400 hover:bg-slate-800 disabled:opacity-50"
                      >
                        <Ban className="h-3 w-3" /> Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
