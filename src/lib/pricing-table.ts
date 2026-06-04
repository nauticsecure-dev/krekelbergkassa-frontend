// Real Krekelberg Nautic length-based tariff table (per boat length in cm).
// Source: krekelberg-nautic.nl/tarieven (provided on Trello card 98).
// Used as the single front-end pricing source for the public booking page
// and the public service (diensten) pages so prices vary with boat length.
// Amounts are in EUR (incl. BTW), per length class.

export interface LengthTariff {
  min_cm: number;
  max_cm: number;
  label: string;
  kranen: number;
  afspuiten: number;
  stalling_per_week: number;
  week_arrangement: number;
  winterberging: number;
}

export const LENGTH_TARIFFS: LengthTariff[] = [
  { min_cm: 0, max_cm: 499, label: '0–499 cm', kranen: 65, afspuiten: 50, stalling_per_week: 50, week_arrangement: 220, winterberging: 660 },
  { min_cm: 500, max_cm: 549, label: '500–549 cm', kranen: 65, afspuiten: 50, stalling_per_week: 55, week_arrangement: 225, winterberging: 690 },
  { min_cm: 550, max_cm: 599, label: '550–599 cm', kranen: 70, afspuiten: 55, stalling_per_week: 55, week_arrangement: 235, winterberging: 720 },
  { min_cm: 600, max_cm: 649, label: '600–649 cm', kranen: 70, afspuiten: 55, stalling_per_week: 60, week_arrangement: 240, winterberging: 760 },
  { min_cm: 650, max_cm: 699, label: '650–699 cm', kranen: 70, afspuiten: 60, stalling_per_week: 60, week_arrangement: 250, winterberging: 800 },
  { min_cm: 700, max_cm: 749, label: '700–749 cm', kranen: 80, afspuiten: 65, stalling_per_week: 65, week_arrangement: 275, winterberging: 850 },
  { min_cm: 750, max_cm: 799, label: '750–799 cm', kranen: 90, afspuiten: 65, stalling_per_week: 65, week_arrangement: 300, winterberging: 900 },
  { min_cm: 800, max_cm: 849, label: '800–849 cm', kranen: 100, afspuiten: 70, stalling_per_week: 65, week_arrangement: 315, winterberging: 950 },
  { min_cm: 850, max_cm: 899, label: '850–899 cm', kranen: 100, afspuiten: 75, stalling_per_week: 75, week_arrangement: 330, winterberging: 1000 },
  { min_cm: 900, max_cm: 949, label: '900–949 cm', kranen: 105, afspuiten: 80, stalling_per_week: 75, week_arrangement: 345, winterberging: 1050 },
  { min_cm: 950, max_cm: 999, label: '950–999 cm', kranen: 110, afspuiten: 85, stalling_per_week: 80, week_arrangement: 360, winterberging: 1110 },
  { min_cm: 1000, max_cm: 1049, label: '1000–1049 cm', kranen: 110, afspuiten: 95, stalling_per_week: 85, week_arrangement: 380, winterberging: 1175 },
  { min_cm: 1050, max_cm: 1099, label: '1050–1099 cm', kranen: 115, afspuiten: 95, stalling_per_week: 90, week_arrangement: 395, winterberging: 1240 },
  { min_cm: 1100, max_cm: 1149, label: '1100–1149 cm', kranen: 125, afspuiten: 100, stalling_per_week: 100, week_arrangement: 425, winterberging: 1325 },
  { min_cm: 1150, max_cm: 1199, label: '1150–1199 cm', kranen: 150, afspuiten: 105, stalling_per_week: 105, week_arrangement: 475, winterberging: 1425 },
  { min_cm: 1200, max_cm: 1249, label: '1200–1249 cm', kranen: 159, afspuiten: 110, stalling_per_week: 110, week_arrangement: 510, winterberging: 1525 },
  { min_cm: 1250, max_cm: 1299, label: '1250–1299 cm', kranen: 165, afspuiten: 115, stalling_per_week: 115, week_arrangement: 530, winterberging: 1625 },
  { min_cm: 1300, max_cm: 1349, label: '1300–1349 cm', kranen: 175, afspuiten: 120, stalling_per_week: 120, week_arrangement: 560, winterberging: 1725 },
  { min_cm: 1350, max_cm: 1399, label: '1350–1399 cm', kranen: 180, afspuiten: 125, stalling_per_week: 125, week_arrangement: 580, winterberging: 1825 },
  { min_cm: 1400, max_cm: 1449, label: '1400–1449 cm', kranen: 190, afspuiten: 130, stalling_per_week: 130, week_arrangement: 610, winterberging: 1925 },
  { min_cm: 1450, max_cm: 1499, label: '1450–1499 cm', kranen: 215, afspuiten: 140, stalling_per_week: 140, week_arrangement: 675, winterberging: 2050 },
  { min_cm: 1500, max_cm: 1549, label: '1500–1549 cm', kranen: 225, afspuiten: 145, stalling_per_week: 150, week_arrangement: 710, winterberging: 2175 },
];

