'use client';

/**
 * AI Credits Badge Component
 * Shows AI credits remaining and trial status in the header
 */

import { useState } from 'react';
import { Sparkles, AlertTriangle, Clock } from 'lucide-react';
import { useEntitlement, startTrial, canUseAi } from '@/lib/entitlements/client';

export function AiCreditsBadge() {
  const { entitlement, loading } = useEntitlement();
  const [starting, setStarting] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-900/80 px-2.5 py-1 text-xs text-slate-400">
        <Sparkles className="h-3.5 w-3.5 animate-pulse" />
        <span>Loading...</span>
      </div>
    );
  }

  if (!entitlement) {
    return null;
  }

  const hasCredits = canUseAi(entitlement);
  const { plan, aiCreditsRemaining, aiCreditsTotal, daysLeftInTrial } = entitlement;

  // No entitlement - show start trial CTA
  if (plan === 'NONE') {
    const handleStartTrial = async () => {
      setStarting(true);
      const result = await startTrial();
      if (!result.success) {
        console.error('Failed to start trial:', result.error);
      }
      setStarting(false);
    };

    return (
      <button
        onClick={handleStartTrial}
        disabled={starting}
        className="flex items-center gap-1.5 rounded-full border border-amber-600/50 bg-amber-900/30 px-2.5 py-1 text-xs text-amber-300 hover:bg-amber-900/50 transition-colors disabled:opacity-50"
      >
        <Sparkles className="h-3.5 w-3.5" />
        <span>{starting ? 'Starting...' : 'Start Free Trial'}</span>
      </button>
    );
  }

  // Expired or inactive
  if (plan === 'EXPIRED' || plan === 'INACTIVE') {
    return (
      <div className="flex items-center gap-1.5 rounded-full border border-red-600/50 bg-red-900/30 px-2.5 py-1 text-xs text-red-300">
        <AlertTriangle className="h-3.5 w-3.5" />
        <span>{plan === 'EXPIRED' ? 'Trial Expired' : 'Subscription Inactive'}</span>
      </div>
    );
  }

  // Active or trialing with credits info
  const creditPercent = aiCreditsTotal > 0 ? (aiCreditsRemaining / aiCreditsTotal) * 100 : 0;
  const isLow = creditPercent < 20;
  
  return (
    <div className="flex items-center gap-2">
      {/* Trial days indicator */}
      {plan === 'TRIALING' && daysLeftInTrial !== null && (
        <div className="flex items-center gap-1 rounded-full border border-sky-600/50 bg-sky-900/30 px-2 py-1 text-xs text-sky-300">
          <Clock className="h-3 w-3" />
          <span>{daysLeftInTrial}d left</span>
        </div>
      )}
      
      {/* Credits badge */}
      <div
        className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${
          isLow
            ? 'border-amber-600/50 bg-amber-900/30 text-amber-300'
            : hasCredits
            ? 'border-emerald-600/50 bg-emerald-900/30 text-emerald-300'
            : 'border-red-600/50 bg-red-900/30 text-red-300'
        }`}
      >
        <Sparkles className="h-3.5 w-3.5" />
        <span>
          {aiCreditsRemaining}/{aiCreditsTotal} AI
        </span>
      </div>
    </div>
  );
}
