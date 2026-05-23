"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Eye, EyeOff, Lock, Mail, User2 } from "lucide-react";
import { useIntl } from "@/i18n/IntlProvider";
import { Button } from "@/components/ui/Button";
import { api, auth } from "@/lib/api";
import { coerceLoginRole } from "@/components/auth/RoleTabs";

type RegistrationKind = "private" | "business" | "partner";

export default function SignupPage() {
  return (
    <React.Suspense fallback={<AuthFormFallback />}>
      <SignupPageContent />
    </React.Suspense>
  );
}

function SignupPageContent() {
  const { t, locale } = useIntl();
  const router = useRouter();
  const searchParams = useSearchParams();
  const role = coerceLoginRole(searchParams.get("role"));
  const kind: RegistrationKind =
    role === "customer" ? "private" : role === "staff" ? "business" : "partner";

  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [showPass, setShowPass] = React.useState(false);
  const [terms, setTerms] = React.useState(true);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!terms) {
      setError(t("signup.errorTerms"));
      return;
    }
    if (password !== confirm) {
      setError(t("signupExt.passwordMismatch"));
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await api<{ token: string }>("/auth/register", {
        method: "POST",
        body: { firstName, lastName, email, password, kind },
        auth: false,
      });
      auth.setSession(res.token);
      router.push(`/${locale}/feed`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("signup.errorGeneric"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="heading-display text-3xl text-navy-900 sm:text-[34px]">
        {t("signupExt.title")}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-navy-500">
        {t("signupExt.subtitle")}
      </p>

      <form onSubmit={submit} className="mt-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field
            id="firstName"
            label={t("signup.firstName")}
            icon={<User2 className="h-4 w-4" />}
          >
            <input
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="auth-input"
              required
              autoComplete="given-name"
            />
          </Field>
          <Field id="lastName" label={t("signup.lastName")}>
            <input
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="auth-input !pl-3"
              required
              autoComplete="family-name"
            />
          </Field>
        </div>

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
            placeholder="naam@voorbeeld.nl"
            className="auth-input"
            required
            autoComplete="email"
          />
        </Field>

        <Field
          id="password"
          label={t("login.password")}
          icon={<Lock className="h-4 w-4" />}
          trailing={
            <button
              type="button"
              onClick={() => setShowPass((v) => !v)}
              className="text-navy-400 hover:text-navy-700"
              aria-label="toggle"
            >
              {showPass ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          }
          hint={t("signup.passwordHint")}
        >
          <input
            id="password"
            type={showPass ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="auth-input"
            required
            autoComplete="new-password"
          />
        </Field>

        <Field
          id="confirm"
          label={t("signupExt.confirmPassword")}
          icon={<Lock className="h-4 w-4" />}
        >
          <input
            id="confirm"
            type={showPass ? "text" : "password"}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="auth-input"
            required
            autoComplete="new-password"
          />
        </Field>

        <label className="flex items-start gap-2 text-xs leading-relaxed text-navy-700">
          <input
            type="checkbox"
            checked={terms}
            onChange={(e) => setTerms(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-navy-200 text-marine-600"
          />
          <span>
            {t("signupExt.termsBefore")}
            <Link
              href={`/${locale}/voorwaarden`}
              className="font-semibold text-marine-700 underline-offset-2 hover:underline"
            >
              {t("signupExt.terms")}
            </Link>
            {t("signupExt.termsMiddle")}
            <Link
              href={`/${locale}/privacy`}
              className="font-semibold text-marine-700 underline-offset-2 hover:underline"
            >
              {t("signupExt.privacy")}
            </Link>
            {t("signupExt.termsAfter")}
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
          {loading ? t("signup.submitting") : t("signup.submit")}
        </Button>

        <p className="pt-2 text-center text-sm text-navy-500">
          {t("signup.haveAccount")}{" "}
          <Link
            href={`/${locale}/login?role=${role}`}
            className="font-semibold text-navy-900 hover:text-marine-700"
          >
            {t("signup.loginInstead")}
          </Link>
        </p>
      </form>
    </div>
  );
}

function AuthFormFallback() {
  return (
    <div className="space-y-4">
      <span className="block h-8 w-56 animate-pulse rounded bg-navy-100" />
      <span className="block h-4 w-full animate-pulse rounded bg-navy-100" />
      <div className="mt-6 space-y-3">
        <span className="block h-10 w-full animate-pulse rounded-xl bg-navy-100" />
        <span className="block h-10 w-full animate-pulse rounded-xl bg-navy-100" />
        <span className="block h-10 w-full animate-pulse rounded-xl bg-navy-100" />
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  icon,
  trailing,
  hint,
  children,
}: {
  id: string;
  label: string;
  icon?: React.ReactNode;
  trailing?: React.ReactNode;
  hint?: string;
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
        {trailing ? (
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2">
            {trailing}
          </span>
        ) : null}
      </div>
      {hint ? <p className="mt-1 text-[11px] text-navy-400">{hint}</p> : null}
    </div>
  );
}
