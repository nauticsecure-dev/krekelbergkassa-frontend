'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { getApiErrorMessage } from '@/lib/api-error';
import { cn } from '@/lib/cn';
import { trackEvent } from '@/lib/track-event';

type ToastTone = 'success' | 'error' | 'info';

interface ToastInput {
  title: string;
  message?: string;
  tone?: ToastTone;
  duration?: number;
}

interface ToastContextValue {
  push: (toast: ToastInput) => void;
  /** Shows API / thrown error text in a toast (react-hot-toast). */
  pushError: (err: unknown, title?: string) => void;
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
        'pointer-events-auto w-full max-w-md rounded-xl border px-4 py-3 shadow-elev backdrop-blur-sm transition-all duration-300',
        toneStyles[tone],
        visible ? 'translate-x-0 opacity-100' : 'translate-x-2 opacity-0'
      )}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold leading-snug">{title}</div>
          {message ? (
            <div className="mt-1 text-xs leading-relaxed opacity-90">{message}</div>
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
  const push = React.useCallback(({ title, message, tone = 'info', duration }: ToastInput) => {
    const resolvedDuration =
      duration ?? (tone === 'error' ? 6500 : tone === 'success' ? 4500 : 4000);

    // Pillar 8: auto-track every success/error toast as a journey event.
    if (tone === 'success') {
      trackEvent('success_toast', { metadata: { title, message } });
    } else if (tone === 'error') {
      trackEvent('error_toast', { metadata: { title, message } });
    }

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
      { duration: resolvedDuration }
    );
  }, []);

  const pushError = React.useCallback(
    (err: unknown, title?: string) => {
      const apiMessage = getApiErrorMessage(err);
      if (title && title !== apiMessage) {
        push({ tone: 'error', title, message: apiMessage });
        return;
      }
      push({ tone: 'error', title: apiMessage });
    },
    [push]
  );

  return (
    <ToastContext.Provider value={{ push, pushError }}>
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

export { getApiErrorMessage };
