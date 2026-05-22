'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Eye, EyeOff, Lock, Mail, Sparkles } from 'lucide-react';
import { useIntl } from '@/i18n/IntlProvider';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/lib/auth-context';
import {
  RoleTabs,
  ROLE_REDIRECTS,
  type LoginRole,
} from '@/components/auth/RoleTabs';

export default function LoginPage() {
  const { t, locale } = useIntl();
  const router = useRouter();
  const { signIn, signInDemo } = useAuth();

  const [role, setRole] = React.useState<LoginRole>('customer');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [remember, setRemember] = React.useState(true);
  const [showPass, setShowPass] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const dest = `/${locale}${ROLE_REDIRECTS[role]}`;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signIn(email, password, remember);
      router.push(dest);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  const demo = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInDemo(role);
      router.push(dest);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="heading-display text-3xl text-navy-900 sm:text-[34px]">
        {t('login.title')}.
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-navy-500">
        {t('loginExt.subtitle')}
      </p>

      <div className="mt-6">
        <RoleTabs value={role} onChange={setRole} />
      </div>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <Field
          id="email"
          label={t('login.email')}
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
          label={t('login.password')}
          icon={<Lock className="h-4 w-4" />}
          trailing={
            <button
              type="button"
              onClick={() => setShowPass((v) => !v)}
              className="text-navy-400 hover:text-navy-700"
              aria-label="toggle"
            >
              {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          }
        >
          <input
            id="password"
            type={showPass ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="auth-input"
            required
            autoComplete="current-password"
          />
        </Field>

        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-navy-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-navy-200 text-marine-600"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            {t('login.remember')}
          </label>
          <Link
            href={`/${locale}/forgot-password`}
            className="font-semibold text-marine-700 hover:text-marine-800"
          >
            {t('login.forgot')}
          </Link>
        </div>

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
          {loading ? t('common.loggingIn') : `${t('login.submit')}`}
        </Button>

        <Button
          type="button"
          variant="outline"
          size="lg"
          fullWidth
          onClick={demo}
          disabled={loading}
          leftIcon={<Sparkles className="h-4 w-4" />}
          className="border-navy-200 bg-white text-navy-800 hover:bg-sand-100"
        >
          {t('loginRole.demo')}
        </Button>

        <p className="pt-2 text-center text-sm text-navy-500">
          {t('login.noAccount')}{' '}
          <Link
            href={`/${locale}/signup`}
            className="font-semibold text-navy-900 hover:text-marine-700"
          >
            {t('login.createAccount')}
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
