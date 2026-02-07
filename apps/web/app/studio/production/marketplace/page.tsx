'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import {
  ShoppingBag, Plus, Edit2, Trash2, Send, ExternalLink, ArrowLeft,
  Loader2, Tag, DollarSign, Eye, AlertTriangle, CheckCircle, X, Save,
  Package, Globe, Store,
} from 'lucide-react';

interface Listing {
  id: string; title: string; description: string; platform: string;
  productType: string | null; materialLabel: string | null; sizeMm: string | null;
  price: number | null; currency: string; costOfGoods: number | null;
  profitMargin: number | null; sku: string | null; quantity: number;
  status: string; publishedAt: string | null;
  externalListingId: string | null; externalUrl: string | null;
  tagsJson: string[] | null; category: string | null;
  createdAt: string;
}

const PLATFORMS = ['ETSY', 'SHOPIFY', 'WOOCOMMERCE', 'INTERNAL'] as const;
const statusColors: Record<string, string> = {
  DRAFT: 'bg-slate-700 text-slate-300', PUBLISHED: 'bg-emerald-900/50 text-emerald-400',
  PENDING_REVIEW: 'bg-amber-900/50 text-amber-400', PAUSED: 'bg-amber-900/50 text-amber-300',
  EXPIRED: 'bg-red-900/50 text-red-400', DELETED: 'bg-slate-800 text-slate-500',
};
const platformIcons: Record<string, any> = {
  ETSY: Store, SHOPIFY: Globe, WOOCOMMERCE: Globe, INTERNAL: Package,
  AMAZON_HANDMADE: Globe, EBAY: Globe,
};

