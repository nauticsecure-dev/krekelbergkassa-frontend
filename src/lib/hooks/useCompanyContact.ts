'use client';
import * as React from 'react';
import { companyInfo } from '@/lib/company';
import { contentService, type FaqContent } from '@/lib/services';


export const CONTACT_CHANGED = 'company-contact-changed';

let snapshot: FaqContent['contact'] | null = null;
let pending: Promise<void> | null = null;
let generation = 0;
const listeners = new Set<() => void>();
export function publishContact(company: NonNullable<FaqContent['contact']['company']>) {
  generation++;
  snapshot = { ...snapshot, show_chat: snapshot?.show_chat ?? false, company };
  listeners.forEach(listener => listener());
}
function refresh() {
  if (pending) return pending;
  const current = generation;
  pending = contentService.contact().then(data => {
    if (current !== generation) return;
    snapshot = data;
    listeners.forEach(listener => listener());
  }).catch(() => undefined).finally(() => { pending = null; });
  return pending;
}
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
const getSnapshot = () => snapshot;
const getServerSnapshot = () => null;

export function useCompanyContact() {
  const data = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  React.useEffect(() => {
    void refresh();
    const reload = () => { void refresh(); };
    window.addEventListener(CONTACT_CHANGED, reload);
    window.addEventListener('focus', reload);
    return () => {
      window.removeEventListener(CONTACT_CHANGED, reload);
      window.removeEventListener('focus', reload);
    };
  }, []);
  const company = data?.company;
  // A successful settings response is authoritative, including cleared values.
  // Otherwise clearing a nullable phone number resurrects the static default.
  const phone = company ? company.phone ?? '' : companyInfo.phone;
  const email = company ? company.email ?? '' : companyInfo.email;
  const street = company ? company.address.street ?? '' : companyInfo.street;
  const zip = company ? company.address.postal_code ?? '' : companyInfo.zip;
  const city = company ? company.address.city ?? '' : companyInfo.city;
  const address = company?.address
    ? [company.address.street, company.address.postal_code, company.address.city].filter(Boolean).join(', ')
    : companyInfo.address;
  return {
    ...companyInfo, company, phone, email, address, street, zip, city,
    phoneHref: 'tel:' + phone.replace(/\(0\)/g, '').replace(/[^+\d]/g, ''),
    emailHref: 'mailto:' + email,
    mapsUrl: 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(address),
    mapsEmbed: 'https://maps.google.com/maps?q=' + encodeURIComponent(address) + '&z=14&output=embed',
  };
}
