'use client';


import { TranslatedText } from '@/components/cms/TranslatedText';
import * as React from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, CheckCircle2, Mail } from 'lucide-react';
import { useIntl } from '@/i18n/IntlProvider';
import { Button } from '@/components/ui/Button';

export default function ForgotPasswordPage() {
  const { t, locale } = useIntl();
  const [email, setEmail] = React.useState('');
  const [sent, setSent] = React.useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
  };

  if (sent) {
    return (
      <div>
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <CheckCircle2 className="h-6 w-6" />
        </span>
        <h2 className="heading-display mt-5 text-3xl text-navy-900 sm:text-[34px]">
          {<TranslatedText textKey={'forgot.sentTitle'} />}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-navy-500">
          {<TranslatedText textKey={'forgot.sentDescription'} vars={{ email }} />}
        </p>
        <p className="mt-3 text-xs text-navy-400">{<TranslatedText textKey={'forgot.checkSpam'} />}</p>

        <Link href={`/${locale}/login`} className="mt-7 block">
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
        {<TranslatedText textKey={'forgot.title'} />}
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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="auth-input"
              required
              placeholder={t('adminNew.auth.emailPlaceholder')}
              autoComplete="email"
            />
          </div>
        </div>

        <Button
          type="submit"
          size="lg"
          fullWidth
          rightIcon={<ArrowRight className="h-4 w-4" />}
          className="bg-navy-900 text-white hover:bg-navy-800"
        >
          {<TranslatedText textKey={'forgot.submit'} />}
        </Button>

        <Link href={`/${locale}/login`}>
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
