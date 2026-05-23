"use client";

import Link from "next/link";
import {
  Anchor,
  ArrowRight,
  Award,
  Clock,
  Droplets,
  Hammer,
  Hotel,
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
  {
    key: "apartments",
    href: "/appartementen",
    img: "/img/krek/appartement.webp",
    icon: Hotel,
  },
] as const;

export default function HomePage() {
  const { t, locale } = useIntl();

  return (
    <>
      {/* ---------- Hero ---------- */}
      <section className="relative isolate overflow-hidden bg-navy-950">
        <div
          aria-hidden
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url(/img/krek/werf-hero.webp)" }}
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-r from-navy-950/95 via-navy-950/75 to-navy-950/35"
        />
        <div className="container-wide relative pb-24 pt-20 text-white sm:pb-32 sm:pt-28 lg:pb-40 lg:pt-36">
          <Badge tone="sand" dot className="mb-5">
            {t("home.heroBadge")}
          </Badge>
          <h1 className="heading-display max-w-2xl text-4xl text-white sm:text-5xl lg:text-6xl">
            {t("home.heroTitle")}
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-sand-100/85">
            {t("home.heroSubtitle")}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={`/${locale}/kraanafspraak`}>
              <Button
                variant="gold"
                size="lg"
                rightIcon={<ArrowRight className="h-4 w-4" />}
              >
                {t("home.heroPrimary")}
              </Button>
            </Link>
            <Link href={`/${locale}/diensten`}>
              <Button
                variant="outline"
                size="lg"
                className="border-white/30 bg-white/5 text-white hover:bg-white/10"
              >
                {t("home.heroSecondary")}
              </Button>
            </Link>
          </div>

          <div className="mt-12 flex max-w-3xl flex-wrap items-center gap-x-7 gap-y-3 text-sm text-sand-100/80">
            <Trust icon={Award}>{t("home.trustExperience")}</Trust>
            <Trust icon={Ship}>{t("home.trustCrane")}</Trust>
            <Trust icon={Warehouse}>{t("home.trustStorage")}</Trust>
            <Trust icon={Anchor}>{t("home.trustSale")}</Trust>
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
              {t("home.servicesBadge")}
            </Badge>
            <h2 className="heading-display text-3xl text-navy-900 sm:text-4xl">
              {t("home.servicesTitle")}
            </h2>
            <p className="mt-2 max-w-xl text-sm text-navy-500">
              {t("home.servicesSubtitle")}
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
                    <div
                      className="absolute inset-0 bg-cover bg-center transition duration-500 group-hover:scale-105"
                      style={{ backgroundImage: `url(${s.img})` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-navy-950/85 via-navy-950/30 to-transparent" />
                    <div className="absolute left-4 top-4">
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/95 text-navy-800 backdrop-blur">
                        <Icon className="h-4 w-4" />
                      </span>
                    </div>
                    <div className="absolute bottom-4 left-4 right-4 text-white">
                      <div className="text-lg font-semibold leading-tight">
                        {t(`home.svc.${s.key}.title`)}
                      </div>
                      <div className="mt-1 text-xs text-sand-100/85">
                        {t(`home.svc.${s.key}.tagline`)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-5">
                    <p className="line-clamp-2 text-sm text-navy-600">
                      {t(`home.svc.${s.key}.desc`)}
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
            <div
              className="aspect-[5/4] w-full overflow-hidden rounded-2xl bg-cover bg-center shadow-elev"
              style={{ backgroundImage: "url(/img/krek/boot-kranen.webp)" }}
            />
            <div className="absolute -bottom-6 -right-6 hidden rounded-xl bg-white p-5 shadow-elev lg:block">
              <ShieldCheck className="h-6 w-6 text-gold-500" />
              <div className="mt-2 text-xs font-semibold uppercase tracking-widest text-navy-500">
                {t("home.werf.cert")}
              </div>
              <div className="text-sm font-semibold text-navy-900">
                HISWA · 1972
              </div>
            </div>
          </div>
          <div>
            <Badge tone="marine" className="mb-3">
              {t("home.werf.badge")}
            </Badge>
            <h2 className="heading-display text-3xl text-navy-900 sm:text-4xl">
              {t("home.werf.title")}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-navy-600">
              {t("home.werf.p1")}
            </p>
            <p className="mt-3 text-base leading-relaxed text-navy-600">
              {t("home.werf.p2")}
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
                      {t(`home.werf.bullet.${k}.title`)}
                    </div>
                    <div className="text-xs text-navy-500">
                      {t(`home.werf.bullet.${k}.desc`)}
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
                  {t("home.werf.cta")}
                </Button>
              </Link>
              <Link href={`/${locale}/kraanafspraak`}>
                <Button variant="outline">{t("home.werf.book")}</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Verkoop uw boot (Schepenkring) ---------- */}
      <section className="container-wide py-20">
        <div className="overflow-hidden rounded-2xl border border-navy-100 bg-white shadow-card">
          <div className="grid gap-0 lg:grid-cols-[1.1fr_1fr]">
            <div
              className="relative aspect-[5/3] bg-cover bg-center lg:aspect-auto"
              style={{ backgroundImage: "url(/img/krek/verkoop-schip.webp)" }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-navy-950/65 via-navy-950/10 to-transparent" />
            </div>
            <div className="p-8 sm:p-12">
              <Badge tone="navy" className="mb-3">
                {t("home.sale.badge")}
              </Badge>
              <h2 className="heading-display text-3xl text-navy-900 sm:text-4xl">
                {t("home.sale.title")}
              </h2>
              <p className="mt-3 text-base leading-relaxed text-navy-600">
                {t("home.sale.body")}
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
                    {t("home.sale.cta")}
                  </Button>
                </a>
                <Link href={`/${locale}/verkoop`}>
                  <Button variant="outline">{t("home.sale.sell")}</Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Appartementen + Contact split ---------- */}
      <section className="container-wide grid gap-6 pb-20 lg:grid-cols-2">
        <Card className="overflow-hidden p-0">
          <div
            className="aspect-[16/10] w-full bg-cover bg-center"
            style={{ backgroundImage: "url(/img/krek/appartement.webp)" }}
          />
          <div className="p-6">
            <Badge tone="gold" className="mb-3">
              {t("home.apartments.badge")}
            </Badge>
            <h3 className="heading-display text-2xl text-navy-900">
              {t("home.apartments.title")}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-navy-600">
              {t("home.apartments.body")}
            </p>
            <Link
              href={`/${locale}/appartementen`}
              className="mt-5 inline-block"
            >
              <Button
                variant="primary"
                rightIcon={<ArrowRight className="h-4 w-4" />}
              >
                {t("home.apartments.cta")}
              </Button>
            </Link>
          </div>
        </Card>

        <Card className="overflow-hidden p-0">
          <div
            className="aspect-[16/10] w-full bg-cover bg-center"
            style={{ backgroundImage: "url(/img/krek/jachthaven.webp)" }}
          />
          <div className="p-6">
            <Badge tone="marine" className="mb-3">
              {t("home.contact.badge")}
            </Badge>
            <h3 className="heading-display text-2xl text-navy-900">
              {t("home.contact.title")}
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm text-navy-700">
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-marine-700" /> Mr. Hartelaan 1,
                6045 EM Roermond
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-marine-700" /> 0475 32 22 75
              </li>
              <li className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-marine-700" />{" "}
                {t("home.contact.hours")}
              </li>
            </ul>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href={`/${locale}/contact`}>
                <Button
                  variant="primary"
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                >
                  {t("home.contact.cta")}
                </Button>
              </Link>
              <Link href={`/${locale}/planning`}>
                <Button variant="outline">{t("home.contact.planning")}</Button>
              </Link>
            </div>
          </div>
        </Card>
      </section>

      {/* ---------- Final CTA strip ---------- */}
      <section className="container-wide pb-24">
        <div className="relative overflow-hidden rounded-2xl bg-navy-950 px-8 py-12 text-white sm:px-12">
          <div
            aria-hidden
            className="absolute inset-0 bg-cover bg-center opacity-25"
            style={{ backgroundImage: "url(/img/krek/jachthaven.webp)" }}
          />
          <div className="relative grid gap-6 lg:grid-cols-[2fr_1fr] lg:items-center">
            <div>
              <Badge tone="sand" dot className="mb-3">
                {t("home.cta.badge")}
              </Badge>
              <h3 className="heading-display text-2xl text-white sm:text-3xl">
                {t("home.cta.title")}
              </h3>
              <p className="mt-2 max-w-xl text-sm text-sand-100/80">
                {t("home.cta.subtitle")}
              </p>
            </div>
            <div className="flex flex-wrap gap-3 lg:justify-end">
              <Link href={`/${locale}/kraanafspraak`}>
                <Button
                  variant="gold"
                  size="lg"
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                >
                  {t("home.cta.primary")}
                </Button>
              </Link>
              <Link href={`/${locale}/contact`}>
                <Button
                  variant="outline"
                  size="lg"
                  className="border-white/30 bg-white/5 text-white hover:bg-white/10"
                >
                  {t("home.cta.secondary")}
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
