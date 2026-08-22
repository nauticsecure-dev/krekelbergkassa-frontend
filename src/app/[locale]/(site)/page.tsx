"use client";

import Link from "next/link";
import {
  Anchor,
  ArrowRight,
  Award,
  Clock,
  Droplets,
  Hammer,
  MapPin,
  Phone,
  Ship,
  ShieldCheck,
  Warehouse,
  Wrench,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useIntl } from "@/i18n/IntlProvider";
import { companyInfo } from "@/lib/company";
import { useRegisterCmsPage } from "@/components/cms/CmsProvider";
import { EditableText } from "@/components/cms/EditableText";
import { EditableImage } from "@/components/cms/EditableImage";

const CMS_PAGE = "home";

const SERVICES = [
  {
    key: "crane",
    href: "/kraanafspraak",
    img: "/img/krek/kranen-hero.webp",
    icon: Ship,
  },
  {
    key: "wash",
    href: "/diensten/afspuiten",
    img: "/img/krek/portaalkraan.webp",
    icon: Droplets,
  },
  {
    key: "storage",
    href: "/diensten/winterstalling",
    img: "/img/krek/winterstalling.webp",
    icon: Warehouse,
  },
  {
    key: "diy",
    href: "/diensten/zelf-werken",
    img: "/img/krek/werkzaamheden.webp",
    icon: Hammer,
  },
  {
    key: "sale",
    href: "/verkoop",
    img: "/img/krek/verkoop-schip.webp",
    icon: Anchor,
  },
] as const;

