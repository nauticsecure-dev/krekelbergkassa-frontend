'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

type ToastTone = 'success' | 'error' | 'info';

interface ToastItem {
  id: string;
  title: string;
  message?: string;
  tone: ToastTone;
}

interface ToastContextValue {
  push: (toast: Omit<ToastItem, 'id'>) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

function id() {
  return Math.random().toString(36).slice(2, 10);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const push = React.useCallback((toast: Omit<ToastItem, 'id'>) => {
    const t = { ...toast, id: id() };
    setToasts((prev) => [...prev, t]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== t.id));
    }, 4500);
  }, []);

  const remove = React.useCallback((toastId: string) => {
    setToasts((prev) => prev.filter((x) => x.id !== toastId));
  }, []);

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-[120] flex justify-center px-4">
        <div className="flex w-full max-w-xl flex-col gap-2">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={cn(
                'pointer-events-auto rounded-xl border px-4 py-3 shadow-elev',
                toast.tone === 'success' && 'border-emerald-200 bg-emerald-50 text-emerald-800',
                toast.tone === 'error' && 'border-rose-200 bg-rose-50 text-rose-800',
                toast.tone === 'info' && 'border-navy-200 bg-white text-navy-800'
              )}
            >
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">{toast.title}</div>
                  {toast.message ? <div className="mt-0.5 text-xs opacity-90">{toast.message}</div> : null}
                </div>
                <button
                  onClick={() => remove(toast.id)}
                  className="rounded-md p-1 hover:bg-black/5"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}
