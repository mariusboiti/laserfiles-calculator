'use client';

import { useEntitlement } from '@/lib/entitlements/client';
import { Shield, Star, Clock } from 'lucide-react';

export function CommunityBadge() {
  const { entitlement } = useEntitlement();

  const badge = (entitlement as any)?.communityBadge as 'NONE' | 'ADMIN_EDITION' | 'COMMUNITY_PARTNER' | undefined;
  const expiresAt = (entitlement as any)?.communityBadgeExpiresAt as string | null | undefined;

  if (!badge || badge === 'NONE') return null;

  // Check if badge is still active
  if (expiresAt) {
    const expiryDate = new Date(expiresAt);
    if (expiryDate < new Date()) return null;
  }

  const getBadgeConfig = () => {
    switch (badge) {
      case 'ADMIN_EDITION':
        return {
          label: 'Admin Edition',
          icon: Shield,
          className: 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white border-0',
          description: 'PRO access granted via Admin Edition invite',
        };
      case 'COMMUNITY_PARTNER':
        return {
          label: 'Community Partner',
          icon: Star,
          className: 'bg-gradient-to-r from-amber-500 to-orange-600 text-white border-0',
          description: 'PRO access as a Community Partner',
        };
      default:
        return null;
    }
  };

  const config = getBadgeConfig();
  if (!config) return null;

  const Icon = config.icon;

  // Calculate days remaining
  let daysRemaining: number | null = null;
  if (expiresAt) {
    const msLeft = new Date(expiresAt).getTime() - Date.now();
    daysRemaining = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));
  }

  const titleParts: string[] = [config.description];
  if (daysRemaining !== null) {
    titleParts.push(
      daysRemaining === 0
        ? 'Expires today'
        : daysRemaining === 1
          ? '1 day remaining'
          : `${daysRemaining} days remaining`,
    );
  }
  if (expiresAt) {
    titleParts.push(`Valid until ${new Date(expiresAt).toLocaleDateString()}`);
  }

  return (
    <span
      title={titleParts.join(' · ')}
      className={`${config.className} inline-flex cursor-help items-center gap-1 rounded-full px-2 py-1`}
    >
      <Icon className="h-3 w-3" />
      <span className="text-xs font-medium">{config.label}</span>
      {daysRemaining !== null && (
        <span className="ml-1 inline-flex items-center gap-1 text-[10px] opacity-90">
          <Clock className="h-3 w-3" />
          {daysRemaining === 0 ? 'today' : `${daysRemaining}d`}
        </span>
      )}
    </span>
  );
}
