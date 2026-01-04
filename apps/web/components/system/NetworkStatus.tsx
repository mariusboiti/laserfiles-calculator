'use client';

/**
 * Network Status Detection & Banner
 * Shows offline/online status to users
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { WifiOff, X } from 'lucide-react';

// ============================================================================
// Network Context
// ============================================================================

interface NetworkContextValue {
  isOnline: boolean;
  isServerReachable: boolean;
  checkServer: () => Promise<boolean>;
}

const NetworkContext = createContext<NetworkContextValue>({
  isOnline: true,
  isServerReachable: true,
  checkServer: async () => true,
});

export function useNetwork(): NetworkContextValue {
  return useContext(NetworkContext);
}

// ============================================================================
// Provider
// ============================================================================

interface NetworkProviderProps {
  children: React.ReactNode;
  healthEndpoint?: string;
}

export function NetworkProvider({ 
  children, 
  healthEndpoint = '/api/health' 
}: NetworkProviderProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [isServerReachable, setIsServerReachable] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  // Browser online/offline detection
  useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      setDismissed(false);
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      setDismissed(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Server reachability check
  const checkServer = useCallback(async (): Promise<boolean> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(healthEndpoint, {
        method: 'HEAD',
        signal: controller.signal,
        cache: 'no-store',
      });

      clearTimeout(timeoutId);
      const reachable = response.ok;
      setIsServerReachable(reachable);
      return reachable;
    } catch {
      setIsServerReachable(false);
      return false;
    }
  }, [healthEndpoint]);

  // Periodic server check when online but server was unreachable
  useEffect(() => {
    if (!isOnline || isServerReachable) return;

    const interval = setInterval(checkServer, 10000);
    return () => clearInterval(interval);
  }, [isOnline, isServerReachable, checkServer]);

  const showBanner = (!isOnline || !isServerReachable) && !dismissed;

  return (
    <NetworkContext.Provider value={{ isOnline, isServerReachable, checkServer }}>
      {showBanner && (
        <OfflineBanner 
          isOnline={isOnline} 
          isServerReachable={isServerReachable}
          onDismiss={() => setDismissed(true)}
          onRetry={checkServer}
        />
      )}
      {children}
    </NetworkContext.Provider>
  );
}

// ============================================================================
// Offline Banner
// ============================================================================

interface OfflineBannerProps {
  isOnline: boolean;
  isServerReachable: boolean;
  onDismiss: () => void;
  onRetry: () => void;
}

function OfflineBanner({ isOnline, isServerReachable, onDismiss, onRetry }: OfflineBannerProps) {
  const message = !isOnline
    ? "You're offline. Some features may not work."
    : "Server is not responding. Please retry.";

  return (
    <div className="fixed top-0 left-0 right-0 z-[200] bg-amber-600 px-4 py-2">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <WifiOff className="h-4 w-4 text-amber-100" />
          <span className="text-sm font-medium text-amber-50">{message}</span>
        </div>
        
        <div className="flex items-center gap-2">
          {isOnline && !isServerReachable && (
            <button
              onClick={onRetry}
              className="rounded-md bg-amber-700 px-3 py-1 text-xs font-medium text-amber-100 hover:bg-amber-800 transition-colors"
            >
              Retry
            </button>
          )}
          <button
            onClick={onDismiss}
            className="p-1 text-amber-200 hover:text-white transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Hook for checking network before actions
// ============================================================================

export function useNetworkCheck() {
  const { isOnline, isServerReachable, checkServer } = useNetwork();

  const ensureConnected = useCallback(async (): Promise<{ ok: boolean; error?: string }> => {
    if (!isOnline) {
      return { ok: false, error: "You're offline. Please check your internet connection." };
    }

    if (!isServerReachable) {
      const reachable = await checkServer();
      if (!reachable) {
        return { ok: false, error: "Server is not responding. Please try again later." };
      }
    }

    return { ok: true };
  }, [isOnline, isServerReachable, checkServer]);

  return { isOnline, isServerReachable, ensureConnected };
}
