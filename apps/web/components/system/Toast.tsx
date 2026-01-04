'use client';

/**
 * Lightweight Toast Notification System
 * Standardized success/error toasts with optional actions
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle, AlertCircle, Info, X, Loader2 } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export type ToastType = 'success' | 'error' | 'info' | 'loading';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
  action?: ToastAction;
}

interface ToastContextValue {
  toasts: Toast[];
  showToast: (toast: Omit<Toast, 'id'>) => string;
  dismissToast: (id: string) => void;
  success: (message: string, action?: ToastAction) => string;
  error: (message: string, action?: ToastAction) => string;
  info: (message: string, action?: ToastAction) => string;
  loading: (message: string) => string;
}

// ============================================================================
// Context
// ============================================================================

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

// ============================================================================
// Provider
// ============================================================================

interface ToastProviderProps {
  children: React.ReactNode;
  maxToasts?: number;
}

export function ToastProvider({ children, maxToasts = 5 }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((toast: Omit<Toast, 'id'>): string => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const newToast: Toast = { ...toast, id };

    setToasts(prev => {
      const updated = [...prev, newToast];
      // Limit number of toasts
      if (updated.length > maxToasts) {
        return updated.slice(-maxToasts);
      }
      return updated;
    });

    // Auto-dismiss (except for loading toasts)
    if (toast.type !== 'loading') {
      const duration = toast.duration ?? (toast.type === 'error' ? 5000 : 3000);
      setTimeout(() => dismissToast(id), duration);
    }

    return id;
  }, [maxToasts, dismissToast]);

  const success = useCallback((message: string, action?: ToastAction) => {
    return showToast({ type: 'success', message, action });
  }, [showToast]);

  const error = useCallback((message: string, action?: ToastAction) => {
    return showToast({ type: 'error', message, action, duration: 5000 });
  }, [showToast]);

  const info = useCallback((message: string, action?: ToastAction) => {
    return showToast({ type: 'info', message, action });
  }, [showToast]);

  const loading = useCallback((message: string) => {
    return showToast({ type: 'loading', message });
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ toasts, showToast, dismissToast, success, error, info, loading }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

// ============================================================================
// Toast Container
// ============================================================================

interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onDismiss={() => onDismiss(toast.id)} />
      ))}
    </div>
  );
}

// ============================================================================
// Toast Item
// ============================================================================

interface ToastItemProps {
  toast: Toast;
  onDismiss: () => void;
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const [isExiting, setIsExiting] = useState(false);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(onDismiss, 200);
  };

  const icons = {
    success: <CheckCircle className="h-5 w-5 text-emerald-400" />,
    error: <AlertCircle className="h-5 w-5 text-red-400" />,
    info: <Info className="h-5 w-5 text-sky-400" />,
    loading: <Loader2 className="h-5 w-5 text-sky-400 animate-spin" />,
  };

  const bgColors = {
    success: 'bg-emerald-950/90 border-emerald-800/50',
    error: 'bg-red-950/90 border-red-800/50',
    info: 'bg-slate-900/90 border-slate-700/50',
    loading: 'bg-slate-900/90 border-slate-700/50',
  };

  return (
    <div
      className={`
        pointer-events-auto flex items-center gap-3 rounded-lg border px-4 py-3 shadow-xl backdrop-blur-sm
        transform transition-all duration-200
        ${bgColors[toast.type]}
        ${isExiting ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'}
      `}
      style={{ minWidth: '280px', maxWidth: '400px' }}
    >
      {icons[toast.type]}
      
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-100 truncate">{toast.message}</p>
      </div>

      {toast.action && (
        <button
          onClick={toast.action.onClick}
          className="flex-shrink-0 text-xs font-medium text-sky-400 hover:text-sky-300 transition-colors"
        >
          {toast.action.label}
        </button>
      )}

      {toast.type !== 'loading' && (
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 p-1 text-slate-500 hover:text-slate-300 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

// ============================================================================
// Standalone Toast Function (for use outside React tree)
// ============================================================================

let toastInstance: ToastContextValue | null = null;

export function setToastInstance(instance: ToastContextValue) {
  toastInstance = instance;
}

export function toast(message: string, type: ToastType = 'info', action?: ToastAction): void {
  if (toastInstance) {
    toastInstance.showToast({ type, message, action });
  } else {
    // Fallback: create DOM toast
    showDOMToast(message, type);
  }
}

function showDOMToast(message: string, type: ToastType): void {
  if (typeof window === 'undefined') return;

  const bgColor = type === 'success' ? 'bg-emerald-600' : type === 'error' ? 'bg-red-600' : 'bg-slate-700';
  
  const div = document.createElement('div');
  div.className = `fixed bottom-4 right-4 z-[100] rounded-lg ${bgColor} px-4 py-3 text-sm font-medium text-white shadow-lg transition-opacity duration-300`;
  div.textContent = message;
  document.body.appendChild(div);

  setTimeout(() => {
    div.style.opacity = '0';
    setTimeout(() => div.remove(), 300);
  }, 3000);
}
