'use client';

import * as React from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export type InstallPlatform = 'android-chrome' | 'desktop' | 'ios-safari' | 'unsupported';

export function usePwaInstall() {
  const [deferred, setDeferred] = React.useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = React.useState(false);
  const [platform, setPlatform] = React.useState<InstallPlatform>('unsupported');

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const ua = window.navigator.userAgent;
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      // iOS Safari
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

    setInstalled(isStandalone);

    if (/iPad|iPhone|iPod/.test(ua) && !/CriOS|FxiOS/.test(ua)) {
      setPlatform('ios-safari');
    } else if (/Android/.test(ua)) {
      setPlatform('android-chrome');
    } else {
      setPlatform('desktop');
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };

    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const promptInstall = React.useCallback(async () => {
    if (!deferred) return 'unavailable' as const;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    setDeferred(null);
    return choice.outcome; // 'accepted' | 'dismissed'
  }, [deferred]);

  return {
    canInstall: !!deferred,
    installed,
    platform,
    promptInstall,
  };
}
