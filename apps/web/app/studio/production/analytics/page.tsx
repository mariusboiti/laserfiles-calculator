'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import {
  BarChart3, TrendingUp, DollarSign, Clock, AlertTriangle, ArrowLeft,
  Loader2, Package, Layers, Activity, Target, RefreshCw,
} from 'lucide-react';

interface ProfitReport {
  period: string; totalJobs: number; totalCost: number;
  byProduct: Array<{ type: string; count: number; totalCost: number; avgTime: number; totalArea: number }>;
  byMaterial: Array<{ material: string; count: number; totalCost: number }>;
}

interface Snapshot {
  totalJobsCompleted: number; totalJobsFailed: number;
  totalMachineTimeSec: number; machineUtilization: number | null;
  totalRevenue: number | null; totalCosts: number | null; totalProfit: number | null;
  avgProfitMargin: number | null; totalListingsActive: number;
  avgJobTimeSec: number | null;
  topProductsJson: Array<{ productType: string; count: number; cost: number }> | null;
  topMaterialsJson: Array<{ material: string; count: number; cost: number }> | null;
  bottlenecksJson: Array<{ type: string; description: string; severity: string }> | null;
}

function formatTime(sec: number | null) {
  if (!sec) return '--';
  if (sec < 60) return sec + 's';
  if (sec < 3600) return Math.round(sec / 60) + 'm';
  return (sec / 3600).toFixed(1) + 'h';
}

