'use client';


import { TranslatedText } from '@/components/cms/TranslatedText';
import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { authService } from '@/lib/services';
import { customerReturnTo, loginPath } from '@/lib/auth-routes';
import { useAuth } from '@/lib/auth-context';
import { getApiErrorMessage } from '@/lib/api-error';
import { ArrowLeft, ArrowRight, CheckCircle2, Mail } from 'lucide-react';
import { useIntl } from '@/i18n/IntlProvider';
import { Button } from '@/components/ui/Button';

export default function ForgotPasswordPage() {
  return <React.Suspense><PasswordRecovery /></React.Suspense>;
}

function PasswordRecovery() {
  const { t, locale } = useIntl();
  const { user, invalidateSession } = useAuth();
  const params = useSearchParams();
  const token = params.get('token');
  const returnTo = customerReturnTo(params.get('returnTo'));
  const recoveryPath = `/${locale}/forgot-password${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ''}`;
  const emailFromLink = params.get('email');
  const setup = params.has('setup');
  const [email, setEmail] = React.useState(emailFromLink ?? '');
  const address = setup && user?.role === 'customer' ? user.email : email;
  const [password, setPassword] = React.useState('');
  const [confirmation, setConfirmation] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string>();
  const [sent, setSent] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      if (token) {
        await authService.resetCustomerPassword(address, token, password, confirmation);
        if (user?.role === 'customer' && user.email.toLowerCase() === address.toLowerCase()) invalidateSession();
      } else {
        await authService.requestCustomerPassword(address, locale, returnTo);
      }
      setSent(true);
    } catch (err) {
      setError(getApiErrorMessage(err, t('login.requestFailed')));
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <div>
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <CheckCircle2 className="h-6 w-6" />
        </span>
        <h2 className="heading-display mt-5 text-3xl text-navy-900 sm:text-[34px]">
          {<TranslatedText textKey={token ? 'login.passwordSaved' : 'forgot.sentTitle'} />}
        </h2>
        {!token && <p className="mt-2 text-sm text-navy-500"><TranslatedText textKey='forgot.sentDescription' vars={{ email: address }} /></p>}

        <Link href={loginPath(locale, returnTo)} className="mt-7 block">
          <Button
            variant="outline"
            size="lg"
            fullWidth
            leftIcon={<ArrowLeft className="h-4 w-4" />}
            className="border-navy-200 bg-white text-navy-800 hover:bg-sand-100"
          >
            {<TranslatedText textKey={'forgot.backToLogin'} />}
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h2 className="heading-display text-3xl text-navy-900 sm:text-[34px]">
        {<TranslatedText textKey={token || setup ? 'login.setPassword' : 'forgot.title'} />}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-navy-500">
        {<TranslatedText textKey={'forgot.subtitle'} />}
      </p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <div>
          <label
            htmlFor="email"
            className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-navy-500"
          >
            {<TranslatedText textKey={'login.email'} />}
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-navy-400">
              <Mail className="h-4 w-4" />
            </span>
            <input
              id="email"
              type="email"
              value={address}
              readOnly={Boolean(emailFromLink || (setup && user?.role === "customer"))}
              onChange={(e) => setEmail(e.target.value)}
              className="auth-input"
              required
              placeholder={t('adminNew.auth.emailPlaceholder')}
              autoComplete="email"
            />
          </div>
        </div>

        {token && <>
          <label className="block text-sm"><TranslatedText textKey="login.password" />
            <input className="auth-input w-full" type="password" autoComplete="new-password" minLength={12} maxLength={72} required value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          <label className="block text-sm"><TranslatedText textKey="login.confirmPassword" />
            <input className="auth-input w-full" type="password" autoComplete="new-password" minLength={12} maxLength={72} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
          </label>
        </>}
        {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
        {error && token && <Link className="text-sm underline" href={recoveryPath}><TranslatedText textKey="forgot.submit" /></Link>}
        <Button
          disabled={busy}
          type="submit"
          size="lg"
          fullWidth
          rightIcon={<ArrowRight className="h-4 w-4" />}
          className="bg-navy-900 text-white hover:bg-navy-800"
        >
          {<TranslatedText textKey={token ? 'login.setPassword' : 'forgot.submit'} />}
        </Button>

        <Link href={loginPath(locale, returnTo)}>
          <Button
            type="button"
            variant="outline"
            size="lg"
            fullWidth
            leftIcon={<ArrowLeft className="h-4 w-4" />}
            className="border-navy-200 bg-white text-navy-800 hover:bg-sand-100"
          >
            {<TranslatedText textKey={'forgot.backToLogin'} />}
          </Button>
        </Link>
      </form>
    </div>
  );
}
