/** Normalize pricing calculate/preview payloads (amounts in cents) to euros. */
export function pricingTotalInclEuros(
  payload: Record<string, unknown> | null | undefined,
): number {
  if (!payload) return 0;

  const euroFields = [payload.total_amount_euros, payload.total_euros, payload.total];
  for (const value of euroFields) {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) return n;
  }

  const centFields = [payload.total_incl_vat, payload.price_incl_vat, payload.total_cents];
  for (const value of centFields) {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) return n / 100;
  }

  const services = payload.services;
  if (Array.isArray(services) && services.length > 0) {
    const cents = services.reduce((sum, item) => {
      const row = item as Record<string, unknown>;
      return sum + Number(row.price_incl_vat ?? row.total_incl_vat ?? 0);
    }, 0);
    if (cents > 0) return cents / 100;
  }

  return 0;
}

export function calculatorResultTotalEuros(result: Record<string, unknown>): number {
  const preview = result.preview;
  if (preview && typeof preview === 'object') {
    const fromPreview = pricingTotalInclEuros(preview as Record<string, unknown>);
    if (fromPreview > 0) return fromPreview;
  }
  return pricingTotalInclEuros(result);
}

export function pricingTotalInclCents(payload: Record<string, unknown> | null | undefined): number {
  return Math.round(pricingTotalInclEuros(payload) * 100);
}
