"use client";


import { TranslatedText } from '@/components/cms/TranslatedText';
import { intlLocale } from '@/lib/format';

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from 'next/navigation';
import { customerReturnTo, loginPath } from '@/lib/auth-routes';
import { ArrowRight, Mail, Phone, User2 } from "lucide-react";
import { useIntl } from "@/i18n/IntlProvider";
import { Button } from "@/components/ui/Button";
import { authService } from "@/lib/services";
import { useToast } from "@/components/ui/ToastProvider";
import { getApiErrorMessage } from "@/lib/api-error";

export default function SignupPage() {
  return <React.Suspense fallback={null}><SignupContent /></React.Suspense>;
}

function SignupContent() {
  const { t, locale } = useIntl();
  const params = useSearchParams();
  const returnTo = customerReturnTo(params.get('returnTo'));
  const { push } = useToast();

  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [terms, setTerms] = React.useState(true);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!terms) {
      setError(t("signup.errorTerms"));
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await authService.registerCustomer({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        preferred_locale: intlLocale(locale),
        returnTo,
      });
      setSuccess(true);
      push({
        tone: "success",
        title: t("adminNew.auth.magicSentTitle"),
        message: t("signupExt.checkEmail"),
      });
    } catch (err) {
      setError(getApiErrorMessage(err, t("signup.errorGeneric")));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center">
        <h2 className="heading-display text-3xl text-navy-900">{<TranslatedText textKey={"signupExt.title"} />}</h2>
        <p className="mt-4 text-sm leading-relaxed text-navy-600">{<TranslatedText textKey={"signupExt.checkEmail"} />}</p>
        <Link
          href={loginPath(locale, returnTo)}
          className="mt-6 inline-flex font-semibold text-marine-700 hover:text-marine-900"
        >
          {<TranslatedText textKey={"signup.loginInstead"} />} →
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h2 className="heading-display text-3xl text-navy-900 sm:text-[34px]">
        {<TranslatedText textKey={"signupExt.title"} />}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-navy-500">
        {<TranslatedText textKey={"signupExt.subtitle"} />}
      </p>

      <form onSubmit={submit} className="mt-5 space-y-4">
        <Field
          id="name"
          label={t("signup.firstName")}
          icon={<User2 className="h-4 w-4" />}
        >
          <input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="auth-input"
            required
            autoComplete="name"
            placeholder={t("signupExt.fullNamePlaceholder")}
          />
        </Field>

        <Field
          id="email"
          label={t("login.email")}
          icon={<Mail className="h-4 w-4" />}
        >
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("adminNew.auth.emailPlaceholder")}
            className="auth-input"
            required
            autoComplete="email"
          />
        </Field>

        <Field
          id="phone"
          label={t("contactPage.phoneLabel")}
          icon={<Phone className="h-4 w-4" />}
        >
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="auth-input"
            autoComplete="tel"
            placeholder={t("signupExt.phonePlaceholder")}
          />
        </Field>

        <div className="rounded-lg border border-marine-200 bg-marine-50 px-3 py-2 text-xs text-marine-800">
          {<TranslatedText textKey={"adminNew.auth.magicInfo"} />}
        </div>

        <label className="flex items-start gap-2 text-xs leading-relaxed text-navy-700">
          <input
            type="checkbox"
            checked={terms}
            onChange={(e) => setTerms(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-navy-200 text-marine-600"
          />
          <span>
            {<TranslatedText textKey={"signupExt.termsBefore"} />}
            <Link
              href={`/${locale}/voorwaarden`}
              className="font-semibold text-marine-700 underline-offset-2 hover:underline"
            >
              {<TranslatedText textKey={"signupExt.terms"} />}
            </Link>
            {<TranslatedText textKey={"signupExt.termsMiddle"} />}
            <Link
              href={`/${locale}/privacy`}
              className="font-semibold text-marine-700 underline-offset-2 hover:underline"
            >
              {<TranslatedText textKey={"signupExt.privacy"} />}
            </Link>
            {<TranslatedText textKey={"signupExt.termsAfter"} />}
          </span>
        </label>

        {error ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <Button
          type="submit"
          size="lg"
          fullWidth
          disabled={loading}
          rightIcon={<ArrowRight className="h-4 w-4" />}
          className="bg-navy-900 text-white hover:bg-navy-800"
        >
          {loading ? <TranslatedText textKey={"signup.submitting"} /> : <TranslatedText textKey={"signup.submit"} />}
        </Button>

        <p className="pt-2 text-center text-sm text-navy-500">
          {<TranslatedText textKey={"signup.haveAccount"} />}{" "}
          <Link
            href={loginPath(locale, returnTo)}
            className="font-semibold text-navy-900 hover:text-marine-700"
          >
            {<TranslatedText textKey={"signup.loginInstead"} />}
          </Link>
        </p>
      </form>
    </div>
  );
}

function Field({
  id,
  label,
  icon,
  children,
}: {
  id: string;
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-navy-500"
      >
        {label}
      </label>
      <div className="relative">
        {icon ? (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-navy-400">
            {icon}
          </span>
        ) : null}
        {children}
      </div>
    </div>
  );
}
