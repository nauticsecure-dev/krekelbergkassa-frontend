'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';

export type YardTileMetadata = { width: number; height: number; tile_size?: number | null };
type VisibleTile = { key: string; level: number; x: number; y: number; width: number; height: number };

export function YardPhotoTiles({ path, metadata, viewport }: {
  path: string; metadata: YardTileMetadata; viewport: React.RefObject<HTMLDivElement>;
}) {
  const layer = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState<VisibleTile[]>([]);

  useEffect(() => {
    const frame = viewport.current;
    const image = layer.current;
    if (!frame || !image || !metadata.tile_size) return;
    const tile = metadata.tile_size;
    function update() {
      const region = frame!.getBoundingClientRect();
      const bounds = image!.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      const maxLevel = Math.max(0, Math.ceil(Math.log2(Math.max(metadata.width, metadata.height) / tile)));
      const level = Math.min(maxLevel, Math.max(0, Math.floor(Math.log2(metadata.width / (bounds.width * window.devicePixelRatio)))));
      const divisor = 2 ** level;
      const width = Math.ceil(metadata.width / divisor);
      const height = Math.ceil(metadata.height / divisor);
      const firstX = Math.max(0, Math.floor((region.left - bounds.left) / bounds.width * width / tile));
      const firstY = Math.max(0, Math.floor((region.top - bounds.top) / bounds.height * height / tile));
      const lastX = Math.min(Math.ceil(width / tile) - 1, Math.floor((region.right - bounds.left) / bounds.width * width / tile));
      const lastY = Math.min(Math.ceil(height / tile) - 1, Math.floor((region.bottom - bounds.top) / bounds.height * height / tile));
      const next: VisibleTile[] = [];
      for (let y = firstY; y <= lastY; y++) {
        for (let x = firstX; x <= lastX; x++) next.push({ key: level + '/' + x + '/' + y, level, x, y, width, height });
      }
      setVisible(previous => previous.map(item => item.key).join() === next.map(item => item.key).join() ? previous : next);
    }
    const observer = new ResizeObserver(update);
    observer.observe(frame);
    observer.observe(image);
    frame.addEventListener('scroll', update, { passive: true });
    update();
    return () => { observer.disconnect(); frame.removeEventListener('scroll', update); };
  }, [metadata, viewport]);

  const tile = metadata.tile_size!;
  return <div ref={layer} className="absolute inset-0 overflow-hidden bg-slate-950" role="img" aria-label="Gegenereerde lege werf">
    {visible.map(item => <Tile key={item.key} path={path + '/tiles/' + item.key} style={{
      left: item.x * tile / item.width * 100 + '%', top: item.y * tile / item.height * 100 + '%',
      width: Math.min(tile, item.width - item.x * tile) / item.width * 100 + '%',
      height: Math.min(tile, item.height - item.y * tile) / item.height * 100 + '%',
    }} />)}
  </div>;
}

function Tile({ path, style }: { path: string; style: React.CSSProperties }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    let active = true;
    let objectUrl = '';
    api<Blob>(path).then(blob => {
      if (active) {
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      }
    }).catch(() => { if (active) setUrl(''); });
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [path]);
  // eslint-disable-next-line @next/next/no-img-element
  return url ? <img className="absolute" alt="" src={url} style={style} /> : null;
}
