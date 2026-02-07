'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import {
  Activity, AlertTriangle, BarChart3, Bell, BellRing,
  Calendar, Clock, DollarSign,
  Flame, Layers, Loader2, Package, Radar,
  Search, Sparkles, Star, Target, TrendingUp,
  Zap, ArrowDown, ArrowUp, Minus,
  Box, Heart, Lightbulb, Megaphone, Scissors,
  Settings, ShieldCheck, Timer, TreePine, Users,
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

interface GeneratedProduct {
  id: string;
  trendTitle: string;
  productName: string;
  productType: string;
  description: string;
  designConcept: string;
  svgConceptDescription: string;
  materials: string[];
  recommendedSizes: Array<{ label: string; widthMm: number; heightMm: number }>;
  estimatedCutTimeMins: number;
  estimatedEngraveTimeMins: number;
  materialCostEstimate: number;
  suggestedPrice: number;
  profitMargin: number;
  difficulty: string;
  styleHints: string[];
  targetAudience: string;
  marketingAngle: string;
  photoAiCompatible: boolean;
  mockupDescription: string;
}

interface ProfitAnalysis {
  productType: string;
  materialCost: number;
  machineTimeCost: number;
  laborCost: number;
  overheadCost: number;
  totalCost: number;
  recommendedPriceRange: { min: number; max: number };
  profitScore: number;
  marginPercent: number;
  riskLevel: string;
  riskFactors: string[];
  competitionSaturation: number;
  demandStrength: number;
  breakEvenUnits: number;
  monthlyPotentialRevenue: number;
  scalabilityScore: number;
}

interface ConfidenceAssessment {
  trendTitle: string;
  overallConfidence: number;
  signalConsistency: number;
  crossPlatformValidation: number;
  growthMomentum: number;
  saturationRisk: number;
  isHypeTrend: boolean;
  hypeWarnings: string[];
  reliabilityGrade: string;
  recommendation: string;
}

interface MicroNiche {
  id: string;
  nicheTitle: string;
  parentCategory: string;
  specificAngle: string;
  demandSignal: number;
  competitionLevel: number;
  opportunityScore: number;
  exampleProducts: string[];
  targetDemographic: string;
  styleModifiers: string[];
  materialSuggestions: string[];
  pricingTier: string;
  seasonalRelevance: string[];
  detectedFrom: string[];
}

interface TrendLifecycle {
  trendTitle: string;
  currentStage: string;
  stageConfidence: number;
  daysInCurrentStage: number;
  estimatedDaysRemaining: number;
  timeline: Array<{ date: string; stage: string; volume: number; growthRate: number }>;
  velocityTrend: string;
  recommendation: string;
  actionUrgency: string;
}

interface ContentPlan {
  trendTitle: string;
  productName: string;
  ideas: Array<{
    platform: string;
    contentType: string;
    title: string;
    hook: string;
    caption: string;
    hashtags: string[];
    storytellingAngle: string;
    estimatedReach: string;
    bestPostingTime: string;
    callToAction: string;
  }>;
  weeklySchedule: Array<{ day: string; platform: string; contentType: string; title: string }>;
}

interface ProductionRecommendation {
  productType: string;
  trendTitle: string;
  recommendedBatchSize: number;
  batchSizeReasoning: string;
  optimalDimensions: Array<{ label: string; widthMm: number; heightMm: number; reason: string }>;
  materialPurchasing: Array<{
    materialId: string;
    materialName: string;
    sheetsNeeded: number;
    estimatedCost: number;
    supplier: string;
    leadTimeDays: number;
    bulkDiscountThreshold: number;
    recommendation: string;
  }>;
  productionTiming: {
    bestStartDate: string;
    peakDemandWindow: string;
    leadTimeRequired: number;
    listingPrepDays: number;
    productionDays: number;
    shippingBufferDays: number;
    urgency: string;
    reasoning: string;
  };
  estimatedProductionHours: number;
  nestingEfficiency: number;
  sheetUtilization: number;
  dailyOutputCapacity: number;
  weeklyRevenueEstimate: number;
}

interface MaterialTrend {
  materialId: string;
  materialName: string;
  category: string;
  popularityScore: number;
  growthRate: number;
  trendDirection: string;
  topProducts: string[];
  priceStability: string;
  supplyStatus: string;
  seasonalDemand: Array<{ month: string; demandLevel: number }>;
  sustainabilityScore: number;
  recommendation: string;
}

