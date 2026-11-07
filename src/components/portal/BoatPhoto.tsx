'use client';

import * as React from 'react';
import { Ship } from 'lucide-react';
import { portalService } from '@/lib/services';
import type { PortalBoat } from '@/lib/api-types';

export function BoatPhoto({ boat, thumbnail = false }: {
  boat?: Pick<PortalBoat, 'id' | 'name' | 'photo_url' | 'photo_file_id'> | null;
  thumbnail?: boolean;
}) {
  const path = boat?.photo_url;
  const boatId = boat?.id;
  const fileId = boat?.photo_file_id;
  const [image, setImage] = React.useState<{ path: string; url: string }>();
  const [failed, setFailed] = React.useState<string>();

  React.useEffect(() => {
    if (!path || !fileId || !boatId) return;
    let active = true;
    let url: string | undefined;
    void portalService.boatPhoto(boatId, fileId, thumbnail).then((blob) => {
      if (!active) return;
      url = URL.createObjectURL(blob);
      setImage({ path, url });
    }).catch(() => {
      if (active) setImage(undefined);
    });
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [path, boatId, fileId, thumbnail]);

  const src = fileId ? (image?.path === path ? image?.url : undefined) : path;
  return src && src !== failed ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={boat?.name ?? ''} onError={() => setFailed(src)} className="h-full w-full object-cover" />
  ) : (
    <div className="grid h-full w-full place-items-center bg-gradient-to-br from-navy-900 to-marine-800">
      <Ship aria-hidden className="h-10 w-10 text-white/40" />
    </div>
  );
}
