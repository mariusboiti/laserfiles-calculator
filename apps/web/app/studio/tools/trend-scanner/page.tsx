'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import {
  Activity, AlertTriangle, ArrowUpRight, BarChart3, Bell, BellRing,
  Calendar, ChevronRight, Clock, DollarSign, Eye, Filter,
  Flame, Globe, Layers, Loader2, Package, Radar, RefreshCw,
  Search, ShoppingBag, Sparkles, Star, Tag, Target, TrendingUp,
  Zap, CheckCircle, XCircle, ArrowDown, ArrowUp, Minus,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Opportunity {
  id: string;
  title: string;
  description: string;
  category: string;
  sources: string[];
  keywords: string[];
  trendStrength: number;
  growthVelocity: number;
  competitionDensity: number;
  profitPotential: number;
  seasonalityScore: number;
  overallScore: number;
  productIdeas: Array<{ name: string; type: string; difficulty: string; estimatedTimeMins: number; materialCost: number; suggestedPrice: number }>;
  recommendedSizes: Array<{ label: string; widthMm: number; heightMm: number }>;
  materialSuggestions: string[];
  styleHints: string[];
  priceRange: { low: number; mid: number; high: number; premium: number };
  peakMonths: number[];
  daysUntilPeak: number | null;
  isGapOpportunity: boolean;
  demandLevel: string;
  supplyLevel: string;
  gapDescription: string | null;
}

interface StyleTrend {
  name: string;
  description: string;
  strength: number;
  examples: string[];
  materials: string[];
}

interface SeasonalForecast {
  event: string;
  peakDate: string;
  daysUntil: number;
  relevantProducts: string[];
  expectedDemandBoost: number;
  preparationTip: string;
}

interface PriceInsight {
  category: string;
  avgPrice: number | null;
  avgMargin: number | null;
  priceCount: number;
}

interface ScanData {
  id: string;
  status: string;
  trendingProducts: Opportunity[];
  styleTrends: StyleTrend[];
  seasonalForecast: SeasonalForecast[];
  opportunityRadar: Opportunity[];
  priceInsights: PriceInsight[];
  sourceBreakdown: Record<string, number>;
  totalSignalsScanned: number;
  totalTrendsFound: number;
  scanDurationMs: number | null;
  createdAt: string;
  opportunities: Opportunity[];
}

interface TrendAlert {
  id: string;
  alertType: string;
  title: string;
  summary: string;
  isRead: boolean;
  createdAt: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  PRODUCT_TYPE: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
  DESIGN_THEME: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
  ENGRAVING_STYLE: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  MATERIAL: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  SEASONAL: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
  NICHE: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
};

const CATEGORY_LABELS: Record<string, string> = {
  PRODUCT_TYPE: 'Product', DESIGN_THEME: 'Design', ENGRAVING_STYLE: 'Style',
  MATERIAL: 'Material', SEASONAL: 'Seasonal', NICHE: 'Niche',
};

