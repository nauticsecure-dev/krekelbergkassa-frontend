'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { cn } from '@/lib/cn';

type ToastTone = 'success' | 'error' | 'info';

interface ToastInput {
  title: string;
  message?: string;
  tone?: ToastTone;
}

interface ToastContextValue {
  push: (toast: ToastInput) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

const toneStyles: Record<ToastTone, string> = {
  success: 'border-emerald-200/80 bg-emerald-50 text-emerald-900',
  error: 'border-rose-200/80 bg-rose-50 text-rose-900',
  info: 'border-navy-100/80 bg-white text-navy-900',
};

function KrekelbergToast({
  visible,
  title,
  message,
  tone,
  onDismiss,
}: {
  visible: boolean;
  title: string;
  message?: string;
  tone: ToastTone;
  onDismiss: () => void;
}) {
  return (
    <div
      className={cn(
        'pointer-events-auto w-full max-w-sm rounded-xl border px-4 py-3 shadow-elev backdrop-blur-sm transition-all duration-300',
        toneStyles[tone],
        visible ? 'translate-x-0 opacity-100' : 'translate-x-2 opacity-0'
      )}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold leading-snug">{title}</div>
          {message ? (
            <div className="mt-0.5 text-xs leading-relaxed opacity-90">{message}</div>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded-md p-1 transition hover:bg-black/5"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const push = React.useCallback(({ title, message, tone = 'info' }: ToastInput) => {
    toast.custom(
      (t) => (
        <KrekelbergToast
          visible={t.visible}
          title={title}
          message={message}
          tone={tone}
          onDismiss={() => toast.dismiss(t.id)}
        />
      ),
      { duration: 4500 }
    );
  }, []);

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <Toaster
        position="top-right"
        gutter={10}
        containerClassName="!top-5 !right-5 !z-[9999]"
        toastOptions={{
          className: '!bg-transparent !p-0 !shadow-none',
          style: { background: 'transparent', boxShadow: 'none', padding: 0 },
        }}
      />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}
