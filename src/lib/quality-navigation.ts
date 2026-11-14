import { getAuthToken } from './auth-storage';

export function qualityUrls(locale: string) {
  const directApi = process.env.NEXT_PUBLIC_API_URL;
  const override = process.env.NEXT_PUBLIC_QUALITY_ORIGIN ||
    process.env.NEXT_PUBLIC_QUALITY_ASSIGNED_URL || process.env.NEXT_PUBLIC_QUALITY_URL;
  const api = directApi?.trim();
  const absoluteApi = api && /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(api) ? api : undefined;
  const configured = override || absoluteApi || process.env.QUALITY_API_PROXY_TARGET;
  if (!configured || !/^https?:\/\//i.test(configured.trim())) return null;
  let url: URL;
  try {
    url = new URL(configured);
  } catch {
    return null;
  }
  if (url.username || url.password) return null;
  const prefix = url.pathname.replace(/\/api(?:\/.*)?$/, '').replace(/\/+$/, '');
  const root = url.origin + prefix;
  const base = `${root}/api/v1/quality`;
  const query = `locale=${encodeURIComponent(locale)}`;
  return { base, assigned: `${base}/assigned?${query}`, portal: `${root}/api/v1/admin/quality/portal?${query}` };
}

export type QualityAccess = { assigned: boolean; portal: boolean; unread: number };

export async function qualityAccess(base: string, signal: AbortSignal) {
  const response = await fetch(`${base}/access`, { headers: { Accept: 'application/json', Authorization: `Bearer ${getAuthToken() || ''}` }, signal, cache: 'no-store', redirect: 'error' });
  if (!response.ok) return { assigned: false, portal: false, unread: 0 };
  const access = await response.json() as Omit<QualityAccess, 'unread'> & { unread?: number };
  return { ...access, unread: access.unread ?? 0 };
}

export async function openQuality(href: string, locale: string) {
  const urls = qualityUrls(locale);
  if (!urls || ![urls.assigned, urls.portal].includes(href)) throw new Error('Invalid QA destination');
  const response = await fetch(`${urls.base}/session`, { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${getAuthToken() || ''}` },
    body: JSON.stringify({ destination: href === urls.portal ? 'portal' : 'assigned', locale }), signal: AbortSignal.timeout(25000), cache: 'no-store', redirect: 'error' });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const { code } = await response.json() as { code: string };
  const form = document.createElement('form');
  form.method = 'POST'; form.action = `${urls.base}/session/open`;
  const input = document.createElement('input'); input.type = 'hidden'; input.name = 'code'; input.value = code;
  form.append(input); document.body.append(form); form.submit(); form.remove();
}
