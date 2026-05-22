"use client";

import * as React from "react";
import {
  ArrowRight,
  Clock,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Send,
  Ship,
  Waves,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useIntl } from "@/i18n/IntlProvider";

const MAPS_URL =
  "https://www.google.com/maps/dir/?api=1&destination=Mr.+Hartelaan+1,+Roermond";
const MAPS_EMBED =
  "https://maps.google.com/maps?q=Mr.+Hartelaan+1,+Roermond&t=&z=14&ie=UTF8&iwloc=&output=embed";

export default function ContactPage() {
  const { t } = useIntl();
  const [sent, setSent] = React.useState(false);

  return (
    <>
      <section className="relative isolate overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url(/img/krek/werf-hero.webp)" }}
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-gradient-to-r from-navy-950/85 via-navy-950/55 to-navy-950/15"
          aria-hidden
        />
        <div className="container-wide relative pb-24 pt-28 text-white lg:pb-32 lg:pt-40">
          <Badge tone="sand" dot className="mb-4">
            {t("contactPage.badge")}
          </Badge>
          <h1 className="heading-display max-w-2xl whitespace-pre-line text-4xl text-white sm:text-5xl lg:text-[56px]">
            {t("contactPage.title")}
          </h1>
          <p className="mt-5 max-w-xl text-sand-100/85">
            {t("contactPage.subtitle")}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href={`tel:${t("contactPage.phone").replace(/\s/g, "")}`}>
              <Button
                variant="gold"
                size="lg"
                leftIcon={<Phone className="h-4 w-4" />}
              >
                {t("contactPage.ctaCall")}
              </Button>
            </a>
            <a href={`mailto:${t("contactPage.email")}`}>
              <Button
                variant="outline"
                size="lg"
                className="border-white/30 bg-white/5 text-white hover:bg-white/10"
                leftIcon={<Mail className="h-4 w-4" />}
              >
                {t("contactPage.ctaMail")}
              </Button>
            </a>
          </div>
        </div>
      </section>

      <section className="container-wide mt-12 grid gap-4 sm:grid-cols-3">
        <ContactCard
          icon={MapPin}
          label={t("contactPage.addressLabel")}
          value={t("contactPage.address")}
          actionLabel={t("contactPage.ctaRoute")}
          actionHref={MAPS_URL}
          external
        />
        <ContactCard
          icon={Phone}
          label={t("contactPage.phoneLabel")}
          value={t("contactPage.phone")}
          actionLabel={t("contactPage.ctaCall")}
          actionHref={`tel:${t("contactPage.phone").replace(/\s/g, "")}`}
        />
        <ContactCard
          icon={Mail}
          label={t("contactPage.emailLabel")}
          value={t("contactPage.email")}
          actionLabel={t("contactPage.ctaMail")}
          actionHref={`mailto:${t("contactPage.email")}`}
        />
      </section>

      <section className="container-wide grid gap-6 py-14 lg:grid-cols-[1fr_1.4fr]">
        <Card className="p-6">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-sand-100 text-navy-700">
              <Clock className="h-5 w-5" />
            </span>
            <div>
              <Badge tone="navy" className="mb-1">
                {t("contactPage.hoursTitle")}
              </Badge>
              <div className="text-xs text-navy-500">
                {t("contactPage.hoursHighSeason")}
              </div>
            </div>
          </div>
          <HoursTable
            rows={[
              { day: t("contactPage.monFri"), value: "08:00 – 17:00" },
              { day: t("contactPage.sat"), value: "09:00 – 13:00" },
              { day: t("contactPage.sun"), value: t("contactPage.closed") },
            ]}
          />
          <div className="my-5 h-px bg-navy-100" />
          <div className="text-xs font-semibold uppercase tracking-widest text-navy-400">
            {t("contactPage.hoursLowSeason")}
          </div>
          <div className="mt-3">
            <HoursTable
              rows={[
                { day: t("contactPage.monFri"), value: "08:30 – 16:30" },
                {
                  day: t("contactPage.sat"),
                  value: t("contactPage.appointmentOnly"),
                },
                { day: t("contactPage.sun"), value: t("contactPage.closed") },
              ]}
            />
          </div>
        </Card>

        <Card className="overflow-hidden p-0">
          <iframe
            title="Google Maps · Krekelberg Nautic"
            src={MAPS_EMBED}
            className="h-full min-h-[420px] w-full"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </Card>
      </section>

      <section className="container-wide grid gap-6 pb-20 lg:grid-cols-[1fr_1.2fr]">
        <Card className="p-6">
          <Badge tone="marine" className="mb-3">
            {t("contactPage.directions")}
          </Badge>
          <h3 className="heading-display text-2xl">{t("contactPage.badge")}</h3>
          <ul className="mt-5 space-y-4 text-sm">
            <li className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-sand-100 text-navy-700">
                <Ship className="h-4 w-4" />
              </span>
              <div>
                <div className="font-semibold text-navy-900">
                  {t("contactPage.directions")}
                </div>
                <p className="mt-1 text-navy-500">
                  {t("contactPage.directionsRoad")}
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-sand-100 text-navy-700">
                <Waves className="h-4 w-4" />
              </span>
              <div>
                <div className="font-semibold text-navy-900">
                  {t("contactPage.directions")}
                </div>
                <p className="mt-1 text-navy-500">
                  {t("contactPage.directionsWater")}
                </p>
              </div>
            </li>
          </ul>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-sand-100 text-navy-700">
              <MessageSquare className="h-5 w-5" />
            </span>
            <div>
              <Badge tone="gold" className="mb-1">
                {t("contactPage.formTitle")}
              </Badge>
              <div className="text-xs text-navy-500">
                {t("contactPage.formDesc")}
              </div>
            </div>
          </div>

          {sent ? (
            <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {t("contactPage.fSent")}
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setSent(true);
              }}
              className="mt-5 grid gap-3 sm:grid-cols-2"
            >
              <FormField label={t("contactPage.fName")}>
                <input className="input-base" required />
              </FormField>
              <FormField label={t("contactPage.fEmail")}>
                <input type="email" className="input-base" required />
              </FormField>
              <FormField label={t("contactPage.fPhone")}>
                <input className="input-base" />
              </FormField>
              <FormField label={t("contactPage.fTopic")}>
                <select className="input-base">
                  <option>Algemene vraag</option>
                  <option>Kraanafspraak</option>
                  <option>Winterstalling</option>
                  <option>Verkoop / aankoop</option>
                  <option>Appartement</option>
                </select>
              </FormField>
              <FormField
                label={t("contactPage.fMessage")}
                className="sm:col-span-2"
              >
                <textarea
                  className="input-base min-h-[110px] resize-y"
                  required
                />
              </FormField>
              <div className="sm:col-span-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  fullWidth
                  rightIcon={<Send className="h-4 w-4" />}
                >
                  {t("contactPage.fSubmit")}
                </Button>
              </div>
            </form>
          )}
        </Card>
      </section>
    </>
  );
}

function ContactCard({
  icon: Icon,
  label,
  value,
  actionLabel,
  actionHref,
  external,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  actionLabel: string;
  actionHref: string;
  external?: boolean;
}) {
  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-sand-100 text-navy-700">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-widest text-navy-400">
            {label}
          </div>
          <div className="text-sm font-semibold text-navy-900">{value}</div>
        </div>
      </div>
      <a
        href={actionHref}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
        className="inline-flex items-center gap-1 text-xs font-semibold text-marine-700 hover:text-marine-800"
      >
        {actionLabel} <ArrowRight className="h-3 w-3" />
      </a>
    </Card>
  );
}

function HoursTable({ rows }: { rows: { day: string; value: string }[] }) {
  return (
    <ul className="grid gap-1 text-sm">
      {rows.map((r) => (
        <li
          key={r.day}
          className="flex items-center justify-between border-b border-dashed border-navy-100 py-1.5 last:border-b-0"
        >
          <span className="text-navy-600">{r.day}</span>
          <span className="font-semibold text-navy-900">{r.value}</span>
        </li>
      ))}
    </ul>
  );
}

function FormField({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-widest text-navy-500">
        {label}
      </label>
      {children}
    </div>
  );
}
