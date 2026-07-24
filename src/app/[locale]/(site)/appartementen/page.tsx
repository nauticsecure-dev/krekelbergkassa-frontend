'use client';

import Link from 'next/link';
import {
  BedDouble,
  Coffee,
  MapPin,
  ParkingCircle,
  Phone,
  Tv,
  Users,
  Waves,
  Wifi,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useIntl } from '@/i18n/IntlProvider';
import { companyInfo } from '@/lib/company';
import { useRegisterCmsPage } from '@/components/cms/CmsProvider';
import { EditableText } from '@/components/cms/EditableText';
import { EditableImage } from '@/components/cms/EditableImage';

const CMS_PAGE = 'appartementen';

export default function AppartementenPage() {
  const { t, locale } = useIntl();
  useRegisterCmsPage(CMS_PAGE);

  return (
    <>
      {/* Hero with real photo */}
      <section className="relative isolate overflow-hidden">
        <EditableImage
          blockKey="appartementen.hero.image"
          page={CMS_PAGE}
          fallbackSrc="/img/krek/appartement.webp"
          alt="Appartementen hero"
          className="absolute inset-0"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-navy-950/80 via-navy-950/55 to-navy-950/25" aria-hidden />
        <div className="container-wide relative pb-24 pt-28 text-white lg:pb-32 lg:pt-40">
          <Badge tone="sand" dot className="mb-4">
            <EditableText blockKey="appartementen.hero.badge" page={CMS_PAGE} section="hero">
              {t('apartmentsPage.badge')}
            </EditableText>
          </Badge>
          <h1 className="heading-display max-w-2xl text-4xl text-white sm:text-5xl lg:text-[56px]">
            <EditableText blockKey="appartementen.hero.title" page={CMS_PAGE} section="hero" type="heading">
              {t('apartmentsPage.title')}
            </EditableText>
          </h1>
          <p className="mt-5 max-w-xl text-sand-100/85">
            <EditableText blockKey="appartementen.hero.subtitle" page={CMS_PAGE} section="hero" type="paragraph">
              {t('apartmentsPage.subtitle')}
            </EditableText>
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href={`/${locale}/contact`}>
              <Button variant="gold" size="lg">
                {t('apartmentsPage.infoCta')}
              </Button>
            </Link>
            <a href={companyInfo.phoneHref}>
              <Button
                variant="outline"
                size="lg"
                className="border-white/30 bg-white/5 text-white hover:bg-white/10"
                leftIcon={<Phone className="h-4 w-4" />}
              >
                {t('apartmentsPage.phoneCta')}
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Intro */}
      <section className="container-wide py-16">
        <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <Badge tone="navy" className="mb-3">
              {t('apartmentsPage.badge')}
            </Badge>
            <h2 className="heading-display text-3xl sm:text-4xl">
              {t('apartmentsPage.introTitle')}
            </h2>
            <p className="mt-4 text-navy-600 leading-relaxed">
              {t('apartmentsPage.introBody')}
            </p>
            <p className="mt-3 text-sm text-navy-500">{t('apartmentsPage.contactNote')}</p>
          </div>
          <div
            className="aspect-[5/4] w-full rounded-2xl bg-cover bg-center shadow-elev"
            style={{ backgroundImage: 'url(/img/krek/jachthaven.webp)' }}
            aria-hidden
          />
        </div>
      </section>

      {/* Two apartments */}
      <section className="bg-white py-16">
        <div className="container-wide grid gap-6 lg:grid-cols-2">
          <ApartmentCard
            number="1"
            image="/img/krek/appartement.webp"
            title={t('apartmentsPage.appOneTitle')}
            description={t('apartmentsPage.appOneDesc')}
            guests={2}
          />
          <ApartmentCard
            number="2"
            image="/img/krek/jachthaven.webp"
            title={t('apartmentsPage.appTwoTitle')}
            description={t('apartmentsPage.appTwoDesc')}
            guests={4}
          />
        </div>
      </section>

      {/* Amenities */}
      <section className="container-wide py-16">
        <div className="mb-6">
          <Badge tone="gold" className="mb-3">
            {t('apartmentsPage.amenitiesTitle')}
          </Badge>
        </div>
        <Card className="grid gap-3 p-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: Wifi, label: t('apartmentsPage.amenityWifi') },
            { icon: Coffee, label: t('apartmentsPage.amenityKitchen') },
            { icon: Tv, label: t('apartmentsPage.amenityTV') },
            { icon: ParkingCircle, label: t('apartmentsPage.amenityParking') },
            { icon: BedDouble, label: t('apartmentsPage.amenityTerrace') },
            { icon: Waves, label: t('apartmentsPage.amenityHarbor') },
          ].map((a) => {
            const Icon = a.icon;
            return (
              <div key={a.label} className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-sand-100 text-navy-700">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="text-sm font-medium text-navy-800">{a.label}</span>
              </div>
            );
          })}
        </Card>
      </section>

      {/* Location */}
      <section className="container-wide grid gap-6 pb-20 lg:grid-cols-[1fr_1.4fr]">
        <Card className="p-6">
          <Badge tone="marine" className="mb-3">
            {t('apartmentsPage.locationTitle')}
          </Badge>
          <h3 className="heading-display text-2xl">{t('apartmentsPage.badge')}</h3>
          <p className="mt-2 text-sm text-navy-500">{t('apartmentsPage.locationBody')}</p>
          <ul className="mt-5 space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-navy-700" /> {t('apartmentsPage.locationAddress')}
            </li>
            <li className="flex items-center gap-2">
              <Waves className="h-4 w-4 text-navy-700" /> 0 m {t('apartmentsPage.amenityHarbor').toLowerCase()}
            </li>
            <li className="flex items-center gap-2">
              <ParkingCircle className="h-4 w-4 text-navy-700" /> {t('apartmentsPage.amenityParking')}
            </li>
          </ul>
          <Link href={`/${locale}/contact`} className="mt-6 inline-block">
            <Button variant="outline">{t('apartmentsPage.infoCta')}</Button>
          </Link>
        </Card>
        <Card className="overflow-hidden p-0">
          <iframe
            title="Google Maps"
            src={companyInfo.mapsEmbed}
            className="h-full min-h-[320px] w-full"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </Card>
      </section>
    </>
  );
}

function ApartmentCard({
  number,
  image,
  title,
  description,
  guests,
}: {
  number: string;
  image: string;
  title: string;
  description: string;
  guests: number;
}) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="relative aspect-[5/4] w-full overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${image})` }}
          aria-hidden
        />
        <div className="absolute left-4 top-4">
          <Badge tone="navy">№ {number}</Badge>
        </div>
      </div>
      <div className="p-6">
        <h3 className="text-lg font-semibold text-navy-900">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-navy-500">{description}</p>
        <div className="mt-4 flex items-center gap-3 text-xs text-navy-500">
          <span className="inline-flex items-center gap-1">
            <Users className="h-3.5 w-3.5" /> {guests}
          </span>
          <span className="inline-flex items-center gap-1">
            <Waves className="h-3.5 w-3.5" /> Maasplassen
          </span>
        </div>
      </div>
    </Card>
  );
}
