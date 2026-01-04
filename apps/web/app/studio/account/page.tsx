'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '../../../lib/api-client';
import Link from 'next/link';

export default function AccountPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      try {
        const res = await apiClient.get('/auth/me');
        setUser(res.data.user);
      } catch (err) {
        console.error('Failed to load user:', err);
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-slate-400">Loading...</div>
      </div>
    );
  }

  const planFeatures = {
    FREE: [
      '3 exports per day per tool',
      'Basic price calculator',
      'Material cost tracking',
    ],
    PRO: [
      'Unlimited exports',
      'Advanced price calculator',
      'Material cost tracking',
      'Priority support',
      'Custom templates',
    ],
    BUSINESS: [
      'Unlimited exports',
      'Advanced price calculator',
      'Material cost tracking',
      'Priority support',
      'Custom templates',
      'Team collaboration',
      'API access',
    ],
  };

  const currentPlan = user?.plan || 'FREE';
  const features = planFeatures[currentPlan as keyof typeof planFeatures] || planFeatures.FREE;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Account</h1>
        <p className="mt-1 text-sm text-slate-400">
          Manage your account settings and subscription
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
            <h2 className="mb-4 text-lg font-semibold">Profile Information</h2>
            <div className="space-y-3 text-sm">
              <div>
                <div className="text-slate-400">Email</div>
                <div className="mt-1 text-slate-200">{user?.email}</div>
              </div>
              <div>
                <div className="text-slate-400">Name</div>
                <div className="mt-1 text-slate-200">{user?.name || 'Not set'}</div>
              </div>
              <div>
                <div className="text-slate-400">Role</div>
                <div className="mt-1 text-slate-200">{user?.role || 'USER'}</div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
            <h2 className="mb-4 text-lg font-semibold">Current Plan</h2>
            <div className="mb-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-sky-500/20 px-4 py-2">
                <div className="h-2 w-2 rounded-full bg-sky-400"></div>
                <span className="text-lg font-semibold text-sky-400">{currentPlan}</span>
              </div>
            </div>
            <div className="space-y-2 text-sm text-slate-300">
              {features.map((feature, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <svg
                    className="mt-0.5 h-4 w-4 flex-shrink-0 text-sky-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span>{feature}</span>
                </div>
              ))}
            </div>
            {currentPlan === 'FREE' && (
              <div className="mt-6">
                <Link
                  href="/pricing"
                  className="block rounded-lg bg-sky-500 px-4 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-sky-600"
                >
                  Upgrade to PRO
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
            <h2 className="mb-4 text-lg font-semibold">Usage Limits</h2>
            <div className="space-y-4 text-sm">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-slate-400">Daily Exports</span>
                  <span className="text-slate-200">
                    {currentPlan === 'FREE' ? '3 per day' : 'Unlimited'}
                  </span>
                </div>
                {currentPlan === 'FREE' && (
                  <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                    <div className="h-full w-0 bg-sky-500"></div>
                  </div>
                )}
              </div>
              <div className="rounded-lg bg-slate-800/50 p-4">
                <div className="text-xs text-slate-400">
                  {currentPlan === 'FREE' ? (
                    <>
                      You are currently on the FREE plan. Upgrade to PRO for unlimited exports and
                      access to premium features.
                    </>
                  ) : (
                    <>
                      You have unlimited access to all tools and features. Thank you for being a{' '}
                      {currentPlan} member!
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
            <h2 className="mb-4 text-lg font-semibold">Quick Links</h2>
            <div className="space-y-2 text-sm">
              <Link
                href="/studio/tools"
                className="block rounded-lg border border-slate-700 px-4 py-2 text-slate-300 transition-colors hover:border-sky-500/50 hover:bg-slate-800"
              >
                Browse Tools →
              </Link>
              <Link
                href="/pricing"
                className="block rounded-lg border border-slate-700 px-4 py-2 text-slate-300 transition-colors hover:border-sky-500/50 hover:bg-slate-800"
              >
                View Pricing Plans →
              </Link>
              <Link
                href="/"
                className="block rounded-lg border border-slate-700 px-4 py-2 text-slate-300 transition-colors hover:border-sky-500/50 hover:bg-slate-800"
              >
                Back to Main App →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
