export function journeyIntent(path: string): string | undefined {
  if (/\/boot-aanmelden(?:\/|$)/.test(path)) return 'sell_boat';
  if (/\/diensten\/winterstalling(?:\/|$)/.test(path)) return 'winter_storage';
  if (/\/kraanafspraak(?:\/|$)/.test(path)) return 'crane_booking';
  if (/\/verkoop\/[^/]+/.test(path)) return 'buy_boat';
  return undefined;
}
