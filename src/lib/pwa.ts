'use client';

import * as React from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export type InstallPlatform = 'android-chrome' | 'desktop' | 'ios-safari' | 'unsupported';

const DISMISS_KEY = 'krek_pwa_dismissed_at';
const DISMISS_DAYS = 14;

// Module-level singleton. `beforeinstallprompt` fires once, very early — often
// before any component mounts — and Chromium only lets it be used once. Capture
// it at module load so the prompt isn't lost, and notify subscribed hooks so
// they re-render when it arrives or is consumed.
let sharedPrompt: BeforeInstallPromptEvent | null = null;
let installedFlag = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    sharedPrompt = e as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    sharedPrompt = null;
    installedFlag = true;
    notify();
  });
}

function dismissedRecently(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = window.localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const at = Number(raw);
    if (!Number.isFinite(at)) return false;
    return Date.now() - at < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function usePwaInstall() {
  const [, forceRender] = React.useReducer((x) => x + 1, 0);
  const [installed, setInstalled] = React.useState(false);
  const [platform, setPlatform] = React.useState<InstallPlatform>('unsupported');
  const [dismissed, setDismissed] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const ua = window.navigator.userAgent;
    if (/iPad|iPhone|iPod/.test(ua) && !/CriOS|FxiOS/.test(ua)) {
      setPlatform('ios-safari');
    } else if (/Android/.test(ua)) {
      setPlatform('android-chrome');
    } else {
      setPlatform('desktop');
    }

    setInstalled(isStandalone() || installedFlag);
    setDismissed(dismissedRecently());

    // Re-render this hook whenever the shared prompt is captured/consumed or the
    // app is installed (covers the case where the event fired before mount).
    const sub = () => {
      setInstalled(isStandalone() || installedFlag);
      forceRender();
    };
    listeners.add(sub);

    const mq = window.matchMedia('(display-mode: standalone)');
    const onMode = () => setInstalled(isStandalone() || installedFlag);
    if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onMode);
    else mq.addListener(onMode);

    return () => {
      listeners.delete(sub);
      if (typeof mq.removeEventListener === 'function') mq.removeEventListener('change', onMode);
      else mq.removeListener(onMode);
    };
  }, []);

  const promptInstall = React.useCallback(async () => {
    if (!sharedPrompt) return 'unavailable' as const;
    await sharedPrompt.prompt();
    const choice = await sharedPrompt.userChoice;
    sharedPrompt = null;
    notify();
    return choice.outcome; // 'accepted' | 'dismissed'
  }, []);

  const dismiss = React.useCallback(() => {
    try {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
    setDismissed(true);
  }, []);

  const canInstall = !!sharedPrompt;

  // Show the install entry point only when installing is actually possible:
  // a captured prompt (Chrome/Edge desktop + Android), or iOS Safari which
  // only supports the manual "Add to Home Screen" flow. Never when already
  // installed, on unsupported browsers, or right after the user dismissed it.
  const canShowInstall =
    !installed && !dismissed && (canInstall || platform === 'ios-safari');

  return {
    canInstall,
    canShowInstall,
    installed,
    dismissed,
    platform,
    promptInstall,
    dismiss,
  };
}
