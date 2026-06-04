// Single source of truth for Krekelberg Nautic company contact data.
// Do NOT hardcode address / phone / opening hours anywhere else — import from here.
// (Trello cards 97 & 103: one global company config used everywhere, every language.)

export type Locale = 'nl' | 'en' | 'de';

const MAPS_QUERY = 'Hertenerweg+2,+6049AA+Herten';

export const companyInfo = {
  name: 'Krekelberg Nautic',
  legalName: 'Krekelberg Nautic / Schepenkring Roermond',

  // Address
  street: 'Hertenerweg 2',
  zip: '6049AA',
  city: 'Herten',
  country: 'Nederland',
  address: 'Hertenerweg 2, 6049AA Herten',

  // Phone
  phone: '0475 315 661',
  phoneHref: 'tel:+31475315661',

  // Email
  email: 'info@krekelberg-nautic.nl',
  emailHref: 'mailto:info@krekelberg-nautic.nl',

  // Google Maps
  mapsUrl: `https://www.google.com/maps/dir/?api=1&destination=${MAPS_QUERY}`,
  mapsEmbed: `https://maps.google.com/maps?q=${MAPS_QUERY}&t=&z=14&ie=UTF8&iwloc=&output=embed`,
} as const;

// Structured opening hours (Trello card 97):
// Ma–vr 09:00–17:30 · Wo gesloten · Za + Zo 10:00–17:00
export const openingHours = {
  weekday: '09:00 – 17:30',
  wednesdayClosed: true,
  weekend: '10:00 – 17:00',
} as const;

const HOURS_SUMMARY: Record<Locale, string> = {
  nl: 'Ma–vr 09:00–17:30 · Wo gesloten · Za + Zo 10:00–17:00',
  en: 'Mon–Fri 09:00–17:30 · Wed closed · Sat + Sun 10:00–17:00',
  de: 'Mo–Fr 09:00–17:30 · Mi geschlossen · Sa + So 10:00–17:00',
};

export function openingHoursSummary(locale: string): string {
  return HOURS_SUMMARY[(locale as Locale)] ?? HOURS_SUMMARY.nl;
}

// Per-day rows for the contact page hours table.
export function openingHoursRows(
  dayLabels: {
    monday: string;
    tuesday: string;
    wednesday: string;
    thursday: string;
    friday: string;
    saturday: string;
    sunday: string;
    closed: string;
  },
): { day: string; value: string }[] {
  return [
    { day: dayLabels.monday, value: openingHours.weekday },
    { day: dayLabels.tuesday, value: openingHours.weekday },
    { day: dayLabels.wednesday, value: dayLabels.closed },
    { day: dayLabels.thursday, value: openingHours.weekday },
    { day: dayLabels.friday, value: openingHours.weekday },
    { day: dayLabels.saturday, value: openingHours.weekend },
    { day: dayLabels.sunday, value: openingHours.weekend },
  ];
}
