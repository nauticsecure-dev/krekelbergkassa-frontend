"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { useIntl } from "@/i18n/IntlProvider";
import { Button } from "@/components/ui/Button";
import { useAuth, MfaRequiredError } from "@/lib/auth-context";
import { useToast } from "@/components/ui/ToastProvider";
import { getApiErrorMessage } from "@/lib/api-error";
import {
  ROLE_REDIRECTS,
  coerceLoginRole,
  type LoginRole,
} from "@/components/auth/RoleTabs";

export default function LoginPage() {
  return (
    <React.Suspense fallback={<AuthFormFallback />}>
      <LoginPageContent />
    </React.Suspense>
  );
}

function LoginPageContent() {
  const { t, locale } = useIntl();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn, verifyMfa, requestCustomerMagicLink, verifyCustomerMagicLink } =
    useAuth();
  const { push } = useToast();

  const role: LoginRole = coerceLoginRole(searchParams.get("role"));
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [remember, setRemember] = React.useState(true);
  const [showPass, setShowPass] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  // Trello #104: MFA challenge step.
  const [mfaToken, setMfaToken] = React.useState<string | null>(null);
  const [mfaCode, setMfaCode] = React.useState("");

  const dest =
    searchParams.get('returnTo')?.startsWith('/') && !searchParams.get('returnTo')?.includes('://')
      ? searchParams.get('returnTo')!
      : `/${locale}${ROLE_REDIRECTS[role]}`;

  React.useEffect(() => {
    const token =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("token")
        : null;
    if (!token) return;
    setLoading(true);
    void verifyCustomerMagicLink(token)
      .then(() => {
        push({
          tone: "success",
          title: t("adminNew.auth.portalSessionActive"),
          message: t("adminNew.auth.portalSessionActiveMsg"),
        });
        router.push(`/${locale}/feed`);
      })
      .catch((err) => {
        setError(getApiErrorMessage(err, t("common.loginFailed")));
      })
      .finally(() => setLoading(false));
  }, [verifyCustomerMagicLink, push, router, locale, t]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (role === "customer") {
        await requestCustomerMagicLink(email, locale);
        push({
          tone: "success",
          title: t("adminNew.auth.magicSentTitle"),
        });
        return;
      }
      await signIn(email, password, remember);
      router.push(dest);
    } catch (err) {
      // Trello #104: MFA-enabled accounts require a second factor.
      if (err instanceof MfaRequiredError) {
        setMfaToken(err.mfaToken);
        setMfaCode("");
        setError(null);
      } else {
        setError(getApiErrorMessage(err, t("common.loginFailed")));
      }
    } finally {
      setLoading(false);
    }
  };

  const submitMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaToken) return;
    setError(null);
    setLoading(true);
    try {
      await verifyMfa(mfaToken, mfaCode.trim(), remember);
      router.push(dest);
    } catch (err) {
      setError(getApiErrorMessage(err, t("adminNew.auth.mfaFailed")));
    } finally {
      setLoading(false);
    }
  };

  // Trello #104: MFA challenge screen (TOTP / recovery code).
  if (mfaToken) {
    return (
      <div>
        <h2 className="heading-display text-3xl text-navy-900 sm:text-[34px]">
          {t("adminNew.auth.mfaTitle")}.
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-navy-500">
          {t("adminNew.auth.mfaSubtitle")}
        </p>
        <form onSubmit={submitMfa} className="mt-6 space-y-4">
          <Field id="mfa-code" label={t("adminNew.auth.mfaCode")} icon={<Lock className="h-4 w-4" />}>
            <input
              id="mfa-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value)}
              placeholder="123456"
              className="auth-input tracking-[0.4em]"
              required
            />
          </Field>
          {error ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          ) : null}
          <Button
            type="submit"
            size="lg"
            fullWidth
            disabled={loading || mfaCode.trim().length < 6}
            rightIcon={<ArrowRight className="h-4 w-4" />}
            className="bg-navy-900 text-white hover:bg-navy-800"
          >
            {loading ? t("common.loggingIn") : t("adminNew.auth.mfaVerify")}
          </Button>
          <button
            type="button"
            onClick={() => { setMfaToken(null); setMfaCode(""); setError(null); }}
            className="block w-full pt-1 text-center text-sm font-semibold text-navy-500 hover:text-navy-800"
          >
            {t("adminNew.common.back")}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div>
      <h2 className="heading-display text-3xl text-navy-900 sm:text-[34px]">
        {t("login.title")}.
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-navy-500">
        {t("loginExt.subtitle")}
      </p>

      <form onSubmit={submit} className="mt-6 space-y-4">
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

        {role !== "customer" ? (
          <Field
            id="password"
            label={t("login.password")}
            icon={<Lock className="h-4 w-4" />}
            trailing={
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                className="text-navy-400 hover:text-navy-700"
                aria-label={t("adminNew.auth.togglePassword")}
              >
                {showPass ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            }
          >
            <input
              id="password"
              type={showPass ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("adminNew.auth.passwordPlaceholder")}
              className="auth-input"
              required
              autoComplete="current-password"
            />
          </Field>
        ) : null}

        {role !== "customer" ? (
          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 text-navy-700">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-navy-200 text-marine-600"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              {t("login.remember")}
            </label>
            <Link
              href={`/${locale}/forgot-password`}
              className="font-semibold text-marine-700 hover:text-marine-800"
            >
              {t("login.forgot")}
            </Link>
          </div>
        ) : (
          <div className="rounded-lg border border-marine-200 bg-marine-50 px-3 py-2 text-xs text-marine-800">
            {t("adminNew.auth.magicInfo")}
          </div>
        )}

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
          {loading
            ? t("common.loggingIn")
            : role === "customer"
              ? t("adminNew.auth.sendMagicLink")
              : `${t("login.submit")}`}
        </Button>

        <p className="pt-2 text-center text-sm text-navy-500">
          {t("login.noAccount")}{" "}
          <Link
            href={`/${locale}/signup?role=${role}`}
            className="font-semibold text-navy-900 hover:text-marine-700"
          >
            {t("login.createAccount")}
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
  children,
}: {
  id: string;
  label: string;
  icon?: React.ReactNode;
  trailing?: React.ReactNode;
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
    </div>
  );
}
