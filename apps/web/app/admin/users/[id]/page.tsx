'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  CreditCard,
  RefreshCw,
  Clock,
  User as UserIcon,
  Shield,
  History,
} from 'lucide-react';

interface Entitlement {
  plan: string;
  aiCreditsTotal: number;
  aiCreditsUsed: number;
  aiCreditsRemaining: number;
  trialStartedAt: string | null;
  trialEndsAt: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  creditsNextGrantAt: string | null;
  updatedAt: string;
}

interface AuditLog {
  id: string;
  action: string;
  reason: string | null;
  deltaCredits: number | null;
  payload: any;
  createdAt: string;
  adminUser: {
    id: string;
    email: string;
    name: string;
  };
}

interface UserDetails {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    wpUserId: string | null;
    createdAt: string;
    updatedAt: string;
  };
  entitlement: Entitlement | null;
  auditLogs: AuditLog[];
}

export default function AdminUserDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;

  const [data, setData] = useState<UserDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [addCreditsOpen, setAddCreditsOpen] = useState(false);
  const [creditAmount, setCreditAmount] = useState('');
  const [creditReason, setCreditReason] = useState('');
  const [addingCredits, setAddingCredits] = useState(false);

  const [syncOpen, setSyncOpen] = useState(false);
  const [syncReason, setSyncReason] = useState('');
  const [syncing, setSyncing] = useState(false);

  const [planOpen, setPlanOpen] = useState(false);
  const [planValue, setPlanValue] = useState('INACTIVE');
  const [planReason, setPlanReason] = useState('');
  const [trialEndsAt, setTrialEndsAt] = useState('');
  const [updatingPlan, setUpdatingPlan] = useState(false);

  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  async function fetchUser() {
    setLoading(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
      const res = await fetch(`${apiBase}/admin/users/${userId}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch user');
      const result = await res.json();
      setData(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdatePlan(e: React.FormEvent) {
    e.preventDefault();
    setActionError(null);
    setActionSuccess(null);
    setUpdatingPlan(true);

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
      const res = await fetch(`${apiBase}/admin/users/${userId}/plan`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: planValue,
          trialEndsAt: trialEndsAt || undefined,
          reason: planReason,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({} as any));
        throw new Error(err.message || 'Failed to update plan');
      }

      setActionSuccess('Updated plan successfully');
      setPlanOpen(false);
      setPlanReason('');
      setTrialEndsAt('');
      fetchUser();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setUpdatingPlan(false);
    }
  }

  useEffect(() => {
    fetchUser();
  }, [userId]);

  async function handleAddCredits(e: React.FormEvent) {
    e.preventDefault();
    setActionError(null);
    setActionSuccess(null);
    setAddingCredits(true);

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
      const res = await fetch(`${apiBase}/admin/users/${userId}/credits/add`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Number(creditAmount),
          reason: creditReason,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to add credits');
      }

      setActionSuccess(`Added ${creditAmount} credits successfully`);
      setAddCreditsOpen(false);
      setCreditAmount('');
      setCreditReason('');
      fetchUser();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setAddingCredits(false);
    }
  }

  async function handleForceSync(e: React.FormEvent) {
    e.preventDefault();
    setActionError(null);
    setActionSuccess(null);
    setSyncing(true);

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
      const res = await fetch(`${apiBase}/admin/users/${userId}/sync-from-wp`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: syncReason }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to sync');
      }

      setActionSuccess('Synced from WordPress successfully');
      setSyncOpen(false);
      setSyncReason('');
      fetchUser();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setSyncing(false);
    }
  }

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-slate-400">Loading user...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-1 text-slate-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Users
        </Link>
        <div className="rounded-lg border border-red-800 bg-red-950/50 p-4 text-red-400">
          Error: {error || 'User not found'}
        </div>
      </div>
    );
  }

  const { user, entitlement, auditLogs } = data;

  return (
    <div className="space-y-6">
      <Link
        href="/admin/users"
        className="inline-flex items-center gap-1 text-slate-400 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Users
      </Link>

      {/* Action Feedback */}
      {actionSuccess && (
        <div className="rounded-lg border border-emerald-800 bg-emerald-950/50 p-4 text-emerald-400">
          {actionSuccess}
        </div>
      )}
      {actionError && (
        <div className="rounded-lg border border-red-800 bg-red-950/50 p-4 text-red-400">
          {actionError}
        </div>
      )}

      {/* User Info */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-slate-700 p-3">
              <UserIcon className="h-6 w-6 text-slate-300" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">{user.email}</h1>
              <p className="text-slate-400">{user.name}</p>
              <div className="mt-2 flex items-center gap-2">
                {user.role === 'ADMIN' && (
                  <span className="flex items-center gap-1 rounded-full bg-amber-900/40 px-2 py-0.5 text-xs text-amber-300">
                    <Shield className="h-3 w-3" />
                    Admin
                  </span>
                )}
                <span className={`rounded-full px-2 py-0.5 text-xs ${getPlanBadgeClass(entitlement?.plan || 'INACTIVE')}`}>
                  {entitlement?.plan || 'INACTIVE'}
                </span>
              </div>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => {
                setPlanValue(entitlement?.plan || 'INACTIVE');
                setTrialEndsAt(entitlement?.trialEndsAt || '');
                setPlanOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-600"
            >
              <Clock className="h-4 w-4" />
              Change Plan
            </button>
            <button
              onClick={() => setAddCreditsOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
            >
              <CreditCard className="h-4 w-4" />
              Add Credits
            </button>
            <button
              onClick={() => setSyncOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
            >
              <RefreshCw className="h-4 w-4" />
              Sync from WP
            </button>
          </div>
        </div>
      </div>

      {/* Change Plan Modal */}
      {planOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-950 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Change Plan</h2>
              <button
                onClick={() => setPlanOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdatePlan} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-300">Entitlement Plan</label>
                <select
                  value={planValue}
                  onChange={(e) => setPlanValue(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                >
                  <option value="INACTIVE">INACTIVE</option>
                  <option value="TRIALING">TRIALING</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="CANCELED">CANCELED</option>
                </select>
                <p className="mt-1 text-xs text-slate-500">
                  This controls Studio access (via /auth/me canAccessStudio).
                </p>
              </div>

              <div>
                <label className="block text-sm text-slate-300">Trial Ends At (optional)</label>
                <input
                  value={trialEndsAt}
                  onChange={(e) => setTrialEndsAt(e.target.value)}
                  placeholder="2026-02-10T20:59:25.977Z"
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-300">Reason</label>
                <input
                  value={planReason}
                  onChange={(e) => setPlanReason(e.target.value)}
                  required
                  minLength={3}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                  placeholder="e.g. manual upgrade"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPlanOpen(false)}
                  className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-slate-200 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingPlan}
                  className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500 disabled:opacity-50"
                >
                  {updatingPlan ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Entitlement Details */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
            <CreditCard className="h-5 w-5 text-sky-400" />
            Credits
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-400">Total</span>
              <span className="font-medium text-white">{entitlement?.aiCreditsTotal ?? 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Used</span>
              <span className="font-medium text-white">{entitlement?.aiCreditsUsed ?? 0}</span>
            </div>
            <div className="flex justify-between border-t border-slate-700 pt-3">
              <span className="text-slate-400">Remaining</span>
              <span className="text-lg font-bold text-emerald-400">
                {entitlement?.aiCreditsRemaining ?? 0}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
            <Clock className="h-5 w-5 text-amber-400" />
            Subscription
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-400">Trial Started</span>
              <span className="text-white">
                {entitlement?.trialStartedAt
                  ? new Date(entitlement.trialStartedAt).toLocaleDateString()
                  : '-'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Trial Ends</span>
              <span className="text-white">
                {entitlement?.trialEndsAt
                  ? new Date(entitlement.trialEndsAt).toLocaleDateString()
                  : '-'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Next Credit Grant</span>
              <span className="text-white">
                {entitlement?.creditsNextGrantAt
                  ? new Date(entitlement.creditsNextGrantAt).toLocaleDateString()
                  : '-'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Last Updated</span>
              <span className="text-white">
                {entitlement?.updatedAt
                  ? new Date(entitlement.updatedAt).toLocaleString()
                  : '-'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Audit Logs */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
          <History className="h-5 w-5 text-slate-400" />
          Admin Audit Log
        </h2>
        {auditLogs.length === 0 ? (
          <p className="text-slate-500">No admin actions recorded</p>
        ) : (
          <div className="space-y-3">
            {auditLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-start justify-between rounded-lg border border-slate-700 bg-slate-800/50 p-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">{log.action}</span>
                    {log.deltaCredits && (
                      <span className="text-emerald-400">+{log.deltaCredits} credits</span>
                    )}
                  </div>
                  {log.reason && <p className="text-sm text-slate-400">{log.reason}</p>}
                  <p className="mt-1 text-xs text-slate-500">
                    by {log.adminUser.email} • {new Date(log.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Credits Modal */}
      {addCreditsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-6">
            <h3 className="mb-4 text-lg font-semibold text-white">Add Credits</h3>
            <form onSubmit={handleAddCredits} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm text-slate-400">Amount</label>
                <input
                  type="number"
                  min="1"
                  max="100000"
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(e.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white focus:border-sky-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-400">Reason (required)</label>
                <input
                  type="text"
                  value={creditReason}
                  onChange={(e) => setCreditReason(e.target.value)}
                  required
                  minLength={3}
                  placeholder="e.g., Customer support compensation"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAddCreditsOpen(false)}
                  className="rounded-lg bg-slate-700 px-4 py-2 text-white hover:bg-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingCredits}
                  className="rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  {addingCredits ? 'Adding...' : 'Add Credits'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sync Modal */}
      {syncOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-6">
            <h3 className="mb-4 text-lg font-semibold text-white">Force Sync from WordPress</h3>
            <p className="mb-4 text-sm text-slate-400">
              This will fetch the latest entitlement data from WordPress and overwrite local data.
            </p>
            <form onSubmit={handleForceSync} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm text-slate-400">Reason (required)</label>
                <input
                  type="text"
                  value={syncReason}
                  onChange={(e) => setSyncReason(e.target.value)}
                  required
                  minLength={3}
                  placeholder="e.g., User reported stale data"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSyncOpen(false)}
                  className="rounded-lg bg-slate-700 px-4 py-2 text-white hover:bg-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={syncing}
                  className="rounded-lg bg-sky-600 px-4 py-2 font-medium text-white hover:bg-sky-500 disabled:opacity-50"
                >
                  {syncing ? 'Syncing...' : 'Sync Now'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
