import { API_BASE } from './api';
import { getAuthToken } from './auth-storage';

export function qualityUrls(locale: string) {
  const configured = process.env.NEXT_PUBLIC_QUALITY_ORIGIN || process.env.NEXT_PUBLIC_QUALITY_ASSIGNED_URL || process.env.NEXT_PUBLIC_QUALITY_URL || API_BASE;
  // A relative API proxy cannot establish the independent QA network boundary.
  if (! /^https?:\/\//.test(configured)) return null;
  const root = configured.replace(/\/api(?:\/v1)?(?:\/.*)?\/?$/, '').replace(/\/$/, '');
  const base = `${root}/api/v1/quality`;
  return { base, assigned: `${base}/assigned?locale=${locale}`, portal: `${root}/api/v1/admin/quality/portal?locale=${locale}` };
}

export async function qualityAccess(base: string, signal: AbortSignal) {
  const response = await fetch(`${base}/access`, { headers: { Accept: 'application/json', Authorization: `Bearer ${getAuthToken() || ''}` }, signal, cache: 'no-store', redirect: 'error' });
  if (!response.ok) return { assigned: false, portal: false };
  return response.json() as Promise<{ assigned: boolean; portal: boolean }>;
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
