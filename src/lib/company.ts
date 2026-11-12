// Brand fallback only. Business contact data and hours come from canonical APIs.

export type Locale = 'nl' | 'en' | 'de' | 'fr';


export const companyInfo = {
  name: 'Krekelberg Nautic',
  legalName: 'Krekelberg Nautic / Schepenkring Roermond',

  // Address
  street: '',
  zip: '',
  city: '',
  country: '',
  address: '',

  // Phone
  phone: '',
  phoneHref: '',

  // Email
  email: '',
  emailHref: '',

  // Google Maps
  mapsUrl: '',
  mapsEmbed: '',
} as const;
