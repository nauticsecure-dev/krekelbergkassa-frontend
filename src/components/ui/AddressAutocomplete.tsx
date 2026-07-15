'use client';

import * as React from 'react';
import { MapPin } from 'lucide-react';
import { cn } from '@/lib/cn';

export type AddressSelection = {
  street: string;
  house_number: string;
  postal_code: string;
  city: string;
  country: string;
  google_place_id: string;
  latitude: number | null;
  longitude: number | null;
  formatted_address: string;
};

type Props = {
  label?: string;
  placeholder?: string;
  className?: string;
  onSelect: (address: AddressSelection) => void;
};

type GooglePlaceResult = {
  place_id?: string;
  formatted_address?: string;
  geometry?: { location?: { lat: () => number; lng: () => number } };
  address_components?: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>;
};

declare global {
  interface Window {
    google?: {
      maps: {
        places: {
          Autocomplete: new (
            input: HTMLInputElement,
            opts?: { types?: string[]; fields?: string[] }
          ) => {
            addListener: (event: string, handler: () => void) => void;
            getPlace: () => GooglePlaceResult;
          };
        };
      };
    };
  }
}

const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

let mapsLoader: Promise<void> | null = null;

function loadGoogleMaps(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.google?.maps?.places) return Promise.resolve();
  if (!MAPS_KEY) return Promise.resolve();
  if (mapsLoader) return mapsLoader;

  mapsLoader = new Promise((resolve, reject) => {
    const id = 'google-maps-places';
    if (document.getElementById(id)) {
      const wait = setInterval(() => {
        if (window.google?.maps?.places) {
          clearInterval(wait);
          resolve();
        }
      }, 50);
      return;
    }
    const script = document.createElement('script');
    script.id = id;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}&libraries=places&loading=async`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Google Maps failed to load'));
    document.head.appendChild(script);
  });

  return mapsLoader;
}

function parsePlace(place: GooglePlaceResult): AddressSelection {
  const parts = place.address_components ?? [];
  const get = (...types: string[]) =>
    parts.find((c) => types.some((t) => c.types.includes(t)));

  const street = get('route')?.long_name ?? '';
  const house_number = get('street_number')?.long_name ?? '';
  const postal_code = get('postal_code')?.long_name ?? '';
  const city =
    get('locality')?.long_name ??
    get('postal_town')?.long_name ??
    get('administrative_area_level_2')?.long_name ??
    '';
  const country = get('country')?.short_name ?? '';

  return {
    street,
    house_number,
    postal_code,
    city,
    country,
    google_place_id: place.place_id ?? '',
    latitude: place.geometry?.location?.lat() ?? null,
    longitude: place.geometry?.location?.lng() ?? null,
    formatted_address: place.formatted_address ?? '',
  };
}

export function AddressAutocomplete({ label, placeholder, className, onSelect }: Props) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [ready, setReady] = React.useState(false);
  const [hint, setHint] = React.useState('');

  React.useEffect(() => {
    if (!MAPS_KEY) {
      setHint('manual');
      return;
    }
    let autocomplete: {
      addListener: (e: string, h: () => void) => void;
      getPlace: () => GooglePlaceResult;
    } | null = null;

    void loadGoogleMaps()
      .then(() => {
        if (!inputRef.current || !window.google?.maps?.places) return;
        autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
          types: ['address'],
          fields: ['address_components', 'geometry', 'place_id'],
        });
        autocomplete.addListener('place_changed', () => {
          const place = autocomplete!.getPlace();
          if (!place?.address_components?.length) return;
          onSelect(parsePlace(place));
        });
        setReady(true);
      })
      .catch(() => setHint('manual'));

    return () => {
      autocomplete = null;
    };
  }, [onSelect]);

  if (!MAPS_KEY) return null;

  return (
    <div className={cn('space-y-1', className)}>
      {label ? (
        <label className="block text-sm font-medium text-navy-700">{label}</label>
      ) : null}
      <div className="relative">
        <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
        <input
          ref={inputRef}
          type="search"
          autoComplete="off"
          placeholder={placeholder}
          className="input-base w-full pl-9"
          disabled={!ready && !hint}
        />
      </div>
    </div>
  );
}
