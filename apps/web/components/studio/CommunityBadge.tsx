'use client';

import { useAuth } from '@/lib/auth/AuthContext';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Shield, Star, Clock } from 'lucide-react';

export function CommunityBadge() {
  const { entitlements } = useAuth();

  if (!entitlements) return null;

  const badge = entitlements.communityBadge;
  const expiresAt = entitlements.communityBadgeExpiresAt;

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

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge className={`${config.className} cursor-help gap-1 px-2 py-1`}>
            <Icon className="h-3 w-3" />
            <span className="text-xs font-medium">{config.label}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-medium">{config.description}</p>
            {daysRemaining !== null && (
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {daysRemaining === 0
                  ? 'Expires today'
                  : daysRemaining === 1
                    ? '1 day remaining'
                    : `${daysRemaining} days remaining`}
              </p>
            )}
            {expiresAt && (
              <p className="text-xs text-muted-foreground">
                Valid until {new Date(expiresAt).toLocaleDateString()}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