export default function AnalyticsPage() {
  const [profitReport, setProfitReport] = useState<ProfitReport | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const fetchUser = useCallback(async () => {
    try {
      const res = await apiClient.get('/auth/me');
      const uid = res.data?.user?.id;
      setUserId(uid);
      return uid;
    } catch { return null; }
  }, []);

  const fetchData = useCallback(async (uid: string) => {
    try {
      setLoading(true);
      const res = await apiClient.get('/business-intelligence/profitability/' + uid);
      setProfitReport(res.data);
    } catch {} finally { setLoading(false); }
  }, []);

  const generateSnapshot = async () => {
    if (!userId) return;
    setGenerating(true);
    try {
      const res = await apiClient.post('/business-intelligence/snapshot/' + userId + '?period=monthly');
      setSnapshot(res.data);
    } catch {} finally { setGenerating(false); }
  };

  useEffect(() => {
    (async () => {
      const uid = await fetchUser();
      if (uid) await fetchData(uid);
      else setLoading(false);
    })();
  }, [fetchUser, fetchData]);

  if (loading) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <a href="/studio/production" className="mb-2 flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300">
            <ArrowLeft className="h-3 w-3" /> Production Dashboard
          </a>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
            <BarChart3 className="h-7 w-7 text-violet-400" /> Business Analytics
          </h1>
          <p className="mt-1 text-sm text-slate-500">Profitability, trends, and bottleneck detection</p>
        </div>
        <button onClick={generateSnapshot} disabled={generating} className="flex items-center gap-2 rounded-lg border border-violet-700/50 bg-violet-900/20 px-4 py-2 text-sm text-violet-400 hover:bg-violet-900/30 disabled:opacity-50 transition-colors">
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Generate Snapshot
        </button>
      </div>

      {/* Snapshot Card */}
      {snapshot && (
        <div className="rounded-xl border border-violet-800/30 bg-violet-900/10 p-5 space-y-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-violet-300">
            <Activity className="h-4 w-4" /> Latest Snapshot
          </h2>
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-lg border border-slate-800 bg-slate-800/30 p-3 text-center">
              <div className="text-xl font-bold text-emerald-400">{snapshot.totalJobsCompleted}</div>
              <div className="text-[10px] text-slate-500">Jobs Completed</div>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-800/30 p-3 text-center">
              <div className="text-xl font-bold text-red-400">{snapshot.totalJobsFailed}</div>
              <div className="text-[10px] text-slate-500">Jobs Failed</div>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-800/30 p-3 text-center">
              <div className="text-xl font-bold text-sky-400">{snapshot.machineUtilization != null ? Math.round(snapshot.machineUtilization * 100) + '%' : '--'}</div>
              <div className="text-[10px] text-slate-500">Machine Utilization</div>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-800/30 p-3 text-center">
              <div className="text-xl font-bold text-emerald-400">${snapshot.totalProfit != null ? Number(snapshot.totalProfit).toFixed(0) : '--'}</div>
              <div className="text-[10px] text-slate-500">Est. Profit</div>
            </div>
          </div>

          {/* Top Products */}
          {snapshot.topProductsJson && snapshot.topProductsJson.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-medium text-slate-400">Top Products</h3>
              <div className="space-y-1">
                {snapshot.topProductsJson.map((p, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="w-4 text-right text-[10px] text-slate-600">{i + 1}</span>
                    <div className="flex-1 h-3 rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full rounded-full bg-violet-600/50" style={{ width: `${(p.count / (snapshot.topProductsJson?.[0]?.count || 1)) * 100}%` }} />
                    </div>
                    <span className="w-28 truncate text-[10px] text-slate-400">{p.productType}</span>
                    <span className="w-8 text-right text-[10px] text-slate-300 font-medium">{p.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bottlenecks */}
          {snapshot.bottlenecksJson && snapshot.bottlenecksJson.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-medium text-amber-400 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Bottlenecks Detected
              </h3>
              <div className="space-y-1">
                {snapshot.bottlenecksJson.map((b, i) => (
                  <div key={i} className={`rounded-lg border px-3 py-2 text-xs ${
                    b.severity === 'high' ? 'border-red-800/40 bg-red-900/10 text-red-400' :
                    b.severity === 'medium' ? 'border-amber-800/40 bg-amber-900/10 text-amber-400' :
                    'border-slate-800 bg-slate-800/20 text-slate-400'
                  }`}>
                    {b.description}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Profitability Report */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* By Product */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-200">
            <Package className="h-4 w-4 text-emerald-400" /> Profitability by Product
          </h2>
          {(!profitReport?.byProduct || profitReport.byProduct.length === 0) ? (
            <div className="rounded-lg border border-dashed border-slate-700 p-6 text-center">
              <Target className="mx-auto h-8 w-8 text-slate-600 mb-2" />
              <p className="text-sm text-slate-500">No completed jobs yet</p>
              <p className="mt-1 text-xs text-slate-600">Complete laser jobs to build profitability data</p>
            </div>
          ) : (
            <div className="space-y-2">
              {profitReport.byProduct.map((p, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-800/20 px-3 py-2">
                  <span className="w-4 text-right text-[10px] text-slate-600 font-medium">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium text-slate-200">{p.type}</div>
                    <div className="text-[10px] text-slate-500">{p.count} jobs / avg {formatTime(p.avgTime)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-medium text-emerald-400">${p.totalCost.toFixed(2)}</div>
                    <div className="text-[10px] text-slate-500">total cost</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* By Material */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-200">
            <Layers className="h-4 w-4 text-sky-400" /> Cost by Material
          </h2>
          {(!profitReport?.byMaterial || profitReport.byMaterial.length === 0) ? (
            <div className="rounded-lg border border-dashed border-slate-700 p-6 text-center">
              <Target className="mx-auto h-8 w-8 text-slate-600 mb-2" />
              <p className="text-sm text-slate-500">No material data yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {profitReport.byMaterial.map((m, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-800/20 px-3 py-2">
                  <span className="w-4 text-right text-[10px] text-slate-600 font-medium">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium text-slate-200">{m.material}</div>
                    <div className="text-[10px] text-slate-500">{m.count} jobs</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-medium text-sky-400">${m.totalCost.toFixed(2)}</div>
                    <div className="text-[10px] text-slate-500">material cost</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Summary */}
      {profitReport && profitReport.totalJobs > 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-200">
            <DollarSign className="h-4 w-4 text-emerald-400" /> 30-Day Summary
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-slate-800 bg-slate-800/30 p-4 text-center">
              <div className="text-2xl font-bold text-slate-100">{profitReport.totalJobs}</div>
              <div className="text-xs text-slate-500">Total Jobs</div>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-800/30 p-4 text-center">
              <div className="text-2xl font-bold text-emerald-400">${profitReport.totalCost.toFixed(2)}</div>
              <div className="text-xs text-slate-500">Total Production Cost</div>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-800/30 p-4 text-center">
              <div className="text-2xl font-bold text-violet-400">{profitReport.byProduct.length}</div>
              <div className="text-xs text-slate-500">Product Types</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
