'use client';
import * as React from 'react';
import type { MediaBlock } from './CmsProvider';

/** Cover a responsive frame with the saved rectangle of the original image. */
export function CmsImage({ src, alt, title, crop, focal = { x: 50, y: 50 }, className, srcSet, mobileSrc, mobileSrcSet, mobileCrop, mobileFocal, filter, dimensions, mobileDimensions, imageStyle, overlay = 0, rotation = 0, mobileRotation = 0, adjustmentsBaked = false, mobileAdjustmentsBaked = false, sizes = '100vw', priority = false }: {
  src: string; alt: string; title?: string; crop?: MediaBlock['crop_data'];
  focal?: { x: number; y: number }; className?: string;
  srcSet?: string | null; mobileSrc?: string | null; mobileSrcSet?: string | null;
  mobileCrop?: MediaBlock['crop_data']; mobileFocal?: {x:number;y:number} | null; filter?: string;
  dimensions?: {width: number; height: number} | null; mobileDimensions?: {width: number; height: number} | null;
  imageStyle?: MediaBlock['image_style']; overlay?: number; rotation?: number; mobileRotation?: number;
  adjustmentsBaked?: boolean; mobileAdjustmentsBaked?: boolean; sizes?: string; priority?: boolean;
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
  if (mobile) { rotation = mobileSrc ? mobileRotation : rotation; crop = mobileCrop ?? (mobileSrc ? null : crop); focal = mobileFocal ?? focal; if (mobileSrc) dimensions = mobileDimensions; }
  if (!mobile && imageStyle?.alignment) focal = { x: imageStyle.alignment === 'left' ? 0 : imageStyle.alignment === 'right' ? 100 : 50, y: focal.y };
  const baked = mobile && mobileSrc ? mobileAdjustmentsBaked : adjustmentsBaked;
  if (baked) { crop = null; rotation = 0; }
  const imageFilter = baked ? undefined : filter ?? (imageStyle ? `brightness(${imageStyle.brightness ?? 100}%) contrast(${imageStyle.contrast ?? 100}%) saturate(${imageStyle.saturation ?? 100}%)` : undefined);
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
  const swapped = rotation % 180 !== 0;
  const rotated = swapped ? {width:natural.height, height:natural.width} : natural;
  let style: React.CSSProperties = { objectPosition: `${focal.x}% ${focal.y}%` };
  if (crop && crop.width > 0 && crop.height > 0 && natural.width && size.width) {
    const dx = crop.unit === 'percent' ? rotated.width / 100 : 1;
    const dy = crop.unit === 'percent' ? rotated.height / 100 : 1;
    const width = crop.width * dx, height = crop.height * dy;
    const scale = Math.max(size.width / width, size.height / height);
    style = { position: 'absolute', maxWidth: 'none', objectFit: 'fill',
      width: rotated.width * scale, height: rotated.height * scale,
      left: -crop.x * dx * scale + (size.width - width * scale) * focal.x / 100,
      top: -crop.y * dy * scale + (size.height - height * scale) * focal.y / 100 };
  }
  if (rotation && natural.width && size.width) {
    const scale = Math.max(size.width / rotated.width, size.height / rotated.height);
    const virtualWidth = typeof style.width === 'number' ? style.width : rotated.width * scale;
    const virtualHeight = typeof style.height === 'number' ? style.height : rotated.height * scale;
    const left = typeof style.left === 'number' ? style.left : (size.width - virtualWidth) * focal.x / 100;
    const top = typeof style.top === 'number' ? style.top : (size.height - virtualHeight) * focal.y / 100;
    const width = swapped ? virtualHeight : virtualWidth, height = swapped ? virtualWidth : virtualHeight;
    style = {position:'absolute', maxWidth:'none', objectFit:'fill', width, height,
      left:left + (virtualWidth - width)/2, top:top + (virtualHeight - height)/2, transform:'rotate(' + rotation + 'deg)'};
  }
  return <span ref={frame} className="relative block h-full w-full overflow-hidden">
    <picture>
    {mobileSrc && <source media="(max-width: 767px)" srcSet={mobileSrcSet || mobileSrc} sizes={sizes} />}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img key={src + (mobileSrc ?? '')} src={src} srcSet={srcSet || undefined} sizes={sizes} loading={priority ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : 'auto'} decoding="async" alt={alt} title={title} className={className ?? 'h-full w-full object-cover'} style={{...style, filter: imageFilter}}
      onLoad={(event) => setNatural({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })} />
    </picture>
    {imageStyle?.gradient && imageStyle.gradient !== 'none' && <span aria-hidden className="pointer-events-none absolute inset-0"
      style={{background: `linear-gradient(to ${imageStyle.gradient}, rgba(8,19,38,${imageStyle.gradient_start ?? .9}), rgba(8,19,38,${imageStyle.gradient_middle ?? ((imageStyle.gradient_start ?? .9) + (imageStyle.gradient_end ?? .35)) / 2}), rgba(8,19,38,${imageStyle.gradient_end ?? .35}))`}} />}
    {overlay > 0 && <span aria-hidden className="pointer-events-none absolute inset-0" style={{backgroundColor: `rgba(8, 19, 38, ${overlay})`}} />}
  </span>;
}
