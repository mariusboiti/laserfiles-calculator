import { useMemo } from 'react';
import type { Plan } from '../tools/types';
import { useEntitlement, canUseAi } from '@/lib/entitlements/client';
import { getStudioToolMetaBySlug } from '../tools/meta';

export function usePlan() {
  const { entitlement, loading, error, refetch } = useEntitlement();
  const plan =
    entitlement && (entitlement.plan === 'ACTIVE' || entitlement.plan === 'TRIAL')
      ? ('pro' as Plan)
      : ('free' as Plan);

  const aiAllowed = canUseAi(entitlement);

  // After trial expires, tools stay open but export is blocked (unless tool is free)
  const canUseStudio = useMemo(() => {
    // Always allow studio access - tools stay open even after trial
    // Export will be blocked separately for non-free tools
    return true;
  }, []);

  const canUse = useMemo(() => {
    return (feature?: string, toolSlug?: string) => {
      if (!feature) return true;
      if (plan === 'pro') return true;
      
      // Check if tool is free - free tools allow all features including export
      if (toolSlug) {
        const toolMeta = getStudioToolMetaBySlug(toolSlug);
        if (toolMeta?.isFree) return true;
      }
      
      return false;
    };
  }, [plan]);

  return {
    plan,
    canUse,
    entitlement,
    aiAllowed,
    canUseStudio,
    entitlementLoading: loading,
    entitlementError: error,
    refetchEntitlement: refetch,
  };
}