export default function MarketplacePage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);

  const fetchUser = useCallback(async () => {
    try {
      const res = await apiClient.get('/auth/me');
      const uid = res.data?.user?.id;
      setUserId(uid);
      return uid;
    } catch { return null; }
  }, []);

  const fetchListings = useCallback(async (uid?: string) => {
    try {
      setLoading(true);
      const params = uid ? `?userId=${uid}` : '';
      const [listRes, statsRes] = await Promise.all([
        apiClient.get(`/marketplace/listings${params}`),
        uid ? apiClient.get(`/marketplace/stats/${uid}`) : Promise.resolve({ data: null }),
      ]);
      setListings(listRes.data || []);
      setStats(statsRes.data);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => {
    (async () => {
      const uid = await fetchUser();
      if (uid) await fetchListings(uid);
      else setLoading(false);
    })();
  }, [fetchUser, fetchListings]);

  const handlePublish = async (id: string) => {
    if (!confirm('Publish this listing? You can review it on the platform after.')) return;
    setPublishing(id);
    try {
      await apiClient.post(`/marketplace/listings/${id}/publish`);
      if (userId) await fetchListings(userId);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Publish failed');
    } finally { setPublishing(null); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this listing?')) return;
    try {
      await apiClient.delete(`/marketplace/listings/${id}`);
      if (userId) await fetchListings(userId);
    } catch {}
  };

  if (loading) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <a href="/studio/production" className="mb-2 flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300">
            <ArrowLeft className="h-3 w-3" /> Production Dashboard
          </a>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
            <ShoppingBag className="h-7 w-7 text-emerald-400" /> Marketplace
          </h1>
          <p className="mt-1 text-sm text-slate-500">Create and publish product listings to online marketplaces</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition-colors">
          <Plus className="h-4 w-4" /> New Listing
        </button>
      </div>

      {/* Stats Bar */}
      {stats && (
        <div className="grid grid-cols-4 gap-3">
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3 text-center">
            <div className="text-lg font-bold text-slate-200">{stats.total}</div>
            <div className="text-[10px] text-slate-500">Total</div>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3 text-center">
            <div className="text-lg font-bold text-emerald-400">{stats.published}</div>
            <div className="text-[10px] text-slate-500">Published</div>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3 text-center">
            <div className="text-lg font-bold text-slate-300">{stats.draft}</div>
            <div className="text-[10px] text-slate-500">Drafts</div>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3 text-center">
            <div className="text-lg font-bold text-emerald-400">{stats.avgProfitMargin}%</div>
            <div className="text-[10px] text-slate-500">Avg Margin</div>
          </div>
        </div>
      )}

      {/* Add Form */}
      {showAdd && (
        <ListingForm
          userId={userId}
          onSave={async () => { setShowAdd(false); if (userId) await fetchListings(userId); }}
          onCancel={() => setShowAdd(false)}
        />
      )}

      {/* Listings */}
      {listings.length === 0 && !showAdd && (
        <div className="rounded-xl border border-dashed border-slate-700 p-12 text-center">
          <ShoppingBag className="mx-auto h-12 w-12 text-slate-600 mb-3" />
          <h3 className="text-lg font-medium text-slate-300">No listings yet</h3>
          <p className="mt-1 text-sm text-slate-500">Create listings from your laser products or manually</p>
          <button onClick={() => setShowAdd(true)} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500">
            <Plus className="h-4 w-4" /> Create Listing
          </button>
        </div>
      )}

      <div className="space-y-3">
        {listings.map(listing => (
          <div key={listing.id} className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            {editId === listing.id ? (
              <ListingForm
                listing={listing}
                userId={userId}
                onSave={async () => { setEditId(null); if (userId) await fetchListings(userId); }}
                onCancel={() => setEditId(null)}
              />
            ) : (
              <div className="flex items-start gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {(() => { const Icon = platformIcons[listing.platform] || Package; return <Icon className="h-3.5 w-3.5 text-slate-500 shrink-0" />; })()}
                    <h3 className="text-sm font-semibold text-slate-200 truncate">{listing.title}</h3>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColors[listing.status] || 'bg-slate-700 text-slate-400'}`}>
                      {listing.status}
                    </span>
                    <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-500">{listing.platform}</span>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-1 mb-2">{listing.description}</p>
                  <div className="flex flex-wrap gap-3 text-[11px]">
                    {listing.price && <span className="flex items-center gap-1"><DollarSign className="h-3 w-3 text-emerald-500" /><strong className="text-emerald-400">${Number(listing.price).toFixed(2)}</strong></span>}
                    {listing.profitMargin != null && <span className="text-slate-500">Margin: <strong className="text-emerald-400">{Math.round(listing.profitMargin)}%</strong></span>}
                    {listing.sku && <span className="text-slate-500">SKU: <strong className="text-slate-300">{listing.sku}</strong></span>}
                    {listing.productType && <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400">{listing.productType}</span>}
                    {listing.materialLabel && <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400">{listing.materialLabel}</span>}
                  </div>
                  {listing.tagsJson && listing.tagsJson.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {(listing.tagsJson as string[]).slice(0, 6).map((tag, i) => (
                        <span key={i} className="flex items-center gap-0.5 rounded bg-slate-800/60 px-1.5 py-0.5 text-[9px] text-slate-500">
                          <Tag className="h-2.5 w-2.5" />{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 flex-col gap-1.5">
                  {listing.status === 'DRAFT' && (
                    <button
                      onClick={() => handlePublish(listing.id)}
                      disabled={publishing === listing.id}
                      className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                    >
                      {publishing === listing.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                      Publish
                    </button>
                  )}
                  {listing.externalUrl && (
                    <a href={listing.externalUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-300 hover:bg-slate-800">
                      <ExternalLink className="h-3 w-3" /> View
                    </a>
                  )}
                  <button onClick={() => setEditId(listing.id)} className="flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-300 hover:bg-slate-800">
                    <Edit2 className="h-3 w-3" /> Edit
                  </button>
                  <button onClick={() => handleDelete(listing.id)} className="flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-red-400/70 hover:text-red-400 hover:bg-slate-800">
                    <Trash2 className="h-3 w-3" /> Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Listing Form ────────────────────────────────────────────────
function ListingForm({ listing, userId, onSave, onCancel }: {
  listing?: Listing; userId: string | null;
  onSave: () => void; onCancel: () => void;
}) {
  const [form, setForm] = useState({
    platform: listing?.platform || 'INTERNAL',
    title: listing?.title || '',
    description: listing?.description || '',
    productType: listing?.productType || '',
    materialLabel: listing?.materialLabel || '',
    sizeMm: listing?.sizeMm || '',
    price: listing?.price?.toString() || '',
    costOfGoods: listing?.costOfGoods?.toString() || '',
    sku: listing?.sku || '',
    quantity: listing?.quantity?.toString() || '999',
    tags: listing?.tagsJson?.join(', ') || '',
    category: listing?.category || '',
  });
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!form.productType || !form.materialLabel || !form.sizeMm) {
      setError('Fill in product type, material, and size to auto-generate content');
      return;
    }
    setGenerating(true);
    setError(null);
    try {
      const res = await apiClient.post('/marketplace/generate-content', {
        productType: form.productType,
        materialLabel: form.materialLabel,
        sizeMm: form.sizeMm,
        costOfGoods: form.costOfGoods ? parseFloat(form.costOfGoods) : undefined,
      });
      const c = res.data;
      setForm(f => ({
        ...f,
        title: c.title || f.title,
        description: c.description || f.description,
        tags: (c.tags || []).join(', '),
        category: c.category || f.category,
        price: c.suggestedPrice?.toString() || f.price,
        costOfGoods: c.costOfGoods?.toString() || f.costOfGoods,
        sku: c.sku || f.sku,
      }));
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Content generation failed');
    } finally { setGenerating(false); }
  };

  const handleSave = async () => {
    if (!form.title.trim()) { setError('Title is required'); return; }
    setSaving(true);
    setError(null);
    try {
      const data = {
        userId,
        platform: form.platform,
        title: form.title,
        description: form.description,
        productType: form.productType || null,
        materialLabel: form.materialLabel || null,
        sizeMm: form.sizeMm || null,
        price: form.price ? parseFloat(form.price) : null,
        costOfGoods: form.costOfGoods ? parseFloat(form.costOfGoods) : null,
        sku: form.sku || null,
        quantity: parseInt(form.quantity) || 999,
        tags: form.tags ? form.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
        category: form.category || null,
      };
      if (listing) {
        await apiClient.put(`/marketplace/listings/${listing.id}`, data);
      } else {
        await apiClient.post('/marketplace/listings', data);
      }
      onSave();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }));

  const inputCls = 'mt-0.5 w-full rounded border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-200 focus:border-emerald-600 focus:outline-none';

  return (
    <div className="rounded-xl border border-emerald-800/40 bg-emerald-900/10 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-emerald-300">{listing ? 'Edit Listing' : 'New Listing'}</h3>
        <button onClick={onCancel} className="text-slate-500 hover:text-slate-300"><X className="h-4 w-4" /></button>
      </div>
      {error && <div className="text-xs text-red-400">{error}</div>}

      {/* Product info row for AI generation */}
      <div className="grid gap-3 sm:grid-cols-4">
        <div>
          <label className="text-[10px] text-slate-500">Product Type</label>
          <input value={form.productType} onChange={set('productType')} className={inputCls} placeholder="keychain" />
        </div>
        <div>
          <label className="text-[10px] text-slate-500">Material</label>
          <input value={form.materialLabel} onChange={set('materialLabel')} className={inputCls} placeholder="Plywood 3mm" />
        </div>
        <div>
          <label className="text-[10px] text-slate-500">Size (mm)</label>
          <input value={form.sizeMm} onChange={set('sizeMm')} className={inputCls} placeholder="50x30" />
        </div>
        <div className="flex items-end">
          <button onClick={handleGenerate} disabled={generating} className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-emerald-700/50 bg-emerald-900/30 px-3 py-1.5 text-xs text-emerald-400 hover:bg-emerald-900/50 disabled:opacity-50">
            {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Package className="h-3 w-3" />}
            AI Generate
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-[10px] text-slate-500">Platform</label>
          <select value={form.platform} onChange={set('platform')} className={inputCls}>
            {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] text-slate-500">Title *</label>
          <input value={form.title} onChange={set('title')} className={inputCls} placeholder="Custom Laser Engraved..." />
        </div>
      </div>

      <div>
        <label className="text-[10px] text-slate-500">Description</label>
        <textarea value={form.description} onChange={set('description')} rows={4} className={`${inputCls} resize-none`} />
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <div>
          <label className="text-[10px] text-slate-500">Price ($)</label>
          <input value={form.price} onChange={set('price')} type="number" step="0.01" className={inputCls} />
        </div>
        <div>
          <label className="text-[10px] text-slate-500">Cost of Goods ($)</label>
          <input value={form.costOfGoods} onChange={set('costOfGoods')} type="number" step="0.01" className={inputCls} />
        </div>
        <div>
          <label className="text-[10px] text-slate-500">SKU</label>
          <input value={form.sku} onChange={set('sku')} className={inputCls} />
        </div>
        <div>
          <label className="text-[10px] text-slate-500">Quantity</label>
          <input value={form.quantity} onChange={set('quantity')} type="number" className={inputCls} />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-[10px] text-slate-500">Tags (comma-separated)</label>
          <input value={form.tags} onChange={set('tags')} className={inputCls} placeholder="laser engraved, custom, gift" />
        </div>
        <div>
          <label className="text-[10px] text-slate-500">Category</label>
          <input value={form.category} onChange={set('category')} className={inputCls} placeholder="Home & Living" />
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50">
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
          {listing ? 'Update' : 'Create Listing'}
        </button>
        <button onClick={onCancel} className="rounded-lg border border-slate-700 px-4 py-2 text-xs text-slate-400 hover:bg-slate-800">Cancel</button>
      </div>
    </div>
  );
}
