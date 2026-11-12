"use client";


import { TranslatedText } from '@/components/cms/TranslatedText';
import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { useIntl } from "@/i18n/IntlProvider";
import { Button } from "@/components/ui/Button";
import { customerReturnTo, isSafeReturnTo } from "@/lib/auth-routes";
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
  const { signIn, signInCustomer, verifyMfa, requestCustomerMagicLink } =
    useAuth();
  const { push } = useToast();

  const role: LoginRole = coerceLoginRole(searchParams.get("role"));
  const [passwordless, setPasswordless] = React.useState(false);
  const magicMode = role === "customer" && passwordless;
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [remember, setRemember] = React.useState(true);
  const [showPass, setShowPass] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  // Trello #104: MFA challenge step.
  const [mfaToken, setMfaToken] = React.useState<string | null>(null);
  const [mfaCode, setMfaCode] = React.useState("");

  const returnTo = searchParams.get('returnTo');
  const destination = role === 'customer'
    ? customerReturnTo(returnTo)
    : (isSafeReturnTo(returnTo) ? returnTo : undefined);
  const dest = destination ?? `/${locale}${ROLE_REDIRECTS[role]}`;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (magicMode) {
        await requestCustomerMagicLink(email, locale, destination);
        push({
          tone: "success",
          title: t("adminNew.auth.magicSentTitle"),
        });
        return;
      }
      if (role === "customer") {
        await signInCustomer(email, password, remember);
        window.location.replace(dest);
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
          {<TranslatedText textKey={"adminNew.auth.mfaTitle"} />}.
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-navy-500">
          {<TranslatedText textKey={"adminNew.auth.mfaSubtitle"} />}
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
            {loading ? <TranslatedText textKey={"common.loggingIn"} /> : <TranslatedText textKey={"adminNew.auth.mfaVerify"} />}
          </Button>
          <button
            type="button"
            onClick={() => { setMfaToken(null); setMfaCode(""); setError(null); }}
            className="block w-full pt-1 text-center text-sm font-semibold text-navy-500 hover:text-navy-800"
          >
            {<TranslatedText textKey={"adminNew.common.back"} />}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div>
      <h2 className="heading-display text-3xl text-navy-900 sm:text-[34px]">
        {<TranslatedText textKey={"login.title"} />}.
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-navy-500">
        {<TranslatedText textKey={"loginExt.subtitle"} />}
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

        {!magicMode ? (
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

        {!magicMode ? (
          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 text-navy-700">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-navy-200 text-marine-600"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              {<TranslatedText textKey={"login.remember"} />}
            </label>
            {role === "customer" && <Link
              href={`/${locale}/forgot-password${destination ? `?returnTo=${encodeURIComponent(destination)}` : ''}`}
              className="font-semibold text-marine-700 hover:text-marine-800"
            >
              {<TranslatedText textKey={"login.forgot"} />}
            </Link>}
          </div>
        ) : (
          <div className="rounded-lg border border-marine-200 bg-marine-50 px-3 py-2 text-xs text-marine-800">
            {<TranslatedText textKey={"login.emailLinkHelp"} />}
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
            ? <TranslatedText textKey={"common.loggingIn"} />
            : magicMode
              ? <TranslatedText textKey={"login.emailLink"} />
              : `${t("login.submit")}`}
        </Button>

        {role === "customer" && (
          <button type="button" disabled={loading} className="w-full text-sm font-semibold text-marine-700"
            onClick={() => { setPasswordless(!passwordless); setError(null); }}>
            <TranslatedText textKey={magicMode ? "login.withPassword" : "login.withoutPassword"} />
          </button>
        )}

        <p className="pt-2 text-center text-sm text-navy-500">
          {<TranslatedText textKey={"login.noAccount"} />}{" "}
          <Link
            href={`/${locale}/signup?role=${role}${destination ? `&returnTo=${encodeURIComponent(destination)}` : ''}`}
            className="font-semibold text-navy-900 hover:text-marine-700"
          >
            {<TranslatedText textKey={"login.createAccount"} />}
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
