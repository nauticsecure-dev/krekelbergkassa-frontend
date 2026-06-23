'use client';

import Link from 'next/link';
import { Logo } from '@/components/ui/Logo';
import { useIntl } from '@/i18n/IntlProvider';
import { Mail, MapPin, Phone } from 'lucide-react';
import { cn } from '@/lib/cn';
import { companyInfo } from '@/lib/company';
import { useCms } from '@/components/cms/CmsProvider';

export function Footer({ className }: { className?: string }) {
  const { t, locale } = useIntl();
  const { getGlobal } = useCms();
  const year = new Date().getFullYear();

  // Trello #112: global settings flow through here read-only. Editing happens
  // via the CMS toolbar's Global modal; fall back to the existing values.
  const tagline = getGlobal('footer.tagline', `${t('brand.tagline')}. Vakmanschap, planning en stalling sinds 1972.`);
  const phone = getGlobal('company.phone', t('footer.phone'));
  return (
    <footer className={cn('mt-24 bg-navy-900 text-sand-100', className)}>
      <div className="container-wide grid gap-10 py-14 md:grid-cols-4">
        <div>
          <Logo variant="light" />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-sand-100/80">
            {tagline}
          </p>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-sand-100/60">
            {t('footer.services')}
          </div>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href={`/${locale}/kraanafspraak`} className="hover:text-white">{t('services.crane.title')}</Link></li>
            <li><Link href={`/${locale}/diensten/afspuiten`} className="hover:text-white">{t('services.wash.title')}</Link></li>
            <li><Link href={`/${locale}/diensten/winterstalling`} className="hover:text-white">{t('services.storage.title')}</Link></li>
            <li><Link href={`/${locale}/verkoop`} className="hover:text-white">{t('services.sale.title')}</Link></li>
            <li><Link href={`/${locale}/appartementen`} className="hover:text-white">{t('services.apartments.title')}</Link></li>
          </ul>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-sand-100/60">
            {t('footer.company')}
          </div>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href={`/${locale}/over-ons`} className="hover:text-white">{t('nav.about')}</Link></li>
            <li><Link href={`/${locale}/faq`} className="hover:text-white">{t('faq.title')}</Link></li>
            <li><Link href={`/${locale}/contact`} className="hover:text-white">{t('nav.contact')}</Link></li>
            <li><Link href={`/${locale}/feed`} className="hover:text-white">{t('feed.title')}</Link></li>
            <li><Link href={`/${locale}/login`} className="hover:text-white">{t('nav.login')}</Link></li>
          </ul>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-sand-100/60">
            Contact
          </div>
          <ul className="mt-3 space-y-3 text-sm">
            <li className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 text-sand-100/70" />
              <span>{t('footer.address')}</span>
            </li>
            <li className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-sand-100/70" />
              <a href={companyInfo.phoneHref} className="hover:text-white">
                {phone}
              </a>
            </li>
            <li className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-sand-100/70" />
              <a href="mailto:info@krekelberg-nautic.nl" className="hover:text-white">
                {t('footer.email')}
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-wide flex flex-col items-center justify-between gap-2 py-5 text-xs text-sand-100/60 sm:flex-row">
          <span>{t('footer.copyright', { year })}</span>
          <div className="flex gap-5">
            <Link href={`/${locale}/privacy`} className="hover:text-white">Privacy</Link>
            <Link href={`/${locale}/voorwaarden`} className="hover:text-white">Voorwaarden</Link>
            <Link href={`/${locale}/cookies`} className="hover:text-white">Cookies</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