const SOURCE_ICONS: Record<string, string> = {
  ETSY: '🛍️', SHOPIFY: '🏪', AMAZON_HANDMADE: '📦', PINTEREST: '📌',
  TIKTOK: '🎵', INSTAGRAM: '📸', REDDIT: '💬', MAKER_FORUM: '🔧', FACEBOOK: '👥',
};

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function ScoreBar({ value, max = 100, color = 'sky' }: { value: number; max?: number; color?: string }) {
  const pct = Math.min(100, (value / max) * 100);
  const colorMap: Record<string, string> = {
    sky: 'bg-sky-500', emerald: 'bg-emerald-500', amber: 'bg-amber-500',
    rose: 'bg-rose-500', violet: 'bg-violet-500', orange: 'bg-orange-500',
  };
  return (
    <div className="h-1.5 w-full rounded-full bg-slate-800">
      <div className={`h-full rounded-full ${colorMap[color] || 'bg-sky-500'} transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 75 ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
    : score >= 50 ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
    : 'bg-slate-700/50 text-slate-400 border-slate-600/30';
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${color}`}>{score}</span>;
}

function CompetitionIndicator({ density }: { density: number }) {
  const level = density >= 70 ? { label: 'High', color: 'text-red-400', icon: ArrowUp }
    : density >= 40 ? { label: 'Medium', color: 'text-amber-400', icon: Minus }
    : { label: 'Low', color: 'text-emerald-400', icon: ArrowDown };
  const Icon = level.icon;
  return <span className={`flex items-center gap-0.5 text-[10px] font-medium ${level.color}`}><Icon className="h-2.5 w-2.5" />{level.label}</span>;
}

// ─── Panels ─────────────────────────────────────────────────────────────────

type PanelKey = 'trending' | 'styles' | 'seasonal' | 'opportunities' | 'pricing' | 'alerts';

// ─── Page ───────────────────────────────────────────────────────────────────

export default function TrendScannerPage() {
  const [scan, setScan] = useState<ScanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [activePanel, setActivePanel] = useState<PanelKey>('trending');
  const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null);
  const [alerts, setAlerts] = useState<TrendAlert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  const fetchLatest = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/trend-scanner/scan/latest');
      if (res.data) setScan(res.data);
    } catch {} finally { setLoading(false); }
  }, []);

  const fetchAlerts = useCallback(async () => {
    try {
      const [alertsRes, countRes] = await Promise.all([
        apiClient.get('/trend-scanner/alerts'),
        apiClient.get('/trend-scanner/alerts/unread-count'),
      ]);
      setAlerts(alertsRes.data || []);
      setUnreadCount(countRes.data?.count || 0);
    } catch {}
  }, []);

  useEffect(() => { fetchLatest(); fetchAlerts(); }, [fetchLatest, fetchAlerts]);

  const runScan = async () => {
    setScanning(true);
    try {
      const res = await apiClient.post('/trend-scanner/scan', { scanType: 'full' });
      setScan(res.data);
      fetchAlerts();
    } catch {} finally { setScanning(false); }
  };

  // ─── Filtered opportunities ───────────────────────────────────────────────
  const opportunities = scan?.opportunities || scan?.trendingProducts || [];
  const filtered = categoryFilter === 'ALL' ? opportunities : opportunities.filter(o => o.category === categoryFilter);
  const gapOpportunities = opportunities.filter(o => o.isGapOpportunity);
  const styleTrends = (scan?.styleTrends || []) as StyleTrend[];
  const seasonalForecast = (scan?.seasonalForecast || []) as SeasonalForecast[];
  const priceInsights = (scan?.priceInsights || []) as PriceInsight[];
  const sourceBreakdown = scan?.sourceBreakdown || {};

  // ─── Loading state ────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
    </div>
  );

  // ─── Panels config ────────────────────────────────────────────────────────
  const panels: Array<{ key: PanelKey; label: string; icon: any; count?: number }> = [
    { key: 'trending', label: 'Trending Products', icon: Flame, count: opportunities.length },
    { key: 'styles', label: 'Style Trends', icon: Layers, count: styleTrends.length },
    { key: 'seasonal', label: 'Seasonal Forecast', icon: Calendar, count: seasonalForecast.length },
    { key: 'opportunities', label: 'Opportunity Radar', icon: Radar, count: gapOpportunities.length },
    { key: 'pricing', label: 'Price Insights', icon: DollarSign, count: priceInsights.length },
    { key: 'alerts', label: 'Alerts', icon: Bell, count: unreadCount },
  ];

  return (
    <div className="space-y-6">
      {/* WIP Banner */}
      <div className="flex items-center gap-3 rounded-xl border border-amber-700/40 bg-amber-900/15 px-4 py-3">
        <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400" />
        <div>
          <p className="text-sm font-semibold text-amber-300">Work in Progress</p>
          <p className="text-xs text-amber-400/70">This tool is under active development. Features shown here are not yet fully functional or tested. We are actively building this experience.</p>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
            <Radar className="h-7 w-7 text-sky-400" />
            Laser Trend Scanner AI
          </h1>
          <p className="mt-1 text-sm text-slate-500">Actionable trend intelligence for your laser business</p>
        </div>
        <div className="flex items-center gap-3">
          {scan && (
            <div className="text-right text-[10px] text-slate-500">
              <div>Last scan: {new Date(scan.createdAt).toLocaleString()}</div>
              <div>{scan.totalSignalsScanned} signals · {scan.totalTrendsFound} trends · {scan.scanDurationMs ? `${(scan.scanDurationMs / 1000).toFixed(1)}s` : '—'}</div>
            </div>
          )}
          <button onClick={runScan} disabled={scanning} className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-sky-600 to-sky-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-500/20 hover:shadow-xl disabled:opacity-50 transition-all">
            {scanning ? <><Loader2 className="h-4 w-4 animate-spin" /> Scanning...</> : <><Sparkles className="h-4 w-4" /> Run Trend Scan</>}
          </button>
        </div>
      </div>

      {/* Source breakdown */}
      {scan && Object.keys(sourceBreakdown).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(sourceBreakdown).map(([source, count]) => (
            <div key={source} className="flex items-center gap-1.5 rounded-lg border border-slate-700/50 bg-slate-800/50 px-2.5 py-1 text-[10px]">
              <span>{SOURCE_ICONS[source] || '📡'}</span>
              <span className="text-slate-400">{source.replace('_', ' ')}</span>
              <span className="font-bold text-slate-300">{count as number}</span>
            </div>
          ))}
        </div>
      )}

      {/* Top stats */}
      {scan && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          <StatCard icon={<Flame className="h-4 w-4 text-orange-400" />} label="Trending" value={opportunities.length} />
          <StatCard icon={<Target className="h-4 w-4 text-emerald-400" />} label="Gap Opportunities" value={gapOpportunities.length} />
          <StatCard icon={<Layers className="h-4 w-4 text-violet-400" />} label="Style Trends" value={styleTrends.length} />
          <StatCard icon={<Calendar className="h-4 w-4 text-rose-400" />} label="Upcoming Events" value={seasonalForecast.length} />
          <StatCard icon={<DollarSign className="h-4 w-4 text-emerald-400" />} label="Avg Margin" value={priceInsights.length > 0 ? `${Math.round(priceInsights.reduce((a, p) => a + (p.avgMargin || 0), 0) / priceInsights.length)}%` : '—'} />
          <StatCard icon={<BellRing className="h-4 w-4 text-amber-400" />} label="Unread Alerts" value={unreadCount} />
        </div>
      )}

      {/* Panel tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-slate-800 pb-0">
        {panels.map(({ key, label, icon: Icon, count }) => (
          <button key={key} onClick={() => setActivePanel(key)} className={`flex shrink-0 items-center gap-1.5 border-b-2 px-4 py-2.5 text-xs font-medium transition-all ${activePanel === key ? 'border-sky-500 text-sky-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
            <Icon className="h-3.5 w-3.5" />{label}
            {count != null && count > 0 && <span className={`ml-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${activePanel === key ? 'bg-sky-500/20 text-sky-300' : 'bg-slate-800 text-slate-500'}`}>{count}</span>}
          </button>
        ))}
      </div>

      {/* No scan state */}
      {!scan && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-slate-700/50 bg-slate-900/40 py-16">
          <Radar className="h-12 w-12 text-slate-600 mb-4" />
          <p className="text-sm font-medium text-slate-400">No trend data yet</p>
          <p className="mt-1 text-xs text-slate-600">Click &quot;Run Trend Scan&quot; to analyze current laser market trends</p>
        </div>
      )}

      {/* ── TRENDING PRODUCTS PANEL ─────────────────────────────────────── */}
      {scan && activePanel === 'trending' && (
        <div className="space-y-4">
          {/* Category filter */}
          <div className="flex gap-1 flex-wrap">
            {['ALL', 'PRODUCT_TYPE', 'DESIGN_THEME', 'ENGRAVING_STYLE', 'MATERIAL', 'SEASONAL', 'NICHE'].map(cat => (
              <button key={cat} onClick={() => setCategoryFilter(cat)} className={`rounded-lg px-3 py-1.5 text-[10px] font-medium transition-all ${categoryFilter === cat ? 'bg-slate-700 text-slate-100' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'}`}>
                {cat === 'ALL' ? 'All' : CATEGORY_LABELS[cat] || cat}
              </button>
            ))}
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            {filtered.map((opp, i) => (
              <div key={opp.id || i} onClick={() => setSelectedOpp(selectedOpp?.title === opp.title ? null : opp)} className={`cursor-pointer rounded-xl border p-4 transition-all hover:border-slate-600 ${selectedOpp?.title === opp.title ? 'border-sky-500/50 bg-sky-900/10' : 'border-slate-700/50 bg-slate-900/40'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`rounded-full border px-2 py-0.5 text-[9px] font-medium ${CATEGORY_COLORS[opp.category] || 'bg-slate-700 text-slate-400'}`}>
                        {CATEGORY_LABELS[opp.category] || opp.category}
                      </span>
                      {opp.isGapOpportunity && <span className="rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 text-[9px] font-bold text-emerald-400">GAP</span>}
                      {opp.growthVelocity >= 70 && <span className="flex items-center gap-0.5 text-[9px] font-bold text-orange-400"><TrendingUp className="h-2.5 w-2.5" />Hot</span>}
                    </div>
                    <h3 className="text-sm font-bold text-slate-100">{opp.title}</h3>
                    <p className="mt-1 text-[10px] text-slate-500 line-clamp-2">{opp.description}</p>
                  </div>
                  <ScoreBadge score={opp.overallScore} />
                </div>

                {/* Score bars */}
                <div className="mt-3 grid grid-cols-5 gap-2">
                  <div><div className="text-[9px] text-slate-500 mb-0.5">Trend</div><ScoreBar value={opp.trendStrength} color="sky" /><div className="text-[9px] text-slate-400 mt-0.5">{opp.trendStrength}</div></div>
                  <div><div className="text-[9px] text-slate-500 mb-0.5">Growth</div><ScoreBar value={opp.growthVelocity} color="emerald" /><div className="text-[9px] text-slate-400 mt-0.5">{opp.growthVelocity}%</div></div>
                  <div><div className="text-[9px] text-slate-500 mb-0.5">Competition</div><ScoreBar value={opp.competitionDensity} color="rose" /><CompetitionIndicator density={opp.competitionDensity} /></div>
                  <div><div className="text-[9px] text-slate-500 mb-0.5">Profit</div><ScoreBar value={opp.profitPotential} color="amber" /><div className="text-[9px] text-slate-400 mt-0.5">{opp.profitPotential}</div></div>
                  <div><div className="text-[9px] text-slate-500 mb-0.5">Seasonal</div><ScoreBar value={opp.seasonalityScore} color="violet" /><div className="text-[9px] text-slate-400 mt-0.5">{opp.seasonalityScore}</div></div>
                </div>

                {/* Sources */}
                <div className="mt-2 flex items-center gap-1">
                  {opp.sources.map(s => <span key={s} className="text-[10px]" title={s}>{SOURCE_ICONS[s] || '📡'}</span>)}
                  <span className="text-[9px] text-slate-600 ml-1">{opp.sources.length} sources</span>
                </div>

                {/* Expanded detail */}
                {selectedOpp?.title === opp.title && (
                  <div className="mt-4 space-y-3 border-t border-slate-700/50 pt-3">
                    {/* Price range */}
                    {opp.priceRange && (
                      <div className="flex gap-2">
                        {(['low', 'mid', 'high', 'premium'] as const).map(tier => (
                          <div key={tier} className={`flex-1 rounded-lg border border-slate-700/50 bg-slate-800/50 p-2 text-center ${tier === 'mid' ? 'ring-1 ring-sky-500/30' : ''}`}>
                            <div className="text-[9px] text-slate-500 capitalize">{tier}</div>
                            <div className={`text-xs font-bold ${tier === 'premium' ? 'text-emerald-400' : 'text-slate-200'}`}>${opp.priceRange[tier]}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Product ideas */}
                    {opp.productIdeas && opp.productIdeas.length > 0 && (
                      <div>
                        <h4 className="text-[10px] font-semibold text-slate-300 mb-1.5 flex items-center gap-1"><Sparkles className="h-3 w-3 text-sky-400" /> Product Ideas</h4>
                        <div className="grid gap-1.5 sm:grid-cols-2">
                          {opp.productIdeas.map((idea, j) => (
                            <div key={j} className="flex items-center justify-between rounded-lg bg-slate-800/50 px-2.5 py-1.5 text-[10px]">
                              <div>
                                <span className="font-medium text-slate-200">{idea.name}</span>
                                <span className="ml-1.5 text-slate-600">~{idea.estimatedTimeMins}min</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-slate-500">${idea.materialCost}</span>
                                <span className="font-bold text-emerald-400">${idea.suggestedPrice}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Materials & styles */}
                    <div className="flex gap-4">
                      {opp.materialSuggestions.length > 0 && (
                        <div>
                          <div className="text-[9px] text-slate-500 mb-1">Materials</div>
                          <div className="flex flex-wrap gap-1">{opp.materialSuggestions.map(m => <span key={m} className="rounded bg-slate-800 px-1.5 py-0.5 text-[9px] text-slate-400">{m}</span>)}</div>
                        </div>
                      )}
                      {opp.styleHints.length > 0 && (
                        <div>
                          <div className="text-[9px] text-slate-500 mb-1">Styles</div>
                          <div className="flex flex-wrap gap-1">{opp.styleHints.map(s => <span key={s} className="rounded bg-violet-900/30 px-1.5 py-0.5 text-[9px] text-violet-400">{s}</span>)}</div>
                        </div>
                      )}
                    </div>

                    {/* Gap info */}
                    {opp.isGapOpportunity && opp.gapDescription && (
                      <div className="rounded-lg border border-emerald-700/30 bg-emerald-900/15 p-2.5 text-[10px] text-emerald-400">
                        <Target className="inline h-3 w-3 mr-1" />{opp.gapDescription}
                      </div>
                    )}

                    {/* Peak months */}
                    {opp.peakMonths.length > 0 && (
                      <div className="flex items-center gap-1 text-[10px]">
                        <Calendar className="h-3 w-3 text-rose-400" />
                        <span className="text-slate-500">Peak:</span>
                        {opp.peakMonths.map(m => <span key={m} className="rounded bg-rose-900/20 px-1.5 py-0.5 text-rose-400">{MONTH_NAMES[m - 1]}</span>)}
                        {opp.daysUntilPeak != null && <span className="text-slate-500 ml-1">({opp.daysUntilPeak}d away)</span>}
                      </div>
                    )}

                    {/* Keywords */}
                    <div className="flex flex-wrap gap-1">
                      {opp.keywords.slice(0, 8).map(k => <span key={k} className="rounded bg-slate-800 px-1.5 py-0.5 text-[9px] text-slate-500">#{k}</span>)}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          {filtered.length === 0 && (
            <div className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-8 text-center">
              <Search className="mx-auto h-8 w-8 text-slate-600 mb-2" />
              <p className="text-xs text-slate-500">No trends found for this category</p>
            </div>
          )}
        </div>
      )}

      {/* ── STYLE TRENDS PANEL ──────────────────────────────────────────── */}
      {scan && activePanel === 'styles' && (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {styleTrends.map((style, i) => (
            <div key={i} className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-4">
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-sm font-bold text-slate-100">{style.name}</h3>
                <ScoreBadge score={style.strength} />
              </div>
              <p className="text-[10px] text-slate-500 mb-3">{style.description}</p>
              <div className="mb-2"><ScoreBar value={style.strength} color="violet" /></div>
              <div className="space-y-2">
                <div>
                  <div className="text-[9px] text-slate-500 mb-1">Examples</div>
                  <div className="flex flex-wrap gap-1">{style.examples.map(e => <span key={e} className="rounded bg-violet-900/20 px-1.5 py-0.5 text-[9px] text-violet-400">{e}</span>)}</div>
                </div>
                <div>
                  <div className="text-[9px] text-slate-500 mb-1">Best Materials</div>
                  <div className="flex flex-wrap gap-1">{style.materials.map(m => <span key={m} className="rounded bg-slate-800 px-1.5 py-0.5 text-[9px] text-slate-400">{m}</span>)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── SEASONAL FORECAST PANEL ─────────────────────────────────────── */}
      {scan && activePanel === 'seasonal' && (
        <div className="space-y-3">
          {seasonalForecast.map((ev, i) => {
            const urgency = ev.daysUntil <= 14 ? 'border-red-700/40 bg-red-900/10' : ev.daysUntil <= 45 ? 'border-amber-700/40 bg-amber-900/10' : 'border-slate-700/50 bg-slate-900/40';
            return (
              <div key={i} className={`rounded-xl border p-4 ${urgency}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-bold text-slate-100">{ev.event}</h3>
                      {ev.daysUntil <= 14 && <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[9px] font-bold text-red-400">URGENT</span>}
                      {ev.daysUntil > 14 && ev.daysUntil <= 45 && <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[9px] font-bold text-amber-400">SOON</span>}
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-slate-500">
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{ev.peakDate}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{ev.daysUntil === 0 ? 'Year-round' : `${ev.daysUntil} days`}</span>
                      <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3" />+{ev.expectedDemandBoost}% demand</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-slate-100">{ev.daysUntil === 0 ? '∞' : ev.daysUntil}</div>
                    <div className="text-[9px] text-slate-500">{ev.daysUntil === 0 ? 'ongoing' : 'days'}</div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1">
                  {ev.relevantProducts.map(p => <span key={p} className="rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300">{p}</span>)}
                </div>
                <div className="mt-2 rounded-lg bg-slate-800/50 px-3 py-2 text-[10px] text-slate-400">
                  <Sparkles className="inline h-3 w-3 text-sky-400 mr-1" />{ev.preparationTip}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── OPPORTUNITY RADAR PANEL ─────────────────────────────────────── */}
      {scan && activePanel === 'opportunities' && (
        <div className="space-y-4">
          <p className="text-xs text-slate-500">Market gaps: high demand but low supply — underserved niches with profit potential.</p>
          {gapOpportunities.length === 0 ? (
            <div className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-8 text-center">
              <Target className="mx-auto h-8 w-8 text-slate-600 mb-2" />
              <p className="text-xs text-slate-500">No gap opportunities detected in this scan</p>
            </div>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {gapOpportunities.map((opp, i) => (
                <div key={i} className="rounded-xl border border-emerald-700/30 bg-emerald-900/10 p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-sm font-bold text-slate-100">{opp.title}</h3>
                      <p className="text-[10px] text-slate-500 mt-0.5">{opp.gapDescription}</p>
                    </div>
                    <ScoreBadge score={opp.overallScore} />
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-3 text-[10px]">
                    <div className="rounded bg-slate-800/50 px-2 py-1"><span className="text-slate-500">Demand:</span> <span className={opp.demandLevel === 'HIGH' ? 'text-emerald-400 font-bold' : 'text-slate-300'}>{opp.demandLevel}</span></div>
                    <div className="rounded bg-slate-800/50 px-2 py-1"><span className="text-slate-500">Supply:</span> <span className={opp.supplyLevel === 'LOW' ? 'text-emerald-400 font-bold' : 'text-slate-300'}>{opp.supplyLevel}</span></div>
                    <div className="rounded bg-slate-800/50 px-2 py-1"><span className="text-slate-500">Profit:</span> <span className="text-emerald-400">{opp.profitPotential}/100</span></div>
                    <div className="rounded bg-slate-800/50 px-2 py-1"><span className="text-slate-500">Growth:</span> <span className="text-sky-400">{opp.growthVelocity}%</span></div>
                  </div>
                  {opp.productIdeas && opp.productIdeas.length > 0 && (
                    <div className="mt-3 space-y-1">
                      {opp.productIdeas.slice(0, 3).map((idea, j) => (
                        <div key={j} className="flex items-center justify-between rounded bg-slate-800/30 px-2 py-1 text-[10px]">
                          <span className="text-slate-300">{idea.name}</span>
                          <span className="text-emerald-400 font-bold">${idea.suggestedPrice}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── PRICE INSIGHTS PANEL ────────────────────────────────────────── */}
      {scan && activePanel === 'pricing' && (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {priceInsights.map((pi, i) => (
              <div key={i} className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className={`rounded-full border px-2 py-0.5 text-[9px] font-medium ${CATEGORY_COLORS[pi.category] || 'bg-slate-700 text-slate-400'}`}>
                    {CATEGORY_LABELS[pi.category] || pi.category}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-[9px] text-slate-500">Avg Price</div>
                    <div className="text-lg font-bold text-slate-100">{pi.avgPrice != null ? `$${pi.avgPrice}` : '—'}</div>
                  </div>
                  <div>
                    <div className="text-[9px] text-slate-500">Avg Margin</div>
                    <div className={`text-lg font-bold ${(pi.avgMargin || 0) >= 70 ? 'text-emerald-400' : (pi.avgMargin || 0) >= 50 ? 'text-amber-400' : 'text-slate-300'}`}>{pi.avgMargin != null ? `${pi.avgMargin}%` : '—'}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Top priced opportunities */}
          <div className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-4">
            <h3 className="text-xs font-semibold text-slate-200 mb-3 flex items-center gap-2"><DollarSign className="h-4 w-4 text-emerald-400" /> Premium Pricing Opportunities</h3>
            <div className="space-y-1.5">
              {opportunities.filter(o => o.priceRange).sort((a, b) => (b.priceRange?.premium || 0) - (a.priceRange?.premium || 0)).slice(0, 8).map((opp, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg bg-slate-800/50 px-3 py-2 text-[10px]">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-300 font-medium">{opp.title}</span>
                    <CompetitionIndicator density={opp.competitionDensity} />
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-500">${opp.priceRange.low}–${opp.priceRange.high}</span>
                    <span className="font-bold text-emerald-400">${opp.priceRange.premium}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── ALERTS PANEL ────────────────────────────────────────────────── */}
      {scan && activePanel === 'alerts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">Trend alerts based on your subscription preferences</p>
            {unreadCount > 0 && (
              <button onClick={async () => { await apiClient.patch('/trend-scanner/alerts/read-all'); fetchAlerts(); }} className="text-[10px] text-sky-400 hover:text-sky-300">
                Mark all read
              </button>
            )}
          </div>
          {alerts.length === 0 ? (
            <div className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-8 text-center">
              <Bell className="mx-auto h-8 w-8 text-slate-600 mb-2" />
              <p className="text-xs text-slate-500">No alerts yet. Run a scan to generate trend alerts.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {alerts.map(alert => {
                const typeColors: Record<string, string> = {
                  NEW_TREND: 'border-sky-700/30 bg-sky-900/10',
                  SEASONAL_SPIKE: 'border-rose-700/30 bg-rose-900/10',
                  EMERGING_STYLE: 'border-violet-700/30 bg-violet-900/10',
                  GAP_FOUND: 'border-emerald-700/30 bg-emerald-900/10',
                };
                const typeLabels: Record<string, string> = {
                  NEW_TREND: 'New Trend', SEASONAL_SPIKE: 'Seasonal', EMERGING_STYLE: 'Style', GAP_FOUND: 'Gap Found',
                };
                return (
                  <div key={alert.id} className={`rounded-xl border p-3 ${typeColors[alert.alertType] || 'border-slate-700/50 bg-slate-900/40'} ${!alert.isRead ? 'ring-1 ring-sky-500/20' : 'opacity-70'}`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[9px] font-medium text-slate-400">{typeLabels[alert.alertType] || alert.alertType}</span>
                          {!alert.isRead && <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />}
                        </div>
                        <h4 className="text-xs font-semibold text-slate-200">{alert.title}</h4>
                        <p className="text-[10px] text-slate-500 mt-0.5">{alert.summary}</p>
                      </div>
                      <div className="text-[9px] text-slate-600 shrink-0 ml-3">{new Date(alert.createdAt).toLocaleDateString()}</div>
                    </div>
                    {!alert.isRead && (
                      <button onClick={async (e) => { e.stopPropagation(); await apiClient.patch(`/trend-scanner/alerts/${alert.id}/read`); fetchAlerts(); }} className="mt-2 text-[10px] text-sky-400 hover:text-sky-300">
                        Mark as read
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-3">
      <div className="flex items-center gap-2 mb-1">{icon}<span className="text-[10px] text-slate-500">{label}</span></div>
      <div className="text-lg font-bold text-slate-100">{value}</div>
    </div>
  );
}
