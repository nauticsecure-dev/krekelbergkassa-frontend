"use client";
import { TranslatedText } from '@/components/cms/TranslatedText';
import { SearchSelect } from '@/components/ui/SearchSelect';

import { intlLocale } from '@/lib/format';

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
import { Button, buttonClassName } from "@/components/ui/Button";
import { useIntl } from "@/i18n/IntlProvider";
import { companyInfo, openingHoursRows } from "@/lib/company";
import { contentService } from "@/lib/services";
import { useQuery } from "@/lib/hooks/useAsync";
import { cn } from "@/lib/cn";
import { useRegisterCmsPage } from "@/components/cms/CmsProvider";
import { EditableText } from "@/components/cms/EditableText";
import { EditableImage } from "@/components/cms/EditableImage";
import { EditSafeLink } from "@/components/cms/EditSafeLink";


const CMS_PAGE = "contact";


export default function ContactPage() {
  const { t, locale } = useIntl();
  useRegisterCmsPage(CMS_PAGE);

  const localeTag = intlLocale(locale);
  const language = ['nl', 'en', 'de', 'fr'].includes(locale) ? locale : 'nl';
  const contactQuery = useQuery(['contact-company'], () => contentService.contact());
  const company = contactQuery.data?.company;
  const phone = company?.phone ?? companyInfo.phone;
  const phoneHref = 'tel:' + phone.replace(/\(0\)/g, '').replace(/[^+\d]/g, '');
  const email = company?.email ?? companyInfo.email;
  const address = company?.address
    ? [company.address.street, company.address.postal_code, company.address.city].filter(Boolean).join(', ')
    : companyInfo.address;
  const mapsQuery = encodeURIComponent(address);
  const mapsUrl = 'https://www.google.com/maps/dir/?api=1&destination=' + mapsQuery;
  const mapsEmbed = 'https://maps.google.com/maps?q=' + mapsQuery + '&z=14&output=embed';

  const hoursQuery = useQuery([localeTag], () =>
    contentService.openingHours(localeTag).catch(() => null),
  );
  const liveStatus = hoursQuery.data?.status ?? null;
  const apiHours = hoursQuery.data?.hours ?? [];

  const subjectsQuery = useQuery(["contact-subjects", localeTag], () =>
    contentService.contactSubjects(localeTag).catch(() => null),
  );
  const subjects = subjectsQuery.data?.subjects ?? [];

  return (
    <>
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <EditableImage
            defaultStyle={{ gradient: 'right', gradient_start: 0.85, gradient_middle: 0.55, gradient_end: 0.15 }}
            blockKey="contact.hero.image"
            page={CMS_PAGE}
            fallbackSrc="/img/krek/werf-hero.webp"
            alt="Contact hero"
            className="h-full w-full"
          />
        </div>
        <div className="container-wide pointer-events-none relative pb-24 pt-28 text-white lg:pb-32 lg:pt-40">
          <Badge tone="sand" dot className="pointer-events-auto mb-4">
            <EditableText blockKey="contact.hero.badge" page={CMS_PAGE} section="hero">
              {t("contactPage.badge")}
            </EditableText>
          </Badge>
          <h1 className="heading-display pointer-events-auto max-w-2xl whitespace-pre-line text-4xl text-white sm:text-5xl lg:text-[56px]">
            <EditableText blockKey="contact.hero.title" page={CMS_PAGE} section="hero" type="heading">
              {t("contactPage.title")}
            </EditableText>
          </h1>
          <p className="pointer-events-auto mt-5 max-w-xl text-sand-100/85">
            <EditableText blockKey="contact.hero.subtitle" page={CMS_PAGE} section="hero" type="paragraph">
              {t("contactPage.subtitle")}
            </EditableText>
          </p>
          <div className="pointer-events-none mt-8 flex w-fit flex-wrap gap-3">
            <EditSafeLink href={phoneHref} className={buttonClassName({ variant: 'gold', size: 'lg', className: 'pointer-events-auto' })}><Phone className="h-4 w-4" /><EditableText blockKey="contact.hero.cta_primary.label" page={CMS_PAGE}>{t('contactPage.ctaCall')}</EditableText></EditSafeLink>
            <EditSafeLink href={`mailto:${email}`} className={buttonClassName({ variant: 'outline', size: 'lg', className: 'pointer-events-auto border-white/30 bg-white/5 text-white hover:bg-white/10' })}><Mail className="h-4 w-4" /><EditableText blockKey="contact.hero.cta_secondary.label" page={CMS_PAGE}>{t('contactPage.ctaMail')}</EditableText></EditSafeLink>
          </div>
        </div>
      </section>

      <section className="container-wide mt-12 grid gap-4 sm:grid-cols-3">
        <ContactCard
          icon={MapPin}
          label={<EditableText blockKey="contact.card.address.label" page={CMS_PAGE} section="cards">{t("contactPage.addressLabel")}</EditableText>}
          value={address}
          actionLabel={t("contactPage.ctaRoute")}
          actionHref={mapsUrl}
          external
        />
        <ContactCard
          icon={Phone}
          label={<EditableText blockKey="contact.card.phone.label" page={CMS_PAGE} section="cards">{t("contactPage.phoneLabel")}</EditableText>}
          value={phone}
          actionLabel={t("contactPage.ctaCall")}
          actionHref={phoneHref}
        />
        <ContactCard
          icon={Mail}
          label={<EditableText blockKey="contact.card.email.label" page={CMS_PAGE} section="cards">{t("contactPage.emailLabel")}</EditableText>}
          value={email}
          actionLabel={t("contactPage.ctaMail")}
          actionHref={`mailto:${email}`}
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
                <TranslatedText textKey={"contactPage.hoursTitle"} />
              </Badge>
              <div className="text-xs text-navy-500">
                <TranslatedText textKey={"contactPage.hoursSubtitle"} />
              </div>
            </div>
            {liveStatus && (
              <span
                className={cn(
                  "ml-auto inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
                  liveStatus.is_open
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-rose-50 text-rose-600",
                )}
                title={liveStatus.detail ?? undefined}
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    liveStatus.is_open ? "bg-emerald-500" : "bg-rose-400",
                  )}
                />
                {liveStatus.label}
              </span>
            )}
          </div>
          {liveStatus?.detail && (
            <p className="-mt-1 mb-3 text-xs text-navy-500">{liveStatus.detail}</p>
          )}
          {apiHours.length ? (
            <ul className="grid gap-1 text-sm">
              {apiHours.map((h) => (
                <li
                  key={h.day}
                  className={cn(
                    "flex items-center justify-between border-b border-dashed border-navy-100 py-1.5 last:border-b-0",
                    h.is_today && "rounded-md bg-sand-50 px-2",
                  )}
                >
                  <span
                    className={cn(
                      "text-navy-600",
                      h.is_today && "font-semibold text-navy-900",
                    )}
                  >
                    {h.label}
                    {h.is_today && (
                      <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-marine-600">
                        <TranslatedText textKey={"contactPage.today"} />
                      </span>
                    )}
                  </span>
                  <span className="font-semibold text-navy-900">
                    {h.closed ? t("contactPage.closed") : h.display}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <HoursTable
              rows={openingHoursRows({
                monday: t("contactPage.monday"),
                tuesday: t("contactPage.tuesday"),
                wednesday: t("contactPage.wednesday"),
                thursday: t("contactPage.thursday"),
                friday: t("contactPage.friday"),
                saturday: t("contactPage.saturday"),
                sunday: t("contactPage.sunday"),
                closed: t("contactPage.closed"),
              })}
            />
          )}
        </Card>

        <Card className="overflow-hidden p-0">
          <iframe
            title="Google Maps · Krekelberg Nautic"
            src={mapsEmbed}
            className="h-full min-h-[420px] w-full"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </Card>
      </section>

      <section className="container-wide grid gap-6 pb-20 lg:grid-cols-[1fr_1.2fr]">
        <Card className="p-6">
          <Badge tone="marine" className="mb-3">
            <EditableText blockKey="contact.directions.badge" page={CMS_PAGE} section="directions">
              {t("contactPage.directions")}
            </EditableText>
          </Badge>
          <h3 className="heading-display text-2xl">
            <EditableText blockKey="contact.directions.title" page={CMS_PAGE} section="directions" type="heading">
              {t("contactPage.badge")}
            </EditableText>
          </h3>
          <ul className="mt-5 space-y-4 text-sm">
            <li className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-sand-100 text-navy-700">
                <Ship className="h-4 w-4" />
              </span>
              <div>
                <div className="font-semibold text-navy-900">
                  <EditableText blockKey="contact.directions.road.label" page={CMS_PAGE} section="directions">
                    {t("contactPage.directions")}
                  </EditableText>
                </div>
                <p className="mt-1 text-navy-500">
                  <EditableText blockKey="contact.directions.road.desc" page={CMS_PAGE} section="directions" type="paragraph">
                    {t("contactPage.directionsRoad")}
                  </EditableText>
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-sand-100 text-navy-700">
                <Waves className="h-4 w-4" />
              </span>
              <div>
                <div className="font-semibold text-navy-900">
                  <EditableText blockKey="contact.directions.water.label" page={CMS_PAGE} section="directions">
                    {t("contactPage.directions")}
                  </EditableText>
                </div>
                <p className="mt-1 text-navy-500">
                  <EditableText blockKey="contact.directions.water.desc" page={CMS_PAGE} section="directions" type="paragraph">
                    {t("contactPage.directionsWater")}
                  </EditableText>
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
                <EditableText blockKey="contact.form.badge" page={CMS_PAGE} section="form">
                  {t("contactPage.formTitle")}
                </EditableText>
              </Badge>
              <div className="text-xs text-navy-500">
                <EditableText blockKey="contact.form.desc" page={CMS_PAGE} section="form" type="paragraph">
                  {t("contactPage.formDesc")}
                </EditableText>
              </div>
            </div>
          </div>

          <ContactForm subjects={subjects} language={language} localeTag={localeTag} t={t} />
        </Card>
      </section>
    </>
  );
}

function ContactForm({
  subjects,
  language,
  localeTag,
  t,
}: {
  subjects: Array<{ key: string; label: string; category: string }>;
  language: string;
  localeTag: string;
  t: (key: string) => string;
}) {
  const [status, setStatus] = React.useState<"idle" | "sending" | "sent" | "error">("idle");
  const [validationErrors, setValidationErrors] = React.useState<string[]>([]);
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [subjectKey, setSubjectKey] = React.useState("");
  const [message, setMessage] = React.useState("");

  const submission = React.useRef<{ payload: string; id: string } | null>(null);

  const canSubmit = Boolean(subjectKey) && status !== "sending";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!subjectKey) {
      setStatus("error");
      return;
    }
    if (status === "sending") return;
    setValidationErrors([]);
    setStatus("sending");
    try {
      const payload = {
        name,
        email,
        phone: phone || undefined,
        subject_key: subjectKey,
        message,
        language,
        source_page: typeof window !== "undefined" ? window.location.href : undefined,
        source_locale: localeTag,
      };
      const serialized = JSON.stringify(payload);
      if (!submission.current) {
        try { submission.current = JSON.parse(sessionStorage.getItem('contact-submission') || 'null'); } catch { /* storage unavailable */ }
      }
      if (submission.current?.payload !== serialized) {
        submission.current = { payload: serialized, id: crypto.randomUUID() };
      }
      try { sessionStorage.setItem('contact-submission', JSON.stringify(submission.current)); } catch { /* storage unavailable */ }
      const result = await contentService.submitContact({ ...payload, submission_id: submission.current.id });
      // Only treat an explicit ok payload as success; never assume 2xx alone.
      if (result?.message === "ok") {
        try { sessionStorage.removeItem('contact-submission'); } catch { /* storage unavailable */ }
        setStatus("sent");
      } else {
        setStatus("error");
      }
    } catch (err) {
      const errors = (err as { data?: { errors?: Record<string, string[]> } }).data?.errors;
      setValidationErrors(errors ? Object.values(errors).flat() : []);
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
        <TranslatedText textKey={"contactPage.fSent"} />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-5 grid gap-3 sm:grid-cols-2">
      {status === "error" && (
        <div className="sm:col-span-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <TranslatedText textKey={"contactPage.fError"} />
          {validationErrors.map((error, index) => <p key={index}>{error}</p>)}
        </div>
      )}
      <FormField label={t("contactPage.fName")}>
        <input
          className="input-base"
          required
          maxLength={255}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </FormField>
      <FormField label={t("contactPage.fEmail")}>
        <input
          type="email"
          className="input-base"
          required
          maxLength={255}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </FormField>
      <FormField label={t("contactPage.fPhone")}>
        <input
          className="input-base"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </FormField>
      <FormField label={t("contactPage.fTopic")}>
        <SearchSelect
          className="input-base"
          required
          value={subjectKey}
          onChange={(e) => setSubjectKey(e.target.value)}
        >
          <option value="">{t("contactPage.fSelectTopic")}</option>
          {subjects.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </SearchSelect>
      </FormField>
      <FormField label={t("contactPage.fMessage")} className="sm:col-span-2">
        <textarea
          className="input-base min-h-[110px] resize-y"
          required
          minLength={10}
          maxLength={5000}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </FormField>
      <div className="sm:col-span-2">
        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          disabled={!canSubmit}
          rightIcon={<Send className="h-4 w-4" />}
        >
          {status === "sending" ? t("contactPage.fSending") : t("contactPage.fSubmit")}
        </Button>
      </div>
    </form>
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
  label: React.ReactNode;
  value: React.ReactNode;
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