export type TariffColumn =
  | 'kranen'
  | 'afspuiten'
  | 'stalling_per_week'
  | 'week_arrangement'
  | 'winterberging';

/** Largest boat length covered by the table (cm). Above this → "op aanvraag". */
export const MAX_TARIFF_CM = LENGTH_TARIFFS[LENGTH_TARIFFS.length - 1].max_cm;

/** Match the tariff row for a boat length (clamped to the table bounds). */
export function matchTariff(lengthCm: number): LengthTariff {
  const cm = Math.max(0, Math.round(lengthCm || 0));
  const row = LENGTH_TARIFFS.find((r) => cm >= r.min_cm && cm <= r.max_cm);
  if (row) return row;
  // Clamp: below first / above last range.
  return cm < LENGTH_TARIFFS[0].min_cm
    ? LENGTH_TARIFFS[0]
    : LENGTH_TARIFFS[LENGTH_TARIFFS.length - 1];
}

/** Price (EUR) for a tariff column at a given boat length, or null if no length. */
export function tariffPrice(column: TariffColumn, lengthCm: number): number | null {
  if (!lengthCm) return null;
  return matchTariff(lengthCm)[column];
}

// Length-class multiplier for services that are not in the tariff table but
// still scale with boat size (e.g. transport, placement). Anchored at 6 m: a
// 6 m boat pays the base price, every additional metre adds ~6%.
export function lengthFactor(lengthCm: number): number {
  if (!lengthCm) return 1;
  const meters = lengthCm / 100;
  const extra = Math.max(0, meters - 6);
  return 1 + extra * 0.06;
}

/** Apply the length-class multiplier to a base price (rounded to whole euro). */
export function scaledPrice(basePrice: number, lengthCm: number): number {
  return Math.round(basePrice * lengthFactor(lengthCm));
}

// Condensed, real length-based price cards for the public service pages,
// derived directly from the tariff table (so no invented "dummy" numbers).
// Each card shows the starting price for that length class.
export function tariffRanges(
  column: TariffColumn,
  currency = '€',
): { label: string; price: string; note?: string }[] {
  const buckets: [number, number][] = [
    [0, 6],
    [6, 8],
    [8, 10],
    [10, 12],
    [12, 14],
    [14, 15.5],
  ];
  const cards = buckets.map(([lo, hi]) => {
    const price = tariffPrice(column, Math.max(lo * 100, 1));
    return {
      label: `${lo} – ${hi} m`.replace('.5', ',5'),
      price: price != null ? `${currency} ${price}` : 'Op aanvraag',
      note: lo === 0 ? 'vanaf' : undefined,
    };
  });
  cards.push({ label: '> 15,5 m', price: 'Op aanvraag', note: undefined });
  return cards;
}

// Extra services with non length-table pricing (Trello card 98, step 5).
export interface ExtraService {
  key: string;
  name: string;
  priceLabelKey: string; // i18n-free short description of the price model
  price: string; // human-readable price
}

export const EXTRA_SERVICES: ExtraService[] = [
  { key: 'mastkraan', name: 'Mastkraan', priceLabelKey: 'start_plus_time', price: '€ 90 + € 45 / 15 min' },
  { key: 'hal', name: 'Hal verhuur', priceLabelKey: 'weekly_monthly', price: '€ 300 / week · € 800 / maand' },
  { key: 'rangeren', name: 'Rangeren (botenwagen/heftruck)', priceLabelKey: 'per_movement', price: '€ 75 per verplaatsing' },
  { key: 'heftruck', name: 'Heftruck + persoon', priceLabelKey: 'hourly', price: '€ 180 / uur' },
  { key: 'trailerstalling', name: 'Trailerstalling', priceLabelKey: 'fixed_seasonal', price: '€ 250 (zomerseizoen)' },
];
