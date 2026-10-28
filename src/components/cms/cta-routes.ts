/** Public destinations; keep in step with the site route tree. */
export const CTA_ROUTES = ["","diensten","diensten/winterstalling","diensten/afspuiten","diensten/weekje-op-wal","diensten/zelf-werken","over-ons","verkoop","contact","faq","kraanafspraak","voorwaarden","privacy","cookies"] as const;
export function isCtaRoute(value: string) { return (CTA_ROUTES as readonly string[]).includes(value); }
