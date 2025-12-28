import { useMemo } from 'react';
import type { Plan } from '../tools/types';

export function usePlan() {
  // Enable Pro access for all features
  const plan = 'pro' as Plan;

  const canUse = useMemo(() => {
    return (feature?: string) => {
      if (!feature) return true;
      if (plan === 'pro') return true;
      return false;
    };
  }, [plan]);

  return { plan, canUse };
}
