"use client";

import Link from "next/link";
import {
  Anchor,
  ArrowRight,
  Award,
  CheckCircle2,
  ExternalLink,
  Ship,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useIntl } from "@/i18n/IntlProvider";
import { useRegisterCmsPage } from "@/components/cms/CmsProvider";
import { EditableText } from "@/components/cms/EditableText";
import { EditableImage } from "@/components/cms/EditableImage";

const CMS_PAGE = "verkoop";
const SCHEPENKRING_URL =
  "https://www.schepenkring.nl/aanbod-boten/?kantoor=Roermond";

export default function VerkoopPage() {
  const { t, locale } = useIntl();
  useRegisterCmsPage(CMS_PAGE);

  return (
    <>
      {/* Hero with real photo */}
      <section className="relative isolate overflow-hidden">
        <EditableImage
          blockKey="verkoop.hero.image"
          page={CMS_PAGE}
          fallbackSrc="/img/krek/verkoop-schip.webp"
          alt="Verkoop hero"
          className="absolute inset-0"
        />
        <div
          className="absolute inset-0 bg-gradient-to-r from-navy-950/85 via-navy-950/65 to-navy-950/40"
          aria-hidden
        />
        <div className="container-wide relative pb-24 pt-28 text-white lg:pb-32 lg:pt-40">
          <Badge tone="sand" dot className="mb-4">
            <EditableText blockKey="verkoop.hero.badge" page={CMS_PAGE} section="hero">
              {t("verkoopPage.badge")}
            </EditableText>
          </Badge>
          <h1 className="heading-display max-w-2xl whitespace-pre-line text-4xl text-white sm:text-5xl lg:text-[56px]">
            <EditableText blockKey="verkoop.hero.title" page={CMS_PAGE} section="hero" type="heading">
              {t("verkoopPage.title")}
            </EditableText>
          </h1>
          <p className="mt-5 max-w-xl text-sand-100/85">
            <EditableText blockKey="verkoop.hero.subtitle" page={CMS_PAGE} section="hero" type="paragraph">
              {t("verkoopPage.subtitle")}
            </EditableText>
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href={SCHEPENKRING_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button
                variant="gold"
                size="lg"
                rightIcon={<ExternalLink className="h-4 w-4" />}
              >
                {t("verkoopPage.browseCta")}
              </Button>
            </a>
            <Link href={`/${locale}/contact`}>
              <Button
                variant="outline"
                size="lg"
                className="border-white/30 bg-white/5 text-white hover:bg-white/10"
              >
                {t("verkoopPage.sellCta")}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Stat strip */}
      <section className="container-wide mt-10 grid gap-3 sm:grid-cols-3">
        {[
          { v: "60+", l: t("verkoopPage.stat1"), icon: Ship },
          { v: "3-6", l: t("verkoopPage.stat2"), icon: CheckCircle2 },
          { v: "52", l: t("verkoopPage.stat3"), icon: Award },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.l} className="flex items-center gap-4 p-5">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-sand-100 text-navy-700">
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <div className="text-2xl font-semibold text-navy-900">
                  {s.v}
                </div>
                <div className="text-xs text-navy-500">{s.l}</div>
              </div>
            </Card>
          );
        })}
      </section>

      {/* External listings panel */}
      <section className="container-wide py-14">
        <Card className="overflow-hidden">
          <div className="grid gap-0 lg:grid-cols-[1.2fr_1fr]">
            <div className="p-8 lg:p-10">
              <Badge tone="navy" className="mb-3">
                {t("verkoopPage.highlightTitle")}
              </Badge>
              <h2 className="heading-display text-3xl sm:text-4xl">
                {t("verkoopPage.browseTitle")}
              </h2>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-navy-600">
                {t("verkoopPage.browseDesc")}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-navy-600">
                {t("verkoopPage.highlightDesc")}
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <a
                  href={SCHEPENKRING_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button
                    variant="primary"
                    size="lg"
                    rightIcon={<ExternalLink className="h-4 w-4" />}
                  >
                    {t("verkoopPage.browseCta")}
                  </Button>
                </a>
                <span className="text-xs text-navy-400">
                  {t("verkoopPage.browseExternal")}
                </span>
              </div>
            </div>
            <div
              className="relative min-h-[260px] bg-cover bg-center lg:min-h-0"
              style={{ backgroundImage: "url(/img/krek/jachtmakelaar.webp)" }}
              aria-hidden
            />
          </div>
        </Card>
      </section>

      {/* Sell your boat */}
      <section className="container-wide pb-20">
        <Card className="overflow-hidden">
          <div className="grid gap-0 lg:grid-cols-[1.1fr_1fr]">
            <div className="relative isolate p-10 text-white">
              <div
                className="absolute inset-0 -z-10 bg-cover bg-center"
                style={{ backgroundImage: "url(/img/krek/jachthaven.webp)" }}
                aria-hidden
              />
              <div
                className="absolute inset-0 -z-10 bg-navy-950/75"
                aria-hidden
              />
              <Badge tone="gold" className="mb-3" dot>
                {t("verkoopPage.badge")}
              </Badge>
              <h2 className="heading-display text-3xl text-white sm:text-4xl">
                {t("verkoopPage.sellTitle")}
              </h2>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-sand-100/80">
                {t("verkoopPage.sellDesc")}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href={`/${locale}/contact`}>
                  <Button
                    variant="gold"
                    rightIcon={<ArrowRight className="h-4 w-4" />}
                  >
                    {t("verkoopPage.sellCta")}
                  </Button>
                </Link>
                <Link href={`/${locale}/contact`}>
                  <Button
                    variant="outline"
                    className="border-white/30 bg-white/5 text-white hover:bg-white/10"
                    leftIcon={<Anchor className="h-4 w-4" />}
                  >
                    {t("verkoopPage.valueCta")}
                  </Button>
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-2 divide-x divide-y divide-navy-100">
              {[
                {
                  num: "01",
                  title: t("verkoopPage.step1"),
                  desc: t("verkoopPage.step1Desc"),
                },
                {
                  num: "02",
                  title: t("verkoopPage.step2"),
                  desc: t("verkoopPage.step2Desc"),
                },
                {
                  num: "03",
                  title: t("verkoopPage.step3"),
                  desc: t("verkoopPage.step3Desc"),
                },
                {
                  num: "04",
                  title: t("verkoopPage.step4"),
                  desc: t("verkoopPage.step4Desc"),
                },
              ].map((step, i) => (
                <div
                  key={step.num}
                  className={i < 2 ? "border-t-0 p-6" : "p-6"}
                >
                  <div className="text-xs font-semibold tracking-widest text-navy-400">
                    {step.num}
                  </div>
                  <div className="mt-1 text-base font-semibold text-navy-900">
                    {step.title}
                  </div>
                  <div className="mt-1 text-xs text-navy-500">{step.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </section>
    </>
  );
}