interface PersonalizedFeed {
  userId: string;
  generatedAt: string;
  topPicks: Array<{ trendTitle: string; relevanceScore: number; matchReasons: string[]; personalizedInsight: string; suggestedAction: string; estimatedEffort: string; matchedPreferences: string[] }>;
  newForYou: Array<{ trendTitle: string; relevanceScore: number; matchReasons: string[]; personalizedInsight: string; suggestedAction: string; estimatedEffort: string; matchedPreferences: string[] }>;
  basedOnHistory: Array<{ trendTitle: string; relevanceScore: number; matchReasons: string[]; personalizedInsight: string; suggestedAction: string; estimatedEffort: string; matchedPreferences: string[] }>;
  quickWins: Array<{ trendTitle: string; relevanceScore: number; matchReasons: string[]; personalizedInsight: string; suggestedAction: string; estimatedEffort: string; matchedPreferences: string[] }>;
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

type PanelKey = 'trending' | 'products' | 'profit' | 'niches' | 'lifecycle' | 'styles' | 'seasonal' | 'opportunities' | 'pricing' | 'materials' | 'content' | 'production' | 'personalized' | 'alerts';

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
  const [generatedProducts, setGeneratedProducts] = useState<GeneratedProduct[]>([]);
  const [generatingProducts, setGeneratingProducts] = useState(false);
  const [profitAnalyses, setProfitAnalyses] = useState<ProfitAnalysis[]>([]);
  const [microNiches, setMicroNiches] = useState<MicroNiche[]>([]);
  const [lifecycles, setLifecycles] = useState<TrendLifecycle[]>([]);
  const [contentPlan, setContentPlan] = useState<ContentPlan | null>(null);
  const [productionRec, setProductionRec] = useState<ProductionRecommendation | null>(null);
  const [materialTrends, setMaterialTrends] = useState<MaterialTrend[]>([]);
  const [personalizedFeed, setPersonalizedFeed] = useState<PersonalizedFeed | null>(null);
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);

  const fetchLatest = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/trend-scanner/scan/latest');
      if (res.data && !res.data.error) setScan(res.data);
    } catch {} finally { setLoading(false); }
  }, []);

  const fetchAlerts = useCallback(async () => {
    try {
      const [alertsRes, countRes] = await Promise.all([
        apiClient.get('/trend-scanner/alerts'),
        apiClient.get('/trend-scanner/alerts/unread-count'),
      ]);
      setAlerts(Array.isArray(alertsRes.data) ? alertsRes.data : []);
      setUnreadCount(countRes.data?.count ?? 0);
    } catch {}
  }, []);

  const fetchMaterialTrends = useCallback(async () => {
    try {
      const res = await apiClient.get('/trend-scanner/materials/trends');
      if (Array.isArray(res.data)) setMaterialTrends(res.data);
    } catch {}
  }, []);

  useEffect(() => { fetchLatest(); fetchAlerts(); fetchMaterialTrends(); }, [fetchLatest, fetchAlerts, fetchMaterialTrends]);

  const runScan = async () => {
    setScanning(true);
    try {
      const res = await apiClient.post('/trend-scanner/scan', { scanType: 'full' });
      setScan(res.data);
      fetchAlerts();
      fetchMaterialTrends();
    } catch {} finally { setScanning(false); }
  };

  const generateProducts = async () => {
    if (!scan) return;
    setGeneratingProducts(true);
    try {
      const opps = (scan.opportunities || scan.trendingProducts || []).slice(0, 5);
      const res = await apiClient.post('/trend-scanner/generate-products/bulk', {
        opportunities: opps.map(o => ({ title: o.title, keywords: o.keywords, category: o.category })),
      });
      setGeneratedProducts(res.data || []);
      // Auto-analyze profit for generated products
      const profitResults: ProfitAnalysis[] = [];
      for (const p of (res.data || []).slice(0, 8)) {
        try {
          const pr = await apiClient.post('/trend-scanner/profit/analyze', {
            productType: p.productType, materials: p.materials,
            sizeMm: p.recommendedSizes[0] ? { width: p.recommendedSizes[0].widthMm, height: p.recommendedSizes[0].heightMm } : { width: 200, height: 150 },
            cutTimeMins: p.estimatedCutTimeMins, engraveTimeMins: p.estimatedEngraveTimeMins,
            suggestedPrice: p.suggestedPrice,
          });
          profitResults.push(pr.data);
        } catch {}
      }
      setProfitAnalyses(profitResults);
    } catch {} finally { setGeneratingProducts(false); }
  };

  const detectNiches = async () => {
    if (!scan) return;
    try {
      const opps = scan.opportunities || scan.trendingProducts || [];
      const keywords = opps.flatMap(o => o.keywords).slice(0, 20);
      const categories = [...new Set(opps.map(o => o.category))];
      const res = await apiClient.post('/trend-scanner/niches/detect', { keywords, categories });
      setMicroNiches(res.data || []);
    } catch {}
  };

  const classifyLifecycles = async () => {
    if (!scan) return;
    try {
      const opps = (scan.opportunities || scan.trendingProducts || []).slice(0, 8);
      const trends = opps.map(o => ({
        trendTitle: o.title,
        volumeHistory: [20, 30, 40, 55, 65, 70, Math.round(o.trendStrength * 0.8), o.trendStrength],
        growthRates: [5, 8, 10, o.growthVelocity * 0.5, o.growthVelocity * 0.7, o.growthVelocity],
        daysActive: Math.round(30 + Math.random() * 60),
        competitionDensity: o.competitionDensity,
        currentVolume: o.trendStrength,
      }));
      const res = await apiClient.post('/trend-scanner/lifecycle/batch', { trends });
      setLifecycles(res.data || []);
    } catch {}
  };

  const generateContentIdeas = async (product: GeneratedProduct) => {
    try {
      const res = await apiClient.post('/trend-scanner/content-ideas', {
        trendTitle: product.trendTitle, productName: product.productName,
        productType: product.productType, materials: product.materials,
        styles: product.styleHints, targetAudience: product.targetAudience,
        priceRange: { min: product.materialCostEstimate, max: product.suggestedPrice },
      });
      setContentPlan(res.data);
    } catch {}
  };

  const getProductionAdvice = async (product: GeneratedProduct) => {
    if (!scan) return;
    const opp = (scan.opportunities || scan.trendingProducts || []).find(o => o.title === product.trendTitle);
    try {
      const res = await apiClient.post('/trend-scanner/production/recommend', {
        productType: product.productType, trendTitle: product.trendTitle,
        trendStrength: opp?.trendStrength || 60, growthVelocity: opp?.growthVelocity || 5,
        competitionDensity: opp?.competitionDensity || 40,
        materials: product.materials,
        sizeMm: product.recommendedSizes[0] ? { width: product.recommendedSizes[0].widthMm, height: product.recommendedSizes[0].heightMm } : { width: 200, height: 150 },
        cutTimeMins: product.estimatedCutTimeMins, engraveTimeMins: product.estimatedEngraveTimeMins,
        suggestedPrice: product.suggestedPrice,
      });
      setProductionRec(res.data);
    } catch {}
  };

  const loadPersonalizedFeed = async () => {
    if (!scan) return;
    try {
      const opps = scan.opportunities || scan.trendingProducts || [];
      const trends = opps.slice(0, 15).map(o => ({
        title: o.title, category: o.category, keywords: o.keywords,
        materials: o.materialSuggestions || [], styles: o.styleHints || [],
        priceRange: { min: o.priceRange?.low || 10, max: o.priceRange?.high || 50 },
        trendStrength: o.trendStrength, growthVelocity: o.growthVelocity,
        difficulty: 'medium',
      }));
      const res = await apiClient.post('/trend-scanner/personalized-feed', { trends });
      setPersonalizedFeed(res.data);
    } catch {}
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
    { key: 'trending', label: 'Trending', icon: Flame, count: opportunities.length },
    { key: 'products', label: 'Product Ideas', icon: Box, count: generatedProducts.length },
    { key: 'profit', label: 'Profit Intel', icon: DollarSign, count: profitAnalyses.length },
    { key: 'niches', label: 'Micro-Niches', icon: Target, count: microNiches.length },
    { key: 'lifecycle', label: 'Lifecycle', icon: Activity, count: lifecycles.length },
    { key: 'styles', label: 'Styles', icon: Layers, count: styleTrends.length },
    { key: 'seasonal', label: 'Seasonal', icon: Calendar, count: seasonalForecast.length },
    { key: 'opportunities', label: 'Gaps', icon: Radar, count: gapOpportunities.length },
    { key: 'pricing', label: 'Pricing', icon: BarChart3, count: priceInsights.length },
    { key: 'materials', label: 'Materials', icon: TreePine, count: materialTrends.length },
    { key: 'content', label: 'Content', icon: Megaphone },
    { key: 'production', label: 'Production', icon: Settings },
    { key: 'personalized', label: 'For You', icon: Heart },
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

      {/* ── PRODUCT IDEAS PANEL ────────────────────────────────────────── */}
      {scan && activePanel === 'products' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">AI-generated laser product concepts from detected trends</p>
            <button onClick={generateProducts} disabled={generatingProducts} className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 to-violet-500 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-violet-500/20 disabled:opacity-50 transition-all">
              {generatingProducts ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating...</> : <><Sparkles className="h-3.5 w-3.5" /> Generate Products From Trends</>}
            </button>
          </div>
          {generatedProducts.length === 0 ? (
            <div className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-8 text-center">
              <Box className="mx-auto h-8 w-8 text-slate-600 mb-2" />
              <p className="text-xs text-slate-500">Click &quot;Generate Products&quot; to create laser product ideas from current trends</p>
            </div>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {generatedProducts.map((prod) => (
                <div key={prod.id} onClick={() => setExpandedProduct(expandedProduct === prod.id ? null : prod.id)} className={`cursor-pointer rounded-xl border p-4 transition-all hover:border-slate-600 ${expandedProduct === prod.id ? 'border-violet-500/50 bg-violet-900/10' : 'border-slate-700/50 bg-slate-900/40'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="rounded-full bg-violet-500/20 border border-violet-500/30 px-2 py-0.5 text-[9px] font-medium text-violet-300">{prod.productType}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-medium ${prod.difficulty === 'easy' ? 'bg-emerald-500/20 text-emerald-400' : prod.difficulty === 'medium' ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'}`}>{prod.difficulty}</span>
                        {prod.photoAiCompatible && <span className="rounded-full bg-sky-500/20 border border-sky-500/30 px-2 py-0.5 text-[9px] font-bold text-sky-400">Photo AI</span>}
                      </div>
                      <h3 className="text-sm font-bold text-slate-100">{prod.productName}</h3>
                      <p className="mt-1 text-[10px] text-slate-500 line-clamp-2">{prod.description}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-lg font-bold text-emerald-400">${prod.suggestedPrice}</div>
                      <div className="text-[9px] text-slate-500">{prod.profitMargin}% margin</div>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                    <div className="rounded-lg bg-slate-800/50 p-1.5"><div className="text-[9px] text-slate-500">Cut</div><div className="text-xs font-bold text-slate-200">{prod.estimatedCutTimeMins}m</div></div>
                    <div className="rounded-lg bg-slate-800/50 p-1.5"><div className="text-[9px] text-slate-500">Engrave</div><div className="text-xs font-bold text-slate-200">{prod.estimatedEngraveTimeMins}m</div></div>
                    <div className="rounded-lg bg-slate-800/50 p-1.5"><div className="text-[9px] text-slate-500">Material</div><div className="text-xs font-bold text-slate-200">${prod.materialCostEstimate}</div></div>
                    <div className="rounded-lg bg-slate-800/50 p-1.5"><div className="text-[9px] text-slate-500">Price</div><div className="text-xs font-bold text-emerald-400">${prod.suggestedPrice}</div></div>
                  </div>
                  {expandedProduct === prod.id && (
                    <div className="mt-4 space-y-3 border-t border-slate-700/50 pt-3">
                      <div><div className="text-[9px] text-slate-500 mb-1">Design Concept</div><p className="text-[10px] text-slate-300">{prod.designConcept}</p></div>
                      <div><div className="text-[9px] text-slate-500 mb-1">SVG Concept</div><p className="text-[10px] text-slate-400">{prod.svgConceptDescription}</p></div>
                      <div className="flex gap-4">
                        <div><div className="text-[9px] text-slate-500 mb-1">Materials</div><div className="flex flex-wrap gap-1">{prod.materials.map(m => <span key={m} className="rounded bg-slate-800 px-1.5 py-0.5 text-[9px] text-slate-400">{m}</span>)}</div></div>
                        <div><div className="text-[9px] text-slate-500 mb-1">Styles</div><div className="flex flex-wrap gap-1">{prod.styleHints.map(s => <span key={s} className="rounded bg-violet-900/30 px-1.5 py-0.5 text-[9px] text-violet-400">{s}</span>)}</div></div>
                      </div>
                      <div><div className="text-[9px] text-slate-500 mb-1">Sizes</div><div className="flex gap-2">{prod.recommendedSizes.map(s => <span key={s.label} className="rounded bg-slate-800 px-2 py-1 text-[9px] text-slate-300">{s.label}: {s.widthMm}×{s.heightMm}mm</span>)}</div></div>
                      <div><div className="text-[9px] text-slate-500 mb-1">Target Audience</div><p className="text-[10px] text-slate-300">{prod.targetAudience}</p></div>
                      <div className="rounded-lg bg-sky-900/15 border border-sky-700/30 p-2.5 text-[10px] text-sky-300"><Megaphone className="inline h-3 w-3 mr-1" />{prod.marketingAngle}</div>
                      <div className="flex gap-2">
                        <button onClick={(e) => { e.stopPropagation(); generateContentIdeas(prod); setActivePanel('content'); }} className="flex items-center gap-1 rounded-lg bg-slate-800 px-3 py-1.5 text-[10px] text-slate-300 hover:bg-slate-700 transition-all"><Megaphone className="h-3 w-3" /> Content Ideas</button>
                        <button onClick={(e) => { e.stopPropagation(); getProductionAdvice(prod); setActivePanel('production'); }} className="flex items-center gap-1 rounded-lg bg-slate-800 px-3 py-1.5 text-[10px] text-slate-300 hover:bg-slate-700 transition-all"><Settings className="h-3 w-3" /> Production Plan</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── PROFIT INTELLIGENCE PANEL ──────────────────────────────────── */}
      {scan && activePanel === 'profit' && (
        <div className="space-y-4">
          <p className="text-xs text-slate-500">Profitability analysis for generated products. Generate products first to see profit intelligence.</p>
          {profitAnalyses.length === 0 ? (
            <div className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-8 text-center">
              <DollarSign className="mx-auto h-8 w-8 text-slate-600 mb-2" />
              <p className="text-xs text-slate-500">Generate products first to see profit analysis</p>
              <button onClick={() => { generateProducts(); }} className="mt-3 rounded-lg bg-slate-800 px-4 py-2 text-xs text-slate-300 hover:bg-slate-700">Generate Products</button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary cards */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatCard icon={<DollarSign className="h-4 w-4 text-emerald-400" />} label="Avg Margin" value={`${Math.round(profitAnalyses.reduce((a, p) => a + p.marginPercent, 0) / profitAnalyses.length)}%`} />
                <StatCard icon={<TrendingUp className="h-4 w-4 text-sky-400" />} label="Avg Profit Score" value={Math.round(profitAnalyses.reduce((a, p) => a + p.profitScore, 0) / profitAnalyses.length)} />
                <StatCard icon={<BarChart3 className="h-4 w-4 text-violet-400" />} label="Total Monthly Rev" value={`$${profitAnalyses.reduce((a, p) => a + p.monthlyPotentialRevenue, 0).toLocaleString()}`} />
                <StatCard icon={<ShieldCheck className="h-4 w-4 text-amber-400" />} label="Low Risk" value={profitAnalyses.filter(p => p.riskLevel === 'low').length} />
              </div>
              {/* Individual analyses */}
              <div className="grid gap-3 lg:grid-cols-2">
                {profitAnalyses.map((pa, i) => {
                  const matchedProduct = generatedProducts[i];
                  return (
                    <div key={i} className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-sm font-bold text-slate-100">{matchedProduct?.productName || pa.productType}</h3>
                          <span className={`inline-block mt-1 rounded-full px-2 py-0.5 text-[9px] font-bold ${pa.riskLevel === 'low' ? 'bg-emerald-500/20 text-emerald-400' : pa.riskLevel === 'medium' ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'}`}>{pa.riskLevel.toUpperCase()} RISK</span>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-emerald-400">{pa.profitScore}</div>
                          <div className="text-[9px] text-slate-500">profit score</div>
                        </div>
                      </div>
                      {/* Cost breakdown */}
                      <div className="grid grid-cols-5 gap-1 text-center mb-3">
                        <div className="rounded bg-slate-800/50 p-1"><div className="text-[8px] text-slate-500">Material</div><div className="text-[10px] font-bold text-slate-200">${pa.materialCost}</div></div>
                        <div className="rounded bg-slate-800/50 p-1"><div className="text-[8px] text-slate-500">Machine</div><div className="text-[10px] font-bold text-slate-200">${pa.machineTimeCost}</div></div>
                        <div className="rounded bg-slate-800/50 p-1"><div className="text-[8px] text-slate-500">Labor</div><div className="text-[10px] font-bold text-slate-200">${pa.laborCost}</div></div>
                        <div className="rounded bg-slate-800/50 p-1"><div className="text-[8px] text-slate-500">Overhead</div><div className="text-[10px] font-bold text-slate-200">${pa.overheadCost}</div></div>
                        <div className="rounded bg-emerald-900/30 p-1"><div className="text-[8px] text-emerald-500">Total</div><div className="text-[10px] font-bold text-emerald-400">${pa.totalCost}</div></div>
                      </div>
                      {/* Metrics */}
                      <div className="grid grid-cols-3 gap-2 text-[10px]">
                        <div><span className="text-slate-500">Margin:</span> <span className={`font-bold ${pa.marginPercent >= 70 ? 'text-emerald-400' : pa.marginPercent >= 40 ? 'text-amber-400' : 'text-red-400'}`}>{pa.marginPercent}%</span></div>
                        <div><span className="text-slate-500">Price Range:</span> <span className="text-slate-300">${pa.recommendedPriceRange.min}–${pa.recommendedPriceRange.max}</span></div>
                        <div><span className="text-slate-500">Break-even:</span> <span className="text-slate-300">{pa.breakEvenUnits} units</span></div>
                        <div><span className="text-slate-500">Monthly Rev:</span> <span className="text-emerald-400 font-bold">${pa.monthlyPotentialRevenue}</span></div>
                        <div><span className="text-slate-500">Scalability:</span> <span className="text-slate-300">{pa.scalabilityScore}/100</span></div>
                        <div><span className="text-slate-500">Competition:</span> <CompetitionIndicator density={pa.competitionSaturation} /></div>
                      </div>
                      {/* Risk factors */}
                      {pa.riskFactors.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">{pa.riskFactors.map((r, j) => <span key={j} className="rounded bg-red-900/20 px-1.5 py-0.5 text-[9px] text-red-400">{r}</span>)}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── MICRO-NICHES PANEL ─────────────────────────────────────────── */}
      {scan && activePanel === 'niches' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">AI-detected micro-niches — specific underserved subcategories with high opportunity</p>
            <button onClick={detectNiches} className="flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-xs text-slate-300 hover:bg-slate-700 transition-all"><Target className="h-3.5 w-3.5" /> Detect Niches</button>
          </div>
          {microNiches.length === 0 ? (
            <div className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-8 text-center">
              <Target className="mx-auto h-8 w-8 text-slate-600 mb-2" />
              <p className="text-xs text-slate-500">Click &quot;Detect Niches&quot; to find micro-niche opportunities</p>
            </div>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
              {microNiches.map((niche) => (
                <div key={niche.id} className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="rounded-full bg-orange-500/20 border border-orange-500/30 px-2 py-0.5 text-[9px] font-medium text-orange-300">{niche.parentCategory}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-medium ${niche.pricingTier === 'luxury' ? 'bg-amber-500/20 text-amber-400' : niche.pricingTier === 'premium' ? 'bg-violet-500/20 text-violet-400' : 'bg-slate-700 text-slate-400'}`}>{niche.pricingTier}</span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-100">{niche.nicheTitle}</h3>
                      <p className="mt-1 text-[10px] text-slate-500">{niche.specificAngle}</p>
                    </div>
                    <ScoreBadge score={niche.opportunityScore} />
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    <div><div className="text-[9px] text-slate-500 mb-0.5">Demand</div><ScoreBar value={niche.demandSignal} color="emerald" /><div className="text-[9px] text-slate-400 mt-0.5">{niche.demandSignal}</div></div>
                    <div><div className="text-[9px] text-slate-500 mb-0.5">Competition</div><ScoreBar value={niche.competitionLevel} color="rose" /><div className="text-[9px] text-slate-400 mt-0.5">{niche.competitionLevel}</div></div>
                    <div><div className="text-[9px] text-slate-500 mb-0.5">Opportunity</div><ScoreBar value={niche.opportunityScore} color="sky" /><div className="text-[9px] text-slate-400 mt-0.5">{niche.opportunityScore}</div></div>
                  </div>
                  <div className="mt-3 space-y-2">
                    <div><div className="text-[9px] text-slate-500 mb-1">Example Products</div><div className="space-y-0.5">{niche.exampleProducts.map((p, j) => <div key={j} className="text-[10px] text-slate-300">• {p}</div>)}</div></div>
                    <div className="flex gap-3">
                      <div><div className="text-[9px] text-slate-500 mb-1">Styles</div><div className="flex flex-wrap gap-1">{niche.styleModifiers.map(s => <span key={s} className="rounded bg-violet-900/20 px-1.5 py-0.5 text-[9px] text-violet-400">{s}</span>)}</div></div>
                      <div><div className="text-[9px] text-slate-500 mb-1">Materials</div><div className="flex flex-wrap gap-1">{niche.materialSuggestions.map(m => <span key={m} className="rounded bg-slate-800 px-1.5 py-0.5 text-[9px] text-slate-400">{m}</span>)}</div></div>
                    </div>
                    <div className="text-[9px] text-slate-500"><Users className="inline h-3 w-3 mr-1" />{niche.targetDemographic}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── LIFECYCLE PANEL ────────────────────────────────────────────── */}
      {scan && activePanel === 'lifecycle' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">Track where each trend is in its lifecycle: Emerging → Rising → Peak → Declining</p>
            <button onClick={classifyLifecycles} className="flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-xs text-slate-300 hover:bg-slate-700 transition-all"><Activity className="h-3.5 w-3.5" /> Classify Lifecycles</button>
          </div>
          {lifecycles.length === 0 ? (
            <div className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-8 text-center">
              <Activity className="mx-auto h-8 w-8 text-slate-600 mb-2" />
              <p className="text-xs text-slate-500">Click &quot;Classify Lifecycles&quot; to analyze trend stages</p>
            </div>
          ) : (
            <div className="space-y-3">
              {lifecycles.map((lc, i) => {
                const stageColors: Record<string, string> = { emerging: 'border-sky-700/40 bg-sky-900/10', rising: 'border-emerald-700/40 bg-emerald-900/10', peak: 'border-amber-700/40 bg-amber-900/10', declining: 'border-red-700/40 bg-red-900/10' };
                const stageIcons: Record<string, string> = { emerging: '🌱', rising: '📈', peak: '🔥', declining: '📉' };
                const urgencyColors: Record<string, string> = { 'act-now': 'bg-emerald-500/20 text-emerald-400', prepare: 'bg-sky-500/20 text-sky-400', monitor: 'bg-amber-500/20 text-amber-400', avoid: 'bg-red-500/20 text-red-400' };
                return (
                  <div key={i} className={`rounded-xl border p-4 ${stageColors[lc.currentStage] || 'border-slate-700/50 bg-slate-900/40'}`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">{stageIcons[lc.currentStage] || '📊'}</span>
                          <h3 className="text-sm font-bold text-slate-100">{lc.trendTitle}</h3>
                          <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${urgencyColors[lc.actionUrgency] || 'bg-slate-700 text-slate-400'}`}>{lc.actionUrgency.replace('-', ' ')}</span>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-slate-500">
                          <span>Stage: <span className="font-bold text-slate-300 capitalize">{lc.currentStage}</span></span>
                          <span>Confidence: <span className="font-bold text-slate-300">{lc.stageConfidence}%</span></span>
                          <span>Velocity: <span className="font-bold text-slate-300 capitalize">{lc.velocityTrend}</span></span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-slate-100">{lc.estimatedDaysRemaining}d</div>
                        <div className="text-[9px] text-slate-500">remaining</div>
                      </div>
                    </div>
                    {/* Timeline visualization */}
                    <div className="mt-3 flex items-end gap-0.5 h-12">
                      {lc.timeline.map((pt, j) => {
                        const barColor = pt.stage === 'emerging' ? 'bg-sky-500' : pt.stage === 'rising' ? 'bg-emerald-500' : pt.stage === 'peak' ? 'bg-amber-500' : 'bg-red-500';
                        const maxVol = Math.max(...lc.timeline.map(t => t.volume), 1);
                        const height = Math.max(4, (pt.volume / maxVol) * 48);
                        return <div key={j} className={`flex-1 rounded-t ${barColor} transition-all`} style={{ height: `${height}px` }} title={`${pt.date}: ${pt.volume} (${pt.stage})`} />;
                      })}
                    </div>
                    <div className="flex justify-between text-[8px] text-slate-600 mt-0.5">
                      <span>{lc.timeline[0]?.date}</span>
                      <span>{lc.timeline[lc.timeline.length - 1]?.date}</span>
                    </div>
                    <div className="mt-3 rounded-lg bg-slate-800/50 px-3 py-2 text-[10px] text-slate-400">
                      <Lightbulb className="inline h-3 w-3 text-amber-400 mr-1" />{lc.recommendation}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── MATERIALS PANEL ────────────────────────────────────────────── */}
      {scan && activePanel === 'materials' && (
        <div className="space-y-4">
          <p className="text-xs text-slate-500">Material popularity, pricing stability, and seasonal demand intelligence</p>
          {materialTrends.length === 0 ? (
            <div className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-8 text-center">
              <TreePine className="mx-auto h-8 w-8 text-slate-600 mb-2" />
              <p className="text-xs text-slate-500">No material trend data available</p>
            </div>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
              {materialTrends.map((mat) => (
                <div key={mat.materialId} className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 text-[9px] font-medium text-emerald-300">{mat.category}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${mat.trendDirection === 'rising' ? 'bg-emerald-500/20 text-emerald-400' : mat.trendDirection === 'declining' ? 'bg-red-500/20 text-red-400' : 'bg-slate-700 text-slate-400'}`}>{mat.trendDirection === 'rising' ? `↑ +${mat.growthRate.toFixed(1)}%` : mat.trendDirection === 'declining' ? `↓ ${mat.growthRate.toFixed(1)}%` : `→ ${mat.growthRate.toFixed(1)}%`}</span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-100">{mat.materialName}</h3>
                    </div>
                    <ScoreBadge score={mat.popularityScore} />
                  </div>
                  <div className="mb-2"><ScoreBar value={mat.popularityScore} color="emerald" /></div>
                  <div className="grid grid-cols-3 gap-2 text-[10px] mb-3">
                    <div><span className="text-slate-500">Price:</span> <span className={mat.priceStability === 'stable' ? 'text-emerald-400' : mat.priceStability === 'volatile' ? 'text-red-400' : 'text-amber-400'}>{mat.priceStability}</span></div>
                    <div><span className="text-slate-500">Supply:</span> <span className={mat.supplyStatus === 'abundant' ? 'text-emerald-400' : mat.supplyStatus === 'limited' ? 'text-amber-400' : 'text-slate-300'}>{mat.supplyStatus}</span></div>
                    <div><span className="text-slate-500">Eco:</span> <span className="text-slate-300">{mat.sustainabilityScore}/100</span></div>
                  </div>
                  {/* Mini seasonal chart */}
                  <div className="flex items-end gap-0.5 h-8 mb-1">
                    {mat.seasonalDemand.map((sd) => {
                      const barColor = sd.demandLevel >= 80 ? 'bg-emerald-500' : sd.demandLevel >= 60 ? 'bg-sky-500' : 'bg-slate-600';
                      return <div key={sd.month} className={`flex-1 rounded-t ${barColor}`} style={{ height: `${(sd.demandLevel / 100) * 32}px` }} title={`${sd.month}: ${sd.demandLevel}`} />;
                    })}
                  </div>
                  <div className="flex justify-between text-[7px] text-slate-600">
                    {mat.seasonalDemand.map(sd => <span key={sd.month}>{sd.month}</span>)}
                  </div>
                  <div className="mt-2"><div className="text-[9px] text-slate-500 mb-1">Top Products</div><div className="flex flex-wrap gap-1">{mat.topProducts.slice(0, 4).map(p => <span key={p} className="rounded bg-slate-800 px-1.5 py-0.5 text-[9px] text-slate-400">{p}</span>)}</div></div>
                  <div className="mt-2 rounded-lg bg-slate-800/50 px-2.5 py-1.5 text-[9px] text-slate-400">{mat.recommendation}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── CONTENT IDEAS PANEL ────────────────────────────────────────── */}
      {scan && activePanel === 'content' && (
        <div className="space-y-4">
          <p className="text-xs text-slate-500">Marketing content ideas for your laser products — TikTok, Instagram, Pinterest, YouTube, Facebook</p>
          {!contentPlan ? (
            <div className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-8 text-center">
              <Megaphone className="mx-auto h-8 w-8 text-slate-600 mb-2" />
              <p className="text-xs text-slate-500">Generate products first, then click &quot;Content Ideas&quot; on a product to get marketing suggestions</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-sky-700/30 bg-sky-900/10 p-4">
                <h3 className="text-sm font-bold text-slate-100 mb-1">Content Plan: {contentPlan.productName}</h3>
                <p className="text-[10px] text-slate-500">Trend: {contentPlan.trendTitle}</p>
              </div>
              {/* Weekly schedule */}
              <div className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-4">
                <h4 className="text-xs font-semibold text-slate-200 mb-3 flex items-center gap-2"><Calendar className="h-4 w-4 text-sky-400" /> Weekly Posting Schedule</h4>
                <div className="space-y-1.5">
                  {contentPlan.weeklySchedule.map((day, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-lg bg-slate-800/50 px-3 py-2 text-[10px]">
                      <span className="font-bold text-slate-200 w-20">{day.day}</span>
                      <span className="rounded bg-violet-900/30 px-1.5 py-0.5 text-violet-400">{day.platform}</span>
                      <span className="rounded bg-slate-700 px-1.5 py-0.5 text-slate-400">{day.contentType}</span>
                      <span className="text-slate-300 flex-1">{day.title}</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Content ideas */}
              <div className="grid gap-3 lg:grid-cols-2">
                {contentPlan.ideas.map((idea, i) => {
                  const platformColors: Record<string, string> = { tiktok: 'border-pink-700/30 bg-pink-900/10', instagram: 'border-purple-700/30 bg-purple-900/10', pinterest: 'border-red-700/30 bg-red-900/10', youtube: 'border-red-700/30 bg-red-900/10', facebook: 'border-blue-700/30 bg-blue-900/10' };
                  const platformEmoji: Record<string, string> = { tiktok: '🎵', instagram: '📸', pinterest: '📌', youtube: '▶️', facebook: '👥' };
                  const reachColors: Record<string, string> = { 'viral-potential': 'text-emerald-400', high: 'text-sky-400', medium: 'text-amber-400', low: 'text-slate-400' };
                  return (
                    <div key={i} className={`rounded-xl border p-4 ${platformColors[idea.platform] || 'border-slate-700/50 bg-slate-900/40'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">{platformEmoji[idea.platform] || '📱'}</span>
                        <span className="text-xs font-bold text-slate-200 capitalize">{idea.platform}</span>
                        <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[9px] text-slate-400">{idea.contentType}</span>
                        <span className={`ml-auto text-[9px] font-bold ${reachColors[idea.estimatedReach] || 'text-slate-400'}`}>{idea.estimatedReach} reach</span>
                      </div>
                      <div className="rounded-lg bg-slate-800/50 px-3 py-2 text-[10px] text-slate-200 mb-2 font-medium">{idea.hook}</div>
                      <p className="text-[10px] text-slate-400 mb-2">{idea.caption}</p>
                      <div className="flex flex-wrap gap-1 mb-2">{idea.hashtags.slice(0, 8).map(h => <span key={h} className="text-[9px] text-sky-400">{h}</span>)}</div>
                      <div className="flex items-center gap-3 text-[9px] text-slate-500">
                        <span><Clock className="inline h-2.5 w-2.5 mr-0.5" />{idea.bestPostingTime}</span>
                      </div>
                      <div className="mt-2 text-[9px] text-slate-500">{idea.storytellingAngle}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── PRODUCTION ADVISOR PANEL ───────────────────────────────────── */}
      {scan && activePanel === 'production' && (
        <div className="space-y-4">
          <p className="text-xs text-slate-500">Production planning intelligence — batch sizes, material purchasing, timing recommendations</p>
          {!productionRec ? (
            <div className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-8 text-center">
              <Settings className="mx-auto h-8 w-8 text-slate-600 mb-2" />
              <p className="text-xs text-slate-500">Generate products first, then click &quot;Production Plan&quot; on a product</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-sky-700/30 bg-sky-900/10 p-4">
                <h3 className="text-sm font-bold text-slate-100 mb-1">Production Plan: {productionRec.trendTitle}</h3>
                <p className="text-[10px] text-slate-500">Product type: {productionRec.productType}</p>
              </div>
              {/* Key metrics */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                <StatCard icon={<Package className="h-4 w-4 text-violet-400" />} label="Batch Size" value={productionRec.recommendedBatchSize} />
                <StatCard icon={<Clock className="h-4 w-4 text-sky-400" />} label="Production Hours" value={`${productionRec.estimatedProductionHours}h`} />
                <StatCard icon={<Scissors className="h-4 w-4 text-emerald-400" />} label="Daily Output" value={productionRec.dailyOutputCapacity} />
                <StatCard icon={<DollarSign className="h-4 w-4 text-emerald-400" />} label="Weekly Revenue" value={`$${productionRec.weeklyRevenueEstimate}`} />
                <StatCard icon={<Layers className="h-4 w-4 text-amber-400" />} label="Nesting Eff." value={`${productionRec.nestingEfficiency}%`} />
                <StatCard icon={<BarChart3 className="h-4 w-4 text-sky-400" />} label="Sheet Usage" value={`${productionRec.sheetUtilization}%`} />
              </div>
              {/* Batch reasoning */}
              <div className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-4">
                <h4 className="text-xs font-semibold text-slate-200 mb-2">Batch Size Reasoning</h4>
                <p className="text-[10px] text-slate-400">{productionRec.batchSizeReasoning}</p>
              </div>
              {/* Optimal dimensions */}
              <div className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-4">
                <h4 className="text-xs font-semibold text-slate-200 mb-3">Optimal Dimensions</h4>
                <div className="grid gap-2 sm:grid-cols-3">
                  {productionRec.optimalDimensions.map((dim, i) => (
                    <div key={i} className="rounded-lg bg-slate-800/50 p-3">
                      <div className="text-xs font-bold text-slate-200">{dim.label}</div>
                      <div className="text-[10px] text-slate-400">{dim.widthMm} × {dim.heightMm} mm</div>
                      <div className="text-[9px] text-slate-500 mt-1">{dim.reason}</div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Material purchasing */}
              <div className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-4">
                <h4 className="text-xs font-semibold text-slate-200 mb-3">Material Purchasing</h4>
                {productionRec.materialPurchasing.map((mp, i) => (
                  <div key={i} className="rounded-lg bg-slate-800/50 p-3 mb-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-200">{mp.materialName}</span>
                      <span className="text-xs font-bold text-emerald-400">${mp.estimatedCost}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-400">
                      <div>Sheets: <span className="text-slate-300">{mp.sheetsNeeded}</span></div>
                      <div>Lead time: <span className="text-slate-300">{mp.leadTimeDays}d</span></div>
                      <div>Supplier: <span className="text-slate-300">{mp.supplier}</span></div>
                    </div>
                    <div className="mt-1 text-[9px] text-sky-400">{mp.recommendation}</div>
                  </div>
                ))}
              </div>
              {/* Production timing */}
              <div className={`rounded-xl border p-4 ${productionRec.productionTiming.urgency === 'immediate' ? 'border-red-700/40 bg-red-900/10' : productionRec.productionTiming.urgency === 'this-week' ? 'border-amber-700/40 bg-amber-900/10' : 'border-slate-700/50 bg-slate-900/40'}`}>
                <h4 className="text-xs font-semibold text-slate-200 mb-3 flex items-center gap-2"><Timer className="h-4 w-4 text-amber-400" /> Production Timing</h4>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-[10px]">
                  <div><span className="text-slate-500">Start Date:</span><div className="font-bold text-slate-200">{productionRec.productionTiming.bestStartDate}</div></div>
                  <div><span className="text-slate-500">Lead Time:</span><div className="font-bold text-slate-200">{productionRec.productionTiming.leadTimeRequired}d total</div></div>
                  <div><span className="text-slate-500">Peak Window:</span><div className="font-bold text-slate-200">{productionRec.productionTiming.peakDemandWindow}</div></div>
                  <div><span className="text-slate-500">Urgency:</span><div className={`font-bold uppercase ${productionRec.productionTiming.urgency === 'immediate' ? 'text-red-400' : productionRec.productionTiming.urgency === 'this-week' ? 'text-amber-400' : 'text-slate-300'}`}>{productionRec.productionTiming.urgency}</div></div>
                </div>
                <div className="mt-2 text-[10px] text-slate-400">{productionRec.productionTiming.reasoning}</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── PERSONALIZED FEED PANEL ────────────────────────────────────── */}
      {scan && activePanel === 'personalized' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">Trends personalized to your business profile, materials, and activity</p>
            <button onClick={loadPersonalizedFeed} className="flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-xs text-slate-300 hover:bg-slate-700 transition-all"><Heart className="h-3.5 w-3.5" /> Load My Feed</button>
          </div>
          {!personalizedFeed ? (
            <div className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-8 text-center">
              <Heart className="mx-auto h-8 w-8 text-slate-600 mb-2" />
              <p className="text-xs text-slate-500">Click &quot;Load My Feed&quot; to get personalized trend recommendations</p>
            </div>
          ) : (
            <div className="space-y-6">
              {[
                { title: 'Top Picks For You', items: personalizedFeed.topPicks, icon: <Star className="h-4 w-4 text-amber-400" />, color: 'border-amber-700/30 bg-amber-900/10' },
                { title: 'Quick Wins', items: personalizedFeed.quickWins, icon: <Zap className="h-4 w-4 text-emerald-400" />, color: 'border-emerald-700/30 bg-emerald-900/10' },
                { title: 'New For You', items: personalizedFeed.newForYou, icon: <Sparkles className="h-4 w-4 text-sky-400" />, color: 'border-sky-700/30 bg-sky-900/10' },
                { title: 'Based On Your History', items: personalizedFeed.basedOnHistory, icon: <Clock className="h-4 w-4 text-violet-400" />, color: 'border-violet-700/30 bg-violet-900/10' },
              ].filter(section => section.items.length > 0).map((section) => (
                <div key={section.title}>
                  <h3 className="text-xs font-semibold text-slate-200 mb-3 flex items-center gap-2">{section.icon} {section.title}</h3>
                  <div className="grid gap-3 lg:grid-cols-2">
                    {section.items.map((item, i) => (
                      <div key={i} className={`rounded-xl border p-4 ${section.color}`}>
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="text-sm font-bold text-slate-100">{item.trendTitle}</h4>
                          <ScoreBadge score={item.relevanceScore} />
                        </div>
                        <p className="text-[10px] text-slate-400 mb-2">{item.personalizedInsight}</p>
                        <div className="flex flex-wrap gap-1 mb-2">{item.matchReasons.map((r, j) => <span key={j} className="rounded bg-slate-800/50 px-1.5 py-0.5 text-[9px] text-slate-400">{r}</span>)}</div>
                        <div className="flex items-center justify-between text-[10px]">
                          <span className={`font-bold ${item.estimatedEffort === 'low' ? 'text-emerald-400' : item.estimatedEffort === 'medium' ? 'text-amber-400' : 'text-red-400'}`}>{item.estimatedEffort} effort</span>
                          <span className="text-slate-500">{item.suggestedAction}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
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
