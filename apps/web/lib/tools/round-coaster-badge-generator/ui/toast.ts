'use client';

export type ToastKind = 'info' | 'warning' | 'error' | 'success';

export function showToast(message: string, kind: ToastKind = 'info'): void {
  if (typeof window === 'undefined') return;

  const colors: Record<ToastKind, string> = {
    info: 'bg-slate-800',
    success: 'bg-emerald-600',
    warning: 'bg-amber-600',
    error: 'bg-red-600',
  };

  const toast = document.createElement('div');
  toast.className = `fixed bottom-4 right-4 z-50 rounded-lg ${colors[kind]} px-4 py-3 text-sm font-medium text-white shadow-lg`;
  toast.textContent = message;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
