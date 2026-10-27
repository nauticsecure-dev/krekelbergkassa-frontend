/** Header destinations are internal routes shared by every language. */
export function normalizeHeaderDestination(value: string): string {
  let path = value.trim();
  let decoded: string;
  try { decoded = decodeURIComponent(path); } catch { throw new Error('Invalid route'); }
  if (/[\\\s\u0000-\u001f]/.test(decoded) || decoded.startsWith('//') || /[:]/.test(decoded)
    || decoded.split(/[/?#]/).some((part) => part === '..' || part === '.')) {
    throw new Error('Invalid route');
  }
  path = path.replace(/^\//, '').replace(/^(nl|en|de|fr)(\/|$)/, '').replace(/\/{2,}/g, '/');
  return path;
}

export function headerHref(value: string, locale: string): string {
  try { return `/${locale}/${normalizeHeaderDestination(value)}`; }
  catch { return `/${locale}/diensten/winterstalling`; }
}
