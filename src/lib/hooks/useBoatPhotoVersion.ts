'use client';

import * as React from 'react';
import { BOAT_PHOTO_CHANGED } from '@/lib/portal-events';

export function useBoatPhotoVersion() {
  const [version, setVersion] = React.useState(0);
  React.useEffect(() => {
    const update = () => setVersion(value => value + 1);
    const onStorage = (event: StorageEvent) => { if (event.key === BOAT_PHOTO_CHANGED) update(); };
    window.addEventListener(BOAT_PHOTO_CHANGED, update);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(BOAT_PHOTO_CHANGED, update);
      window.removeEventListener('storage', onStorage);
    };
  }, []);
  return version;
}
