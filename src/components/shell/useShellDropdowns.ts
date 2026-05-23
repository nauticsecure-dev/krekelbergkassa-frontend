'use client';

import * as React from 'react';

/** Closes dropdowns when clicking outside; keeps panels open when interacting inside. */
export function useShellDropdowns() {
  const [bellOpen, setBellOpen] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);

  React.useEffect(() => {
    if (!bellOpen && !menuOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Element && target.closest('[data-shell-dropdown]')) {
        return;
      }
      setBellOpen(false);
      setMenuOpen(false);
    };

    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [bellOpen, menuOpen]);

  const toggleBell = React.useCallback(() => {
    setBellOpen((open) => !open);
    setMenuOpen(false);
  }, []);

  const toggleMenu = React.useCallback(() => {
    setMenuOpen((open) => !open);
    setBellOpen(false);
  }, []);

  const closeAll = React.useCallback(() => {
    setBellOpen(false);
    setMenuOpen(false);
  }, []);

  return { bellOpen, menuOpen, toggleBell, toggleMenu, closeAll };
}
