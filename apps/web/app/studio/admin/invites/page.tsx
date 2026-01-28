'use client';

import { useState, useEffect } from 'react';
import { Copy, Plus, Ban, Search, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/components/system';

interface AdminInvite {
  id: string;
  email: string;
  status: 'PENDING' | 'REDEEMED' | 'REVOKED' | 'EXPIRED';
  note: string | null;
  creditsGrant: number;
  durationDays: number;
  tokenLast4: string;
  expiresAt: string;
  redeemedAt: string | null;
  createdAt: string;
}

export default function AdminInvitesPage() {
  const [user, setUser] = useState<any>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [invites, setInvites] = useState<AdminInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [lastCreatedUrl, setLastCreatedUrl] = useState<string | null>(null);

  // Form state
  const [formEmail, setFormEmail] = useState('');
  const [formCredits, setFormCredits] = useState(200);
  const [formDuration, setFormDuration] = useState(30);
  const [formNote, setFormNote] = useState('');
  const [formValidity, setFormValidity] = useState(14);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setUserLoading(true);
        const res = await apiClient.get('/auth/me', { withCredentials: true });
        if (cancelled) return;
        setUser(res.data?.user ?? null);
      } catch {
        if (cancelled) return;
        setUser(null);
      } finally {
        if (cancelled) return;
        setUserLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const fetchInvites = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (searchQuery) params.set('q', searchQuery);

      const res = await apiClient.get(`/admin/invites?${params.toString()}`, {
        withCredentials: true,
      });

      setInvites(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error('Failed to fetch invites:', error);
      toast('Failed to load invites', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvites();
  }, [statusFilter, searchQuery]);

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const res = await apiClient.post(
        '/admin/invites',
        {
          email: formEmail,
          creditsGrant: formCredits,
          durationDays: formDuration,
          note: formNote || undefined,
          inviteValidityDays: formValidity,
        },
        { withCredentials: true },
      );

      setLastCreatedUrl(res.data?.redeemUrl ?? null);
      toast('Invite created successfully!', 'success');

      // Reset form
      setFormEmail('');
      setFormNote('');
      setFormCredits(200);
      setFormDuration(30);
      setFormValidity(14);

      // Refresh list
      fetchInvites();
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || 'Failed to create invite';
      toast(msg, 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (inviteId: string) => {
    if (!confirm('Are you sure you want to revoke this invite?')) return;

    try {
      await apiClient.post(`/admin/invites/${inviteId}/revoke`, null, { withCredentials: true });

      toast('Invite revoked', 'success');
      fetchInvites();
    } catch (error) {
      toast('Failed to revoke invite', 'error');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast('Copied to clipboard!', 'success');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center rounded-full border border-yellow-700/30 bg-yellow-900/20 px-2 py-0.5 text-xs text-yellow-300">
            <Clock className="mr-1 h-3 w-3" />Pending
          </span>
        );
      case 'REDEEMED':
        return (
          <span className="inline-flex items-center rounded-full border border-emerald-700/30 bg-emerald-900/20 px-2 py-0.5 text-xs text-emerald-300">
            <CheckCircle className="mr-1 h-3 w-3" />Redeemed
          </span>
        );
      case 'REVOKED':
        return (
          <span className="inline-flex items-center rounded-full border border-red-700/30 bg-red-900/20 px-2 py-0.5 text-xs text-red-300">
            <XCircle className="mr-1 h-3 w-3" />Revoked
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="inline-flex items-center rounded-full border border-slate-700/50 bg-slate-800/40 px-2 py-0.5 text-xs text-slate-300">
            <AlertCircle className="mr-1 h-3 w-3" />Expired
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center rounded-full border border-slate-700/50 bg-slate-900/40 px-2 py-0.5 text-xs text-slate-300">
            {status}
          </span>
        );
    }
  };

  if (userLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-slate-400">Loading...</div>
      </div>
    );
  }

  if (user?.role !== 'ADMIN') {
    return (
      <div className="p-8">
        <div className="rounded-xl border border-red-800/40 bg-red-900/20 p-8 text-center">
          <AlertCircle className="mx-auto mb-4 h-10 w-10 text-red-400" />
          <h2 className="text-xl font-semibold text-slate-100">Access Denied</h2>
          <p className="mt-2 text-sm text-slate-400">You need admin privileges to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Admin Edition Invites</h1>
          <p className="mt-1 text-sm text-slate-400">Manage community admin invites for PRO access + AI credits</p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="inline-flex items-center rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-600"
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Invite
        </button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <div>
            <h2 className="text-lg font-semibold">Create New Invite</h2>
            <p className="mt-1 text-sm text-slate-400">
              Generate a one-time invite link for a Facebook group admin
            </p>
          </div>

          <div className="mt-4">
            <form onSubmit={handleCreateInvite} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium text-slate-200">Recipient Email *</label>
                  <input
                    id="email"
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="admin@example.com"
                    required
                    className="w-full rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="note" className="text-sm font-medium text-slate-200">Note (Group Name)</label>
                  <input
                    id="note"
                    value={formNote}
                    onChange={(e) => setFormNote(e.target.value)}
                    placeholder="e.g., Laser Cutting Enthusiasts"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="credits" className="text-sm font-medium text-slate-200">AI Credits Grant</label>
                  <input
                    id="credits"
                    type="number"
                    value={formCredits}
                    onChange={(e) => setFormCredits(Number(e.target.value))}
                    min={0}
                    max={10000}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-slate-100"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="duration" className="text-sm font-medium text-slate-200">PRO Duration (days)</label>
                  <input
                    id="duration"
                    type="number"
                    value={formDuration}
                    onChange={(e) => setFormDuration(Number(e.target.value))}
                    min={1}
                    max={365}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-slate-100"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="validity" className="text-sm font-medium text-slate-200">Invite Validity (days)</label>
                  <input
                    id="validity"
                    type="number"
                    value={formValidity}
                    onChange={(e) => setFormValidity(Number(e.target.value))}
                    min={1}
                    max={90}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-slate-100"
                  />
                  <p className="text-xs text-slate-500">How long the invite link is valid</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={creating}
                  className="inline-flex items-center rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-600 disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create Invite'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="inline-flex items-center rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
                >
                  Cancel
                </button>
              </div>
            </form>

            {/* Show created URL */}
            {lastCreatedUrl && (
              <div className="mt-4 rounded-lg border border-emerald-700/30 bg-emerald-900/20 p-4">
                <p className="mb-2 text-sm font-medium text-emerald-200">
                  ✅ Invite created! Copy this link (shown only once):
                </p>
                <div className="flex items-center gap-2">
                  <input
                    value={lastCreatedUrl}
                    readOnly
                    className="w-full flex-1 rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 font-mono text-xs text-slate-100"
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(lastCreatedUrl)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 text-slate-200 hover:bg-slate-800"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <div className="flex flex-wrap gap-4">
          <div className="min-w-[220px] flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                placeholder="Search by email or note..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950/40 py-2 pl-9 pr-3 text-sm text-slate-100 placeholder:text-slate-600"
              />
            </div>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-slate-100"
          >
            <option value="">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="REDEEMED">Redeemed</option>
            <option value="REVOKED">Revoked</option>
            <option value="EXPIRED">Expired</option>
          </select>
        </div>
      </div>

      {/* Invites Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-400">Loading...</div>
        ) : invites.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">
            No invites found. Create your first invite above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-950/40">
                <tr className="text-left text-xs text-slate-400">
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Note</th>
                  <th className="px-4 py-3 font-medium">Credits</th>
                  <th className="px-4 py-3 font-medium">Duration</th>
                  <th className="px-4 py-3 font-medium">Expires</th>
                  <th className="px-4 py-3 font-medium">Token</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {invites.map((invite) => (
                  <tr key={invite.id} className="hover:bg-slate-950/30">
                    <td className="px-4 py-3 font-mono text-xs text-slate-200">{invite.email}</td>
                    <td className="px-4 py-3">{getStatusBadge(invite.status)}</td>
                    <td className="max-w-[200px] truncate px-4 py-3 text-slate-300">{invite.note || '-'}</td>
                    <td className="px-4 py-3 text-slate-300">{invite.creditsGrant}</td>
                    <td className="px-4 py-3 text-slate-300">{invite.durationDays}d</td>
                    <td className="px-4 py-3 text-xs text-slate-300">
                      {new Date(invite.expiresAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-300">...{invite.tokenLast4}</td>
                    <td className="px-4 py-3">
                      {invite.status === 'PENDING' && (
                        <button
                          type="button"
                          onClick={() => handleRevoke(invite.id)}
                          className="inline-flex items-center justify-center rounded-md border border-red-800/40 bg-red-900/20 px-3 py-1.5 text-xs font-medium text-red-200 hover:bg-red-900/30"
                        >
                          <Ban className="mr-1 h-3.5 w-3.5" />
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
