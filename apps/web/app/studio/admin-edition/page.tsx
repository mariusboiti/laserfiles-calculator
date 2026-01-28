'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, AlertCircle, Gift, Sparkles, LogIn, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/components/system';
import { refreshEntitlements } from '@/lib/entitlements/client';

function AdminEditionContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [loadingUser, setLoadingUser] = useState(true);
  const [user, setUser] = useState<any>(null);

  const [checking, setChecking] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const [inviteInfo, setInviteInfo] = useState<{
    valid: boolean;
    email?: string;
    creditsGrant?: number;
    durationDays?: number;
    status?: string;
    expiresAt?: string;
    error?: string;
  } | null>(null);
  const [redeemResult, setRedeemResult] = useState<{
    success: boolean;
    message: string;
    proAccessUntil: string;
    creditsAdded: number;
  } | null>(null);

  // Check invite when token is present and user is logged in
  useEffect(() => {
    if (!token) return;
    if (loadingUser) return;
    if (!user) return;

    const checkInvite = async () => {
      setChecking(true);
      try {
        const res = await apiClient.get('/invites/check', {
          params: { token },
          withCredentials: true,
        });
        setInviteInfo(res.data);
      } catch (error) {
        setInviteInfo({ valid: false, error: 'Failed to check invite' });
      } finally {
        setChecking(false);
      }
    };

    checkInvite();
  }, [token, user, loadingUser]);

  // Load current user (StudioLayout also does this, but this page needs user email)
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoadingUser(true);
        const res = await apiClient.get('/auth/me', { withCredentials: true });
        if (cancelled) return;
        setUser(res.data?.user ?? null);
      } catch {
        if (cancelled) return;
        setUser(null);
      } finally {
        if (cancelled) return;
        setLoadingUser(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleRedeem = async () => {
    if (!token) return;

    setRedeeming(true);
    try {
      const res = await apiClient.post(
        '/invites/redeem',
        { token },
        { withCredentials: true },
      );

      setRedeemResult(res.data);
      toast('Admin Edition activated!', 'success');
      refreshEntitlements();
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || 'Failed to redeem invite';
      toast(msg, 'error');
      setInviteInfo({ valid: false, error: msg });
    } finally {
      setRedeeming(false);
    }
  };

  // No token provided
  if (!token) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full rounded-xl border border-slate-800 bg-slate-900/60 p-6 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-yellow-400" />
          <h1 className="mt-4 text-xl font-semibold text-slate-100">Missing Invite Token</h1>
          <p className="mt-2 text-sm text-slate-400">
            This page requires a valid invite link. Please use the link provided to you.
          </p>
          <div className="mt-5">
            <Link
              href="/studio/dashboard"
              className="inline-flex items-center justify-center rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
            >
              Go to Studio
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Not logged in
  if (!loadingUser && !user) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full rounded-xl border border-slate-800 bg-slate-900/60 p-6 text-center">
          <Gift className="mx-auto h-10 w-10 text-sky-400" />
          <h1 className="mt-4 text-xl font-semibold text-slate-100">Admin Edition Invite</h1>
          <p className="mt-2 text-sm text-slate-400">
            You've been invited to receive free PRO access! Please log in to redeem your invite.
          </p>

          <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/40 p-4 text-left text-sm">
            <p className="font-medium text-slate-200">What you'll get:</p>
            <ul className="mt-2 space-y-1 text-slate-400">
              <li>1 month of PRO access</li>
              <li>200 AI credits</li>
              <li>Admin Edition badge</li>
            </ul>
          </div>

          <div className="mt-5">
            <Link
              href={`/login?returnUrl=${encodeURIComponent(`/studio/admin-edition?token=${token}`)}`}
              className="inline-flex w-full items-center justify-center rounded-md bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600"
            >
              <LogIn className="mr-2 h-4 w-4" />
              Log in to Redeem
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Loading auth
  if (loadingUser || checking) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full rounded-xl border border-slate-800 bg-slate-900/60 p-6 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-sky-400" />
          <p className="mt-4 text-sm text-slate-400">Checking your invite...</p>
        </div>
      </div>
    );
  }

  // Redeemed successfully
  if (redeemResult?.success) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full rounded-xl border border-emerald-700/40 bg-emerald-900/20 p-6 text-center">
          <CheckCircle className="mx-auto h-12 w-12 text-emerald-400" />
          <h1 className="mt-4 text-xl font-semibold text-emerald-200">Admin Edition Activated!</h1>
          <p className="mt-2 text-sm text-emerald-200/80">Welcome to LaserFilesPro Admin Edition</p>

          <div className="mt-5 rounded-lg border border-emerald-700/30 bg-slate-950/40 p-4 text-sm text-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">PRO Access Until</span>
              <span className="font-medium">
                {new Date(redeemResult.proAccessUntil).toLocaleDateString()}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-slate-400">AI Credits Added</span>
              <span className="font-medium">{redeemResult.creditsAdded}</span>
            </div>
          </div>

          <div className="mt-5">
            <Link
              href="/studio/dashboard"
              className="inline-flex w-full items-center justify-center rounded-md bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Start Using Studio
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Invalid invite
  if (inviteInfo && !inviteInfo.valid) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full rounded-xl border border-red-800/40 bg-red-900/20 p-6 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-red-400" />
          <h1 className="mt-4 text-xl font-semibold text-slate-100">Invalid Invite</h1>
          <p className="mt-2 text-sm text-slate-400">{inviteInfo.error || 'This invite is no longer valid.'}</p>
          <div className="mt-5">
            <Link
              href="/studio/dashboard"
              className="inline-flex items-center justify-center rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
            >
              Go to Studio
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Email mismatch
  if (inviteInfo?.valid && inviteInfo.email && user?.email?.toLowerCase() !== inviteInfo.email.toLowerCase()) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full rounded-xl border border-yellow-800/40 bg-yellow-900/20 p-6 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-yellow-400" />
          <h1 className="mt-4 text-xl font-semibold text-slate-100">Email Mismatch</h1>
          <p className="mt-2 text-sm text-slate-400">
            This invite was created for <strong>{inviteInfo.email}</strong>, but you're logged in as <strong>{user?.email}</strong>.
          </p>
          <p className="mt-3 text-sm text-slate-400">Please log in with the correct email to redeem this invite.</p>
          <div className="mt-5">
            <Link
              href={`/login?returnUrl=${encodeURIComponent(`/studio/admin-edition?token=${token}`)}`}
              className="inline-flex w-full items-center justify-center rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
            >
              Log in with Different Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Valid invite - show redeem form
  if (inviteInfo?.valid) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full rounded-xl border border-slate-800 bg-slate-900/60 p-6 text-center">
          <Gift className="mx-auto h-12 w-12 text-sky-400" />
          <h1 className="mt-4 text-xl font-semibold text-slate-100">Admin Edition Invite</h1>
          <p className="mt-2 text-sm text-slate-400">You're about to receive free PRO access!</p>

          <div className="mt-5 rounded-lg border border-slate-800 bg-slate-950/40 p-4 text-left text-sm text-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Account</span>
              <span className="font-medium">{user?.email}</span>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-slate-400">PRO Duration</span>
              <span className="font-medium">{inviteInfo.durationDays} days</span>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-slate-400">AI Credits</span>
              <span className="font-medium">{inviteInfo.creditsGrant}</span>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-slate-400">Invite Expires</span>
              <span className="font-medium">
                {inviteInfo.expiresAt ? new Date(inviteInfo.expiresAt).toLocaleDateString() : '-'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRedeem}
            disabled={redeeming}
            className="mt-5 inline-flex w-full items-center justify-center rounded-md bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600 disabled:opacity-50"
          >
            {redeeming ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Activating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Activate Admin Edition
              </>
            )}
          </button>

          <p className="mt-3 text-xs text-slate-500">By redeeming, you agree to our Terms of Service</p>
        </div>
      </div>
    );
  }

  // Fallback loading
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
    </div>
  );
}

export default function AdminEditionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <Loader2 className="h-8 w-8 animate-spin text-sky-400" />
      </div>
    }>
      <AdminEditionContent />
    </Suspense>
  );
}
