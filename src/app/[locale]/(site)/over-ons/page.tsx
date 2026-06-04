"use client";

import Link from "next/link";
import {
  ArrowRight,
  Award,
  Calendar,
  Clock,
  Heart,
  Leaf,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useIntl } from "@/i18n/IntlProvider";
import { companyInfo } from "@/lib/company";

const VALUES = [
  { key: "craft", icon: Wrench },
  { key: "safe", icon: ShieldCheck },
  { key: "personal", icon: Heart },
  { key: "sustainable", icon: Leaf },
] as const;

const TIMELINE = [
  { year: "1972", key: "start" },
  { year: "1989", key: "crane" },
  { year: "2004", key: "brokerage" },
  { year: "2018", key: "apartments" },
  { year: "2026", key: "digital" },
] as const;

const TEAM = [
  {
    name: "Peter Krekelberg",
    role: "Werfdirecteur",
    img: "/img/krek/werf-hero.webp",
  },
  {
    name: "Michael Schepenkring",
    role: "Verkoopmakelaar",
    img: "/img/krek/verkoop-schip.webp",
  },
  {
    name: "Lisa van Houten",
    role: "Officeplanner",
    img: "/img/krek/jachthaven.webp",
  },
  {
    name: "Mark de Vries",
    role: "Kraanmeester",
    img: "/img/krek/kranen-hero.webp",
  },
] as const;