export default function HomePage() {
  const { t, locale } = useIntl();
  useRegisterCmsPage(CMS_PAGE);

  return (
    <>
      {/* ---------- Hero ---------- */}
      <section className="relative isolate overflow-hidden bg-navy-950">
        <div className="absolute inset-0 overflow-hidden">
          <EditableImage
            blockKey="home.hero.image"
            page={CMS_PAGE}
            fallbackSrc="/img/krek/werf-hero.webp"
            alt="Krekelberg Nautic jachtwerf"
            className="h-full w-full"
          />
        </div>
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-r from-navy-950/95 via-navy-950/75 to-navy-950/35"
        />
        <div className="container-wide relative pb-24 pt-20 text-white sm:pb-32 sm:pt-28 lg:pb-40 lg:pt-36">
          <Badge tone="sand" dot className="mb-5">
            <EditableText blockKey="home.hero.badge" page={CMS_PAGE} section="hero">
              {t("home.heroBadge")}
            </EditableText>
          </Badge>
          <h1 className="heading-display max-w-2xl text-4xl text-white sm:text-5xl lg:text-6xl">
            <EditableText blockKey="home.hero.title" page={CMS_PAGE} section="hero">
              {t("home.heroTitle")}
            </EditableText>
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-sand-100/85">
            <EditableText blockKey="home.hero.subtitle" page={CMS_PAGE} section="hero" type="long_text">
              {t("home.heroSubtitle")}
            </EditableText>
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={`/${locale}/kraanafspraak`}>
              <Button
                variant="gold"
                size="lg"
                rightIcon={<ArrowRight className="h-4 w-4" />}
              >
                <EditableText blockKey="home.hero.cta_primary" page={CMS_PAGE} section="hero">
                  {t("home.heroPrimary")}
                </EditableText>
              </Button>
            </Link>
            <Link href={`/${locale}/diensten`}>
              <Button
                variant="outline"
                size="lg"
                className="border-white/30 bg-white/5 text-white hover:bg-white/10"
              >
                <EditableText blockKey="home.hero.cta_secondary" page={CMS_PAGE} section="hero">
                  {t("home.heroSecondary")}
                </EditableText>
              </Button>
            </Link>
          </div>

          <div className="mt-12 flex max-w-3xl flex-wrap items-center gap-x-7 gap-y-3 text-sm text-sand-100/80">
            <Trust icon={Award}>
              <EditableText blockKey="home.trust.experience" page={CMS_PAGE} section="trust">
                {t("home.trustExperience")}
              </EditableText>
            </Trust>
            <Trust icon={Ship}>
              <EditableText blockKey="home.trust.crane" page={CMS_PAGE} section="trust">
                {t("home.trustCrane")}
              </EditableText>
            </Trust>
            <Trust icon={Warehouse}>
              <EditableText blockKey="home.trust.storage" page={CMS_PAGE} section="trust">
                {t("home.trustStorage")}
              </EditableText>
            </Trust>
            <Trust icon={Anchor}>
              <EditableText blockKey="home.trust.sale" page={CMS_PAGE} section="trust">
                {t("home.trustSale")}
              </EditableText>
            </Trust>
          </div>
        </div>
      </section>

      {/* ---------- Stats strip (overlapping cards) ---------- */}
      {/* <section className="container-wide mt-12 grid gap-4 sm:grid-cols-3 lg:mt-16">
        <StatCard big="52" label={t("home.stats.years")} />
        <StatCard big="200+" label={t("home.stats.storage")} />
        <StatCard big="30 t" label={t("home.stats.crane")} />
      </section> */}

      {/* ---------- Diensten grid ---------- */}
      <section className="container-wide py-20">
        <div className="mb-10 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <Badge tone="gold" className="mb-3">
              <EditableText blockKey="home.services.badge" page={CMS_PAGE} section="services">
                {t("home.servicesBadge")}
              </EditableText>
            </Badge>
            <h2 className="heading-display text-3xl text-navy-900 sm:text-4xl">
              <EditableText blockKey="home.services.title" page={CMS_PAGE} section="services">
                {t("home.servicesTitle")}
              </EditableText>
            </h2>
            <p className="mt-2 max-w-xl text-sm text-navy-500">
              <EditableText blockKey="home.services.subtitle" page={CMS_PAGE} section="services" type="long_text">
                {t("home.servicesSubtitle")}
              </EditableText>
            </p>
          </div>
          <Link
            href={`/${locale}/diensten`}
            className="inline-flex items-center gap-1 text-sm font-semibold text-navy-700 hover:text-marine-700"
          >
            {t("home.servicesAll")}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((s) => {
            const Icon = s.icon;
            return (
              <Link key={s.key} href={`/${locale}${s.href}`}>
                <Card className="group h-full overflow-hidden p-0 transition hover:-translate-y-0.5 hover:shadow-elev">
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <EditableImage
                      blockKey={`home.svc.${s.key}.image`}
                      page={CMS_PAGE}
                      fallbackSrc={s.img}
                      alt={t(`home.svc.${s.key}.title`)}
                      className="absolute inset-0 transition duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-navy-950/85 via-navy-950/30 to-transparent" />
                    <div className="absolute left-4 top-4">
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/95 text-navy-800 backdrop-blur">
                        <Icon className="h-4 w-4" />
                      </span>
                    </div>
                    <div className="absolute bottom-4 left-4 right-4 text-white">
                      <div className="text-lg font-semibold leading-tight">
                        <EditableText blockKey={`home.svc.${s.key}.title`} page={CMS_PAGE} section="services">
                          {t(`home.svc.${s.key}.title`)}
                        </EditableText>
                      </div>
                      <div className="mt-1 text-xs text-sand-100/85">
                        <EditableText blockKey={`home.svc.${s.key}.tagline`} page={CMS_PAGE} section="services">
                          {t(`home.svc.${s.key}.tagline`)}
                        </EditableText>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-5">
                    <p className="line-clamp-2 text-sm text-navy-600">
                      <EditableText blockKey={`home.svc.${s.key}.desc`} page={CMS_PAGE} section="services" type="paragraph">
                        {t(`home.svc.${s.key}.desc`)}
                      </EditableText>
                    </p>
                    <ArrowRight className="ml-3 h-4 w-4 shrink-0 text-navy-300 transition group-hover:translate-x-0.5 group-hover:text-navy-700" />
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ---------- Werfactiviteiten feature row ---------- */}
      <section className="bg-white py-20">
        <div className="container-wide grid gap-10 lg:grid-cols-[1fr_1.05fr] lg:items-center">
          <div className="relative">
            <div className="aspect-[5/4] w-full overflow-hidden rounded-2xl shadow-elev">
              <EditableImage
                blockKey="home.werf.image"
                page={CMS_PAGE}
                fallbackSrc="/img/krek/boot-kranen.webp"
                alt="Boot kranen op de werf van Krekelberg Nautic"
                className="h-full w-full"
              />
            </div>
            <div className="absolute -bottom-6 -right-6 hidden rounded-xl bg-white p-5 shadow-elev lg:block">
              <ShieldCheck className="h-6 w-6 text-gold-500" />
              <div className="mt-2 text-xs font-semibold uppercase tracking-widest text-navy-500">
                <EditableText blockKey="home.werf.cert" page={CMS_PAGE} section="werf">
                  {t("home.werf.cert")}
                </EditableText>
              </div>
              <div className="text-sm font-semibold text-navy-900">
                <EditableText blockKey="home.werf.cert_sub" page={CMS_PAGE} section="werf">
                  HISWA · 1976
                </EditableText>
              </div>
            </div>
          </div>
          <div>
            <Badge tone="marine" className="mb-3">
              <EditableText blockKey="home.werf.badge" page={CMS_PAGE} section="werf">
                {t("home.werf.badge")}
              </EditableText>
            </Badge>
            <h2 className="heading-display text-3xl text-navy-900 sm:text-4xl">
              <EditableText blockKey="home.werf.title" page={CMS_PAGE} section="werf">
                {t("home.werf.title")}
              </EditableText>
            </h2>
            <p className="mt-4 text-base leading-relaxed text-navy-600">
              <EditableText blockKey="home.werf.p1" page={CMS_PAGE} section="werf" type="long_text">
                {t("home.werf.p1")}
              </EditableText>
            </p>
            <p className="mt-3 text-base leading-relaxed text-navy-600">
              <EditableText blockKey="home.werf.p2" page={CMS_PAGE} section="werf" type="long_text">
                {t("home.werf.p2")}
              </EditableText>
            </p>
            <ul className="mt-6 grid gap-2.5 sm:grid-cols-2">
              {(["lift", "wash", "storage", "diy"] as const).map((k) => (
                <li
                  key={k}
                  className="flex items-start gap-3 rounded-xl border border-navy-100 bg-sand-50/50 p-3"
                >
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-marine-50 text-marine-700">
                    {k === "lift" && <Ship className="h-4 w-4" />}
                    {k === "wash" && <Droplets className="h-4 w-4" />}
                    {k === "storage" && <Warehouse className="h-4 w-4" />}
                    {k === "diy" && <Wrench className="h-4 w-4" />}
                  </span>
                  <div>
                    <div className="text-sm font-semibold text-navy-900">
                      <EditableText blockKey={`home.werf.bullet.${k}.title`} page={CMS_PAGE} section="werf">
                        {t(`home.werf.bullet.${k}.title`)}
                      </EditableText>
                    </div>
                    <div className="text-xs text-navy-500">
                      <EditableText blockKey={`home.werf.bullet.${k}.desc`} page={CMS_PAGE} section="werf" type="paragraph">
                        {t(`home.werf.bullet.${k}.desc`)}
                      </EditableText>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href={`/${locale}/diensten`}>
                <Button
                  variant="primary"
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                >
                  <EditableText blockKey="home.werf.cta" page={CMS_PAGE} section="werf">
                    {t("home.werf.cta")}
                  </EditableText>
                </Button>
              </Link>
              <Link href={`/${locale}/kraanafspraak`}>
                <Button variant="outline">
                  <EditableText blockKey="home.werf.book" page={CMS_PAGE} section="werf">
                    {t("home.werf.book")}
                  </EditableText>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Verkoop uw boot (Schepenkring) ---------- */}
      <section className="container-wide py-20">
        <div className="overflow-hidden rounded-2xl border border-navy-100 bg-white shadow-card">
          <div className="grid gap-0 lg:grid-cols-[1.1fr_1fr]">
            <div className="relative aspect-[5/3] overflow-hidden lg:aspect-auto">
              <div className="absolute inset-0 overflow-hidden">
                <EditableImage
                  blockKey="home.sale.image"
                  page={CMS_PAGE}
                  fallbackSrc="/img/krek/verkoop-schip.webp"
                  alt="Boot te koop via Krekelberg Nautic"
                  className="h-full w-full"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-navy-950/65 via-navy-950/10 to-transparent" />
            </div>
            <div className="p-8 sm:p-12">
              <Badge tone="navy" className="mb-3">
                <EditableText blockKey="home.sale.badge" page={CMS_PAGE} section="sale">
                  {t("home.sale.badge")}
                </EditableText>
              </Badge>
              <h2 className="heading-display text-3xl text-navy-900 sm:text-4xl">
                <EditableText blockKey="home.sale.title" page={CMS_PAGE} section="sale">
                  {t("home.sale.title")}
                </EditableText>
              </h2>
              <p className="mt-3 text-base leading-relaxed text-navy-600">
                <EditableText blockKey="home.sale.body" page={CMS_PAGE} section="sale" type="long_text">
                  {t("home.sale.body")}
                </EditableText>
              </p>
              <div className="mt-6 grid grid-cols-3 gap-3">
                <Mini big="60+" label={t("home.sale.statShips")} />
                <Mini big="3-6 mnd" label={t("home.sale.statTime")} />
                <Mini big="100%" label={t("home.sale.statTrust")} />
              </div>
              <div className="mt-7 flex flex-wrap gap-3">
                <a
                  href="https://www.schepenkring.nl/aanbod-boten/?kantoor=Roermond"
                  target="_blank"
                  rel="noreferrer"
                >
                  <Button
                    variant="primary"
                    rightIcon={<ArrowRight className="h-4 w-4" />}
                  >
                    <EditableText blockKey="home.sale.cta" page={CMS_PAGE} section="sale">
                      {t("home.sale.cta")}
                    </EditableText>
                  </Button>
                </a>
                <Link href={`/${locale}/verkoop`}>
                  <Button variant="outline">
                    <EditableText blockKey="home.sale.sell" page={CMS_PAGE} section="sale">
                      {t("home.sale.sell")}
                    </EditableText>
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Contact ---------- */}
      <section className="container-wide pb-20">
        <Card className="overflow-hidden p-0">
          <div className="aspect-[16/10] w-full overflow-hidden">
            <EditableImage
              blockKey="home.contact.image"
              page={CMS_PAGE}
              fallbackSrc="/img/krek/jachthaven.webp"
              alt="Jachthaven Krekelberg Nautic Roermond"
              className="h-full w-full"
            />
          </div>
          <div className="p-6">
            <Badge tone="marine" className="mb-3">
              <EditableText blockKey="home.contact.badge" page={CMS_PAGE} section="contact">
                {t("home.contact.badge")}
              </EditableText>
            </Badge>
            <h3 className="heading-display text-2xl text-navy-900">
              <EditableText blockKey="home.contact.title" page={CMS_PAGE} section="contact">
                {t("home.contact.title")}
              </EditableText>
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm text-navy-700">
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-marine-700" /> {companyInfo.address}
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-marine-700" />{" "}
                <a href={companyInfo.phoneHref} className="hover:text-navy-900">
                  {companyInfo.phone}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-marine-700" />{" "}
                <EditableText blockKey="home.contact.hours" page={CMS_PAGE} section="contact">
                  {t("home.contact.hours")}
                </EditableText>
              </li>
            </ul>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href={`/${locale}/contact`}>
                <Button
                  variant="primary"
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                >
                  <EditableText blockKey="home.contact.cta" page={CMS_PAGE} section="contact">
                    {t("home.contact.cta")}
                  </EditableText>
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </section>

      {/* ---------- Final CTA strip ---------- */}
      <section className="container-wide pb-24">
        <div className="relative overflow-hidden rounded-2xl bg-navy-950 px-8 py-12 text-white sm:px-12">
          <div aria-hidden className="absolute inset-0 opacity-25">
            <EditableImage
              blockKey="home.cta.image"
              page={CMS_PAGE}
              fallbackSrc="/img/krek/jachthaven.webp"
              alt=""
              className="h-full w-full"
            />
          </div>
          <div className="relative grid gap-6 lg:grid-cols-[2fr_1fr] lg:items-center">
            <div>
              <Badge tone="sand" dot className="mb-3">
                <EditableText blockKey="home.cta.badge" page={CMS_PAGE} section="cta">
                  {t("home.cta.badge")}
                </EditableText>
              </Badge>
              <h3 className="heading-display text-2xl text-white sm:text-3xl">
                <EditableText blockKey="home.cta.title" page={CMS_PAGE} section="cta">
                  {t("home.cta.title")}
                </EditableText>
              </h3>
              <p className="mt-2 max-w-xl text-sm text-sand-100/80">
                <EditableText blockKey="home.cta.subtitle" page={CMS_PAGE} section="cta" type="long_text">
                  {t("home.cta.subtitle")}
                </EditableText>
              </p>
            </div>
            <div className="flex flex-wrap gap-3 lg:justify-end">
              <Link href={`/${locale}/kraanafspraak`}>
                <Button
                  variant="gold"
                  size="lg"
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                >
                  <EditableText blockKey="home.cta.primary" page={CMS_PAGE} section="cta">
                    {t("home.cta.primary")}
                  </EditableText>
                </Button>
              </Link>
              <Link href={`/${locale}/contact`}>
                <Button
                  variant="outline"
                  size="lg"
                  className="border-white/30 bg-white/5 text-white hover:bg-white/10"
                >
                  <EditableText blockKey="home.cta.secondary" page={CMS_PAGE} section="cta">
                    {t("home.cta.secondary")}
                  </EditableText>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function Trust({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <Icon className="h-3.5 w-3.5 text-gold-300" />
      {children}
    </span>
  );
}

function Mini({ big, label }: { big: string; label: string }) {
  return (
    <div className="rounded-lg border border-navy-100 bg-sand-50/40 p-3">
      <div className="text-lg font-semibold text-navy-900">{big}</div>
      <div className="text-[11px] text-navy-500">{label}</div>
    </div>
  );
}
