'use client';

import * as React from 'react';
import type { MediaBlock } from './CmsProvider';

/** The real page at a real viewport width, with an in-memory image draft. */
export function CmsPageImagePreview({ draft, device, title }: {draft: MediaBlock; device:'desktop'|'mobile'; title:string}) {
  const frame = React.useRef<HTMLIFrameElement>(null);
  const host = React.useRef<HTMLDivElement>(null);
  const [width, setWidth] = React.useState(300);
  const [url, setUrl] = React.useState('');
  const viewport = device === 'desktop' ? 1440 : 390;
  React.useEffect(() => {
    const url = new URL(window.location.href); url.searchParams.set('cms-media-preview', '1'); setUrl(url.pathname + url.search);
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    if (host.current) observer.observe(host.current);
    return () => observer.disconnect();
  }, []);
  React.useEffect(() => {
    const send = () => frame.current?.contentWindow?.postMessage({type:'cms-media-preview', draft}, window.location.origin);
    const ready = (event:MessageEvent) => {
      if (event.origin === window.location.origin && event.source === frame.current?.contentWindow && event.data?.type === 'cms-media-preview-ready') send();
    };
    window.addEventListener('message', ready); send();
    return () => window.removeEventListener('message', ready);
  }, [draft]);
  return <div ref={host} className="overflow-hidden rounded-lg border" style={{height:900 * width / viewport}}>
    {url && <iframe ref={frame} src={url} title={title} sandbox="allow-scripts allow-same-origin" tabIndex={-1}
      style={{width:viewport, height:900, border:0, transform:`scale(${width/viewport})`, transformOrigin:'top left', pointerEvents:'none'}} />}
  </div>;
}