export default function OverOnsPage() {
  const { t, locale } = useIntl();

  return (
    <>
      {/* ───────── Hero ───────── */}
      <section className="relative isolate overflow-hidden bg-navy-950">
        <div
          aria-hidden
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url(/img/krek/jachthaven.webp)" }}
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-r from-navy-950/90 via-navy-950/70 to-navy-950/40"
        />
        <div className="container-wide relative pb-20 pt-16 text-white sm:pb-28 sm:pt-24 lg:pb-32 lg:pt-28">
          <Badge tone="sand" dot className="mb-4">
            {t("over.heroBadge")}
          </Badge>
          <h1 className="heading-display max-w-2xl text-4xl text-white sm:text-5xl">
            {t("over.heroTitle")}
          </h1>
          <p className="mt-4 max-w-xl text-sand-100/85">
            {t("over.heroSubtitle")}
          </p>
        </div>
      </section>

      {/* ───────── Stats row ───────── */}
      <section className="container-wide mt-10 grid gap-3 pb-10 sm:grid-cols-4">
        {[
          { v: "52", k: "years" },
          { v: "200+", k: "storage" },
          { v: "10.000 m²", k: "yard" },
          { v: "60+", k: "sale" },
        ].map((s) => (
          <Card key={s.k} className="p-5">
            <div className="text-2xl font-semibold text-navy-900">{s.v}</div>
            <div className="mt-1 text-[11px] font-semibold uppercase tracking-widest text-navy-400">
              {t(`over.stats.${s.k}`)}
            </div>
          </Card>
        ))}
      </section>

      {/* ───────── Story 1 (photo left / text right) ───────── */}
      <section className="bg-white py-20">
        <div className="container-wide grid gap-10 lg:grid-cols-[1fr_1.15fr] lg:items-center">
          <div
            className="aspect-[5/4] w-full overflow-hidden rounded-2xl bg-cover bg-center shadow-card"
            style={{ backgroundImage: "url(/img/krek/werf-hero.webp)" }}
          />
          <div>
            <Badge tone="navy" className="mb-3">
              {t("over.storyBadge")}
            </Badge>
            <h2 className="heading-display text-3xl text-navy-900 sm:text-4xl">
              {t("over.storyTitle")}
            </h2>
            <p className="mt-4 leading-relaxed text-navy-600">
              {t("over.story1")}
            </p>
            <p className="mt-3 leading-relaxed text-navy-600">
              {t("over.story2")}
            </p>
            <div className="mt-6 flex items-center gap-3 rounded-xl border border-navy-100 bg-sand-50/50 p-4">
              <Award className="h-5 w-5 shrink-0 text-gold-600" />
              <div>
                <div className="text-sm font-semibold text-navy-900">
                  {t("over.hiswaTitle")}
                </div>
                <div className="text-xs text-navy-500">
                  {t("over.hiswaDesc")}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───────── Story 2 (text left / photo right) — werf in eigen beheer ───────── */}
      <section className="container-wide grid gap-10 py-20 lg:grid-cols-[1.15fr_1fr] lg:items-center">
        <div className="order-2 lg:order-1">
          <Badge tone="marine" className="mb-3">
            {t("over.craftBadge")}
          </Badge>
          <h2 className="heading-display text-3xl text-navy-900 sm:text-4xl">
            {t("over.craftTitle")}
          </h2>
          <p className="mt-4 leading-relaxed text-navy-600">
            {t("over.craft1")}
          </p>
          <p className="mt-3 leading-relaxed text-navy-600">
            {t("over.craft2")}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={`/${locale}/diensten`}>
              <Button
                variant="primary"
                rightIcon={<ArrowRight className="h-4 w-4" />}
              >
                {t("over.ctaServices")}
              </Button>
            </Link>
            <Link href={`/${locale}/kraanafspraak`}>
              <Button variant="outline">{t("over.ctaCrane")}</Button>
            </Link>
          </div>
        </div>
        <div
          className="order-1 aspect-[5/4] w-full overflow-hidden rounded-2xl bg-cover bg-center shadow-card lg:order-2"
          style={{ backgroundImage: "url(/img/krek/boot-kranen.webp)" }}
        />
      </section>

      {/* ───────── Values ───────── */}
      <section className="bg-white py-20">
        <div className="container-wide">
          <div className="mb-8 max-w-xl">
            <Badge tone="gold" className="mb-3">
              {t("over.valuesBadge")}
            </Badge>
            <h2 className="heading-display text-3xl text-navy-900 sm:text-4xl">
              {t("over.valuesTitle")}
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {VALUES.map((v) => {
              const Icon = v.icon;
              return (
                <div
                  key={v.key}
                  className="rounded-xl border border-navy-100 bg-sand-50/40 p-6"
                >
                  <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-marine-50 text-marine-700">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="text-base font-semibold text-navy-900">
                    {t(`over.values.${v.key}.title`)}
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-navy-500">
                    {t(`over.values.${v.key}.desc`)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ───────── Timeline ───────── */}
      <section className="container-wide py-20">
        <div className="mb-8 max-w-xl">
          <Badge tone="navy" className="mb-3">
            {t("over.timelineBadge")}
          </Badge>
          <h2 className="heading-display text-3xl text-navy-900 sm:text-4xl">
            {t("over.timelineTitle")}
          </h2>
        </div>
        <ol className="relative grid gap-4 lg:grid-cols-5">
          <div
            className="pointer-events-none absolute left-0 right-0 top-[26px] hidden h-px bg-navy-100 lg:block"
            aria-hidden
          />
          {TIMELINE.map((t1) => (
            <li key={t1.year} className="relative">
              <div className="mx-auto flex h-[52px] w-[52px] items-center justify-center rounded-full border border-navy-100 bg-white text-sm font-semibold text-navy-900 shadow-card lg:mx-0">
                {t1.year}
              </div>
              <div className="mt-4 text-sm font-semibold text-navy-900">
                {t(`over.timeline.${t1.key}.title`)}
              </div>
              <p className="mt-1 text-xs leading-relaxed text-navy-500">
                {t(`over.timeline.${t1.key}.desc`)}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {/* ───────── Team ───────── */}
      <section className="bg-white py-20">
        <div className="container-wide">
          <div className="mb-8 max-w-xl">
            <Badge tone="marine" className="mb-3">
              {t("over.teamBadge")}
            </Badge>
            <h2 className="heading-display text-3xl text-navy-900 sm:text-4xl">
              {t("over.teamTitle")}
            </h2>
            <p className="mt-2 text-sm text-navy-500">
              {t("over.teamSubtitle")}
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {TEAM.map((m) => (
              <div
                key={m.name}
                className="overflow-hidden rounded-xl border border-navy-100 bg-white"
              >
                <div
                  className="aspect-[4/5] w-full bg-cover bg-center"
                  style={{ backgroundImage: `url(${m.img})` }}
                />
                <div className="p-4">
                  <div className="text-sm font-semibold text-navy-900">
                    {m.name}
                  </div>
                  <div className="text-xs text-navy-500">{m.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── Visit / contact ───────── */}
      <section className="container-wide grid gap-6 pb-20 pt-10 lg:grid-cols-[1fr_1.2fr]">
        <div className="rounded-2xl border border-navy-100 bg-white p-6">
          <Badge tone="navy" className="mb-3">
            {t("over.visitBadge")}
          </Badge>
          <h3 className="heading-display text-2xl text-navy-900">
            {t("over.visitTitle")}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-navy-600">
            {t("over.visitBody")}
          </p>
          <ul className="mt-5 space-y-3 text-sm text-navy-700">
            <li className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-marine-700" />
              {companyInfo.address}
            </li>
            <li className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-marine-700" />
              <a href={companyInfo.phoneHref} className="hover:text-navy-900">
                {companyInfo.phone}
              </a>
            </li>
            <li className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-marine-700" />
              <a
                href={companyInfo.emailHref}
                className="hover:text-navy-900"
              >
                {companyInfo.email}
              </a>
            </li>
            <li className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-marine-700" />
              {t("over.hours")}
            </li>
          </ul>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link href={`/${locale}/contact`}>
              <Button
                variant="primary"
                rightIcon={<ArrowRight className="h-4 w-4" />}
              >
                {t("over.makeAppointment")}
              </Button>
            </Link>
            <Link href={`/${locale}/planning`}>
              <Button
                variant="outline"
                leftIcon={<Calendar className="h-4 w-4" />}
              >
                {t("over.viewPlanning")}
              </Button>
            </Link>
          </div>
        </div>

        {/* Map placeholder using brand photo */}
        <div
          className="rounded-2xl border border-navy-100 bg-cover bg-center shadow-card"
          style={{
            minHeight: 320,
            backgroundImage: "url(/img/krek/jachthaven.webp)",
          }}
          aria-label={t("over.mapAlt")}
        />
      </section>
    </>
  );
}
