'use client';
import * as React from 'react';
import type { MediaBlock } from './CmsProvider';

/** Cover a responsive frame with the saved rectangle of the original image. */
export function CmsImage({ src, alt, title, crop, focal = { x: 50, y: 50 }, className, srcSet, mobileSrc, mobileSrcSet, mobileCrop, mobileFocal, filter, dimensions, mobileDimensions }: {
  src: string; alt: string; title?: string; crop?: MediaBlock['crop_data'];
  focal?: { x: number; y: number }; className?: string;
  srcSet?: string | null; mobileSrc?: string | null; mobileSrcSet?: string | null;
  mobileCrop?: MediaBlock['crop_data']; mobileFocal?: {x:number;y:number} | null; filter?: string;
  dimensions?: {width: number; height: number} | null; mobileDimensions?: {width: number; height: number} | null;
}) {
  const frame = React.useRef<HTMLSpanElement>(null);
  const [size, setSize] = React.useState({ width: 0, height: 0 });
  const [natural, setNatural] = React.useState({ width: 0, height: 0 });
  const [mobile, setMobile] = React.useState(false);
  React.useEffect(() => {
    const query = window.matchMedia('(max-width: 767px)');
    const sync = () => setMobile(query.matches);
    sync(); query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);
  if (mobile) { crop = mobileCrop ?? (mobileSrc ? null : crop); focal = mobileFocal ?? focal; if (mobileSrc) dimensions = mobileDimensions; }
  if (crop && crop.unit !== 'percent' && dimensions?.width && dimensions?.height) {
    crop = {x: crop.x / dimensions.width * 100, y: crop.y / dimensions.height * 100,
      width: crop.width / dimensions.width * 100, height: crop.height / dimensions.height * 100, unit:'percent'};
  }
  React.useEffect(() => {
    if (!frame.current) return;
    const observer = new ResizeObserver(([entry]) => setSize(entry.contentRect));
    observer.observe(frame.current);
    return () => observer.disconnect();
  }, []);
  let style: React.CSSProperties = { objectPosition: `${focal.x}% ${focal.y}%` };
  if (crop && crop.width > 0 && crop.height > 0 && natural.width && size.width) {
    const dx = crop.unit === 'percent' ? natural.width / 100 : 1;
    const dy = crop.unit === 'percent' ? natural.height / 100 : 1;
    const width = crop.width * dx, height = crop.height * dy;
    const scale = Math.max(size.width / width, size.height / height);
    style = { position: 'absolute', maxWidth: 'none', objectFit: 'fill',
      width: natural.width * scale, height: natural.height * scale,
      left: -crop.x * dx * scale + (size.width - width * scale) * focal.x / 100,
      top: -crop.y * dy * scale + (size.height - height * scale) * focal.y / 100 };
  }
  return <span ref={frame} className="relative block h-full w-full overflow-hidden">
    <picture>
    {mobileSrc && <source media="(max-width: 767px)" srcSet={mobileSrcSet || mobileSrc} sizes="100vw" />}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img key={src + (mobileSrc ?? '')} src={src} srcSet={srcSet || undefined} sizes="100vw" alt={alt} title={title} className={className ?? 'h-full w-full object-cover'} style={{...style, filter}}
      onLoad={(event) => setNatural({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })} />
    </picture>
  </span>;
}
