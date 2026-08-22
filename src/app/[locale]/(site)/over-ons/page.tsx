"use client";

import Link from "next/link";
import {
  ArrowRight,
  Award,
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
import { useRegisterCmsPage } from "@/components/cms/CmsProvider";
import { EditableText } from "@/components/cms/EditableText";
import { EditableImage } from "@/components/cms/EditableImage";

const CMS_PAGE = "over-ons";

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
  useRegisterCmsPage(CMS_PAGE);

  return (
    <>
      {/* ───────── Hero ───────── */}
      <section className="relative isolate overflow-hidden bg-navy-950">
        <div className="absolute inset-0 overflow-hidden">
          <EditableImage
            blockKey="over-ons.hero.image"
            page={CMS_PAGE}
            fallbackSrc="/img/krek/jachthaven.webp"
            alt="Over ons hero"
            className="h-full w-full"
          />
        </div>
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-r from-navy-950/90 via-navy-950/70 to-navy-950/40"
        />
        <div className="container-wide relative pb-20 pt-16 text-white sm:pb-28 sm:pt-24 lg:pb-32 lg:pt-28">
          <Badge tone="sand" dot className="mb-4">
            <EditableText blockKey="over-ons.hero.badge" page={CMS_PAGE} section="hero">
              {t("over.heroBadge")}
            </EditableText>
          </Badge>
          <h1 className="heading-display max-w-2xl text-4xl text-white sm:text-5xl">
            <EditableText blockKey="over-ons.hero.title" page={CMS_PAGE} section="hero" type="heading">
              {t("over.heroTitle")}
            </EditableText>
          </h1>
          <p className="mt-4 max-w-xl text-sand-100/85">
            <EditableText blockKey="over-ons.hero.subtitle" page={CMS_PAGE} section="hero" type="paragraph">
              {t("over.heroSubtitle")}
            </EditableText>
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
            <div className="text-2xl font-semibold text-navy-900">
              <EditableText blockKey={`over-ons.stat.${s.k}.value`} page={CMS_PAGE} section="stats">
                {s.v}
              </EditableText>
            </div>
            <div className="mt-1 text-[11px] font-semibold uppercase tracking-widest text-navy-400">
              <EditableText blockKey={`over-ons.stat.${s.k}.label`} page={CMS_PAGE} section="stats">
                {t(`over.stats.${s.k}`)}
              </EditableText>
            </div>
          </Card>
        ))}
      </section>

      {/* ───────── Story 1 (photo left / text right) ───────── */}
      <section className="bg-white py-20">
        <div className="container-wide grid gap-10 lg:grid-cols-[1fr_1.15fr] lg:items-center">
          <EditableImage
            blockKey="over-ons.story.image"
            page={CMS_PAGE}
            fallbackSrc="/img/krek/werf-hero.webp"
            alt="Krekelberg werf"
            className="aspect-[5/4] w-full overflow-hidden rounded-2xl object-cover shadow-card"
          />
          <div>
            <Badge tone="navy" className="mb-3">
              <EditableText blockKey="over-ons.story.badge" page={CMS_PAGE} section="story">
                {t("over.storyBadge")}
              </EditableText>
            </Badge>
            <h2 className="heading-display text-3xl text-navy-900 sm:text-4xl">
              <EditableText blockKey="over-ons.story.title" page={CMS_PAGE} section="story" type="heading">
                {t("over.storyTitle")}
              </EditableText>
            </h2>
            <p className="mt-4 leading-relaxed text-navy-600">
              <EditableText blockKey="over-ons.story.p1" page={CMS_PAGE} section="story" type="paragraph">
                {t("over.story1")}
              </EditableText>
            </p>
            <p className="mt-3 leading-relaxed text-navy-600">
              <EditableText blockKey="over-ons.story.p2" page={CMS_PAGE} section="story" type="paragraph">
                {t("over.story2")}
              </EditableText>
            </p>
            <div className="mt-6 flex items-center gap-3 rounded-xl border border-navy-100 bg-sand-50/50 p-4">
              <Award className="h-5 w-5 shrink-0 text-gold-600" />
              <div>
                <div className="text-sm font-semibold text-navy-900">
                  <EditableText blockKey="over-ons.hiswa.title" page={CMS_PAGE} section="story">
                    {t("over.hiswaTitle")}
                  </EditableText>
                </div>
                <div className="text-xs text-navy-500">
                  <EditableText blockKey="over-ons.hiswa.desc" page={CMS_PAGE} section="story" type="paragraph">
                    {t("over.hiswaDesc")}
                  </EditableText>
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
            <EditableText blockKey="over-ons.craft.badge" page={CMS_PAGE} section="craft">
              {t("over.craftBadge")}
            </EditableText>
          </Badge>
          <h2 className="heading-display text-3xl text-navy-900 sm:text-4xl">
            <EditableText blockKey="over-ons.craft.title" page={CMS_PAGE} section="craft" type="heading">
              {t("over.craftTitle")}
            </EditableText>
          </h2>
          <p className="mt-4 leading-relaxed text-navy-600">
            <EditableText blockKey="over-ons.craft.p1" page={CMS_PAGE} section="craft" type="paragraph">
              {t("over.craft1")}
            </EditableText>
          </p>
          <p className="mt-3 leading-relaxed text-navy-600">
            <EditableText blockKey="over-ons.craft.p2" page={CMS_PAGE} section="craft" type="paragraph">
              {t("over.craft2")}
            </EditableText>
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={`/${locale}/diensten`}>
              <Button
                variant="primary"
                rightIcon={<ArrowRight className="h-4 w-4" />}
              >
                <EditableText blockKey="over-ons.craft.cta_services" page={CMS_PAGE} section="craft">
                  {t("over.ctaServices")}
                </EditableText>
              </Button>
            </Link>
            <Link href={`/${locale}/kraanafspraak`}>
              <Button variant="outline">
                <EditableText blockKey="over-ons.craft.cta_crane" page={CMS_PAGE} section="craft">
                  {t("over.ctaCrane")}
                </EditableText>
              </Button>
            </Link>
          </div>
        </div>
        <EditableImage
          blockKey="over-ons.craft.image"
          page={CMS_PAGE}
          fallbackSrc="/img/krek/boot-kranen.webp"
          alt="Krekelberg ambacht"
          className="order-1 aspect-[5/4] w-full overflow-hidden rounded-2xl object-cover shadow-card lg:order-2"
        />
      </section>

      {/* ───────── Values ───────── */}
      <section className="bg-white py-20">
        <div className="container-wide">
          <div className="mb-8 max-w-xl">
            <Badge tone="gold" className="mb-3">
              <EditableText blockKey="over-ons.values.badge" page={CMS_PAGE} section="values">
                {t("over.valuesBadge")}
              </EditableText>
            </Badge>
            <h2 className="heading-display text-3xl text-navy-900 sm:text-4xl">
              <EditableText blockKey="over-ons.values.title" page={CMS_PAGE} section="values" type="heading">
                {t("over.valuesTitle")}
              </EditableText>
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
                    <EditableText blockKey={`over-ons.value.${v.key}.title`} page={CMS_PAGE} section="values">
                      {t(`over.values.${v.key}.title`)}
                    </EditableText>
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-navy-500">
                    <EditableText blockKey={`over-ons.value.${v.key}.desc`} page={CMS_PAGE} section="values" type="paragraph">
                      {t(`over.values.${v.key}.desc`)}
                    </EditableText>
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
            <EditableText blockKey="over-ons.timeline.badge" page={CMS_PAGE} section="timeline">
              {t("over.timelineBadge")}
            </EditableText>
          </Badge>
          <h2 className="heading-display text-3xl text-navy-900 sm:text-4xl">
            <EditableText blockKey="over-ons.timeline.title" page={CMS_PAGE} section="timeline" type="heading">
              {t("over.timelineTitle")}
            </EditableText>
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
                <EditableText blockKey={`over-ons.timeline.${t1.key}.year`} page={CMS_PAGE} section="timeline">
                  {t1.year}
                </EditableText>
              </div>
              <div className="mt-4 text-sm font-semibold text-navy-900">
                <EditableText blockKey={`over-ons.timeline.${t1.key}.title`} page={CMS_PAGE} section="timeline">
                  {t(`over.timeline.${t1.key}.title`)}
                </EditableText>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-navy-500">
                <EditableText blockKey={`over-ons.timeline.${t1.key}.desc`} page={CMS_PAGE} section="timeline" type="paragraph">
                  {t(`over.timeline.${t1.key}.desc`)}
                </EditableText>
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
              <EditableText blockKey="over-ons.team.badge" page={CMS_PAGE} section="team">
                {t("over.teamBadge")}
              </EditableText>
            </Badge>
            <h2 className="heading-display text-3xl text-navy-900 sm:text-4xl">
              <EditableText blockKey="over-ons.team.title" page={CMS_PAGE} section="team" type="heading">
                {t("over.teamTitle")}
              </EditableText>
            </h2>
            <p className="mt-2 text-sm text-navy-500">
              <EditableText blockKey="over-ons.team.subtitle" page={CMS_PAGE} section="team" type="paragraph">
                {t("over.teamSubtitle")}
              </EditableText>
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {TEAM.map((m, i) => (
              <div
                key={m.name}
                className="overflow-hidden rounded-xl border border-navy-100 bg-white"
              >
                <EditableImage
                  blockKey={`over-ons.team.${i}.image`}
                  page={CMS_PAGE}
                  fallbackSrc={m.img}
                  alt={m.name}
                  className="aspect-[4/5] w-full object-cover"
                />
                <div className="p-4">
                  <div className="text-sm font-semibold text-navy-900">
                    <EditableText blockKey={`over-ons.team.${i}.name`} page={CMS_PAGE} section="team">
                      {m.name}
                    </EditableText>
                  </div>
                  <div className="text-xs text-navy-500">
                    <EditableText blockKey={`over-ons.team.${i}.role`} page={CMS_PAGE} section="team">
                      {m.role}
                    </EditableText>
                  </div>
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
            <EditableText blockKey="over-ons.visit.badge" page={CMS_PAGE} section="visit">
              {t("over.visitBadge")}
            </EditableText>
          </Badge>
          <h3 className="heading-display text-2xl text-navy-900">
            <EditableText blockKey="over-ons.visit.title" page={CMS_PAGE} section="visit" type="heading">
              {t("over.visitTitle")}
            </EditableText>
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-navy-600">
            <EditableText blockKey="over-ons.visit.body" page={CMS_PAGE} section="visit" type="paragraph">
              {t("over.visitBody")}
            </EditableText>
          </p>
          <ul className="mt-5 space-y-3 text-sm text-navy-700">
            <li className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-marine-700" />
              <EditableText blockKey="over-ons.visit.address" page={CMS_PAGE} section="visit">
                {companyInfo.address}
              </EditableText>
            </li>
            <li className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-marine-700" />
              <a href={companyInfo.phoneHref} className="hover:text-navy-900">
                <EditableText blockKey="over-ons.visit.phone" page={CMS_PAGE} section="visit">
                  {companyInfo.phone}
                </EditableText>
              </a>
            </li>
            <li className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-marine-700" />
              <a href={companyInfo.emailHref} className="hover:text-navy-900">
                <EditableText blockKey="over-ons.visit.email" page={CMS_PAGE} section="visit">
                  {companyInfo.email}
                </EditableText>
              </a>
            </li>
            <li className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-marine-700" />
              <EditableText blockKey="over-ons.visit.hours" page={CMS_PAGE} section="visit">
                {t("over.hours")}
              </EditableText>
            </li>
          </ul>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link href={`/${locale}/contact`}>
              <Button variant="primary" rightIcon={<ArrowRight className="h-4 w-4" />}>
                <EditableText blockKey="over-ons.visit.cta" page={CMS_PAGE} section="visit">
                  {t("over.makeAppointment")}
                </EditableText>
              </Button>
            </Link>
          </div>
        </div>

        <div className="min-h-[320px] overflow-hidden rounded-2xl border border-navy-100 shadow-card">
          <EditableImage
            blockKey="over-ons.visit.image"
            page={CMS_PAGE}
            fallbackSrc="/img/krek/jachthaven.webp"
            alt={t("over.mapAlt")}
            className="h-full w-full"
          />
        </div>
      </section>
    </>
  );
}
