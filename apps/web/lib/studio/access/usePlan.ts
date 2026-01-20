import { useMemo } from 'react';
import type { Plan } from '../tools/types';
import { useEntitlement, canUseAi } from '@/lib/entitlements/client';

export function usePlan() {
  const { entitlement, loading, error, refetch } = useEntitlement();
  const plan =
    entitlement && (entitlement.plan === 'ACTIVE' || entitlement.plan === 'TRIALING')
      ? ('pro' as Plan)
      : ('free' as Plan);

  const aiAllowed = canUseAi(entitlement);

  const canUseStudio = useMemo(() => {
    if (!entitlement) return false;
    if (typeof entitlement.canUseStudio === 'boolean') return entitlement.canUseStudio;
    return entitlement.plan === 'ACTIVE' || entitlement.plan === 'TRIALING';
  }, [entitlement]);

  const canUse = useMemo(() => {
    return (feature?: string) => {
      if (!feature) return true;
      if (plan === 'pro') return true;
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
