'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '../../../lib/api-client';
import Link from 'next/link';

export default function DashboardPage() {
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

  return (
    <div className="space-y-8 py-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-2 text-lg text-slate-400">
          Welcome back, {user?.name || user?.email}
        </p>
      </div>

      {/* Featured: Price Calculator */}
      <div className="rounded-2xl border border-sky-500/30 bg-gradient-to-br from-sky-500/10 via-slate-900/60 to-slate-900/60 p-8 shadow-lg shadow-sky-500/5">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex-1 space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/50 bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-300">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z" />
              </svg>
              Featured Tool
            </div>
            <h2 className="text-2xl font-bold text-slate-100">Price Calculator</h2>
            <p className="text-slate-300">
              Professional laser cutting price calculator with material costs, time estimates, and profit margins. 
              Perfect for quotes, orders, and production planning.
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              <span className="rounded-full bg-slate-800/60 px-3 py-1 text-xs text-slate-300">
                Material Costs
              </span>
              <span className="rounded-full bg-slate-800/60 px-3 py-1 text-xs text-slate-300">
                Time Estimates
              </span>
              <span className="rounded-full bg-slate-800/60 px-3 py-1 text-xs text-slate-300">
                Profit Margins
              </span>
              <span className="rounded-full bg-slate-800/60 px-3 py-1 text-xs text-slate-300">
                Order Management
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <Link
              href="/studio/tools/price-calculator"
              className="inline-flex items-center justify-center rounded-lg bg-sky-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-500/20 transition-all hover:bg-sky-600 hover:shadow-sky-500/30"
            >
              Open Price Calculator →
            </Link>
            <Link
              href="/studio/tools"
              className="inline-flex items-center justify-center rounded-lg border border-slate-700 px-6 py-3 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800"
            >
              Browse All Tools
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <div className="mb-2 text-sm font-medium text-slate-400">Current Plan</div>
          <div className="text-2xl font-bold text-sky-400">
            {user?.plan || 'FREE'}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <div className="mb-2 text-sm font-medium text-slate-400">Account</div>
          <div className="text-sm text-slate-300">{user?.email}</div>
          <div className="mt-1 text-xs text-slate-500">Role: {user?.role || 'USER'}</div>
        </div>

        <Link
          href="/studio/tools"
          className="group rounded-xl border border-slate-800 bg-slate-900/60 p-6 transition-all hover:border-sky-500/50 hover:bg-slate-900"
        >
          <div className="mb-2 text-sm font-medium text-slate-400">All Tools</div>
          <div className="text-lg font-semibold text-sky-400 group-hover:text-sky-300">
            11 Tools Available →
          </div>
        </Link>
      </div>

      {/* Getting Started */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="mb-4 text-lg font-semibold">Getting Started</h2>
        <div className="space-y-3 text-sm text-slate-300">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 h-5 w-5 flex-shrink-0 rounded-full bg-sky-500/20 text-center text-xs leading-5 text-sky-400">
              1
            </div>
            <div>
              <div className="font-medium">Try the Price Calculator</div>
              <div className="text-slate-400">
                Calculate accurate prices for your laser cutting projects
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="mt-0.5 h-5 w-5 flex-shrink-0 rounded-full bg-sky-500/20 text-center text-xs leading-5 text-sky-400">
              2
            </div>
            <div>
              <div className="font-medium">Explore Design Tools</div>
              <div className="text-slate-400">
                BoxMaker, EngravePrep, Panel Splitter, and 8 more professional tools
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="mt-0.5 h-5 w-5 flex-shrink-0 rounded-full bg-sky-500/20 text-center text-xs leading-5 text-sky-400">
              3
            </div>
            <div>
              <div className="font-medium">Upgrade Your Plan</div>
              <div className="text-slate-400">
                Get unlimited exports and access to premium features
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
