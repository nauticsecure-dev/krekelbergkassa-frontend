'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { CheckCircle, FileText, Loader2, Ship } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/ToastProvider';
import { getApiErrorMessage } from '@/lib/api-error';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/format';

interface ContractPreview {
  contract_number: string;
  customer_name: string;
  boat_name: string;
  type: string;
  start_date: string;
  end_date: string;
  price_total: number;
  deposit_percentage: number;
  deposit_amount: number;
  already_signed: boolean;
  signed_at: string | null;
  contract_html: string | null;
}

export default function SigningPage() {
  const params = useParams<{ token: string; locale: string }>();
  const { push } = useToast();
  const token = params.token;

  const [contract, setContract] = React.useState<ContractPreview | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [signing, setSigning] = React.useState(false);
  const [signed, setSigned] = React.useState(false);

  React.useEffect(() => {
    if (!token) return;
    setLoading(true);
    api<ContractPreview>(`/v1/contract/tekenen/${token}`)
      .then((data) => {
        setContract(data);
        if (data.already_signed) setSigned(true);
      })
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [token]);

  const onSign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSigning(true);
    try {
      await api(`/v1/contract/tekenen/${token}`, {
        method: 'POST',
        body: { signed_by_name: name, signed_by_email: email },
      });
      setSigned(true);
      push({ tone: 'success', title: 'Contract ondertekend' });
    } catch (err) {
      push({ tone: 'error', title: 'Ondertekening mislukt', message: getApiErrorMessage(err) });
    } finally {
      setSigning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-navy-400" />
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-center">
        <div>
          <p className="text-lg font-semibold text-navy-900">Contract niet gevonden</p>
          <p className="mt-1 text-sm text-navy-500">{error ?? 'De link is ongeldig of verlopen.'}</p>
        </div>
      </div>
    );
  }

  if (signed) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-md text-center">
          <CheckCircle className="mx-auto h-16 w-16 text-emerald-500" />
          <h1 className="mt-4 text-2xl font-bold text-navy-900">Contract ondertekend</h1>
          <p className="mt-2 text-navy-600">
            Uw stallingcontract <strong>{contract.contract_number}</strong> is succesvol ondertekend.
            U ontvangt een bevestiging per e-mail.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sand-50 py-12">
      <div className="mx-auto max-w-2xl px-4">
        {/* Header */}
        <div className="mb-8 text-center">
          <Ship className="mx-auto h-10 w-10 text-marine-700" />
          <h1 className="mt-3 text-2xl font-bold text-navy-900">Stallingcontract ondertekenen</h1>
          <p className="mt-1 text-navy-500">Krekelberg Nautic</p>
        </div>

        {/* Contract summary */}
        <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-navy-400">
            <FileText className="h-4 w-4" />
            Contractgegevens
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <dt className="text-navy-500">Contractnummer</dt>
              <dd className="font-semibold text-navy-900">{contract.contract_number}</dd>
            </div>
            <div>
              <dt className="text-navy-500">Boot</dt>
              <dd className="font-semibold text-navy-900">{contract.boat_name}</dd>
            </div>
            <div>
              <dt className="text-navy-500">Periode</dt>
              <dd className="font-semibold text-navy-900">{contract.start_date} – {contract.end_date}</dd>
            </div>
            <div>
              <dt className="text-navy-500">Totaalbedrag</dt>
              <dd className="font-semibold text-navy-900">{formatCurrency(contract.price_total / 100, 'nl-NL')}</dd>
            </div>
            {contract.deposit_amount > 0 ? (
              <div>
                <dt className="text-navy-500">Aanbetaling ({contract.deposit_percentage}%)</dt>
                <dd className="font-semibold text-navy-900">{formatCurrency(contract.deposit_amount / 100, 'nl-NL')}</dd>
              </div>
            ) : null}
          </dl>
        </div>

        {/* Contract body if available */}
        {contract.contract_html ? (
          <div
            className="mb-6 rounded-2xl bg-white p-6 shadow-sm prose prose-sm max-w-none overflow-y-auto max-h-96"
            dangerouslySetInnerHTML={{ __html: contract.contract_html }}
          />
        ) : null}

        {/* Signature form */}
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-navy-900">Digitale handtekening</h2>
          <p className="mb-4 text-sm text-navy-600">
            Door uw naam en e-mailadres in te voeren en op &quot;Ondertekenen&quot; te klikken,
            bevestigt u akkoord te gaan met de bovenstaande contractvoorwaarden.
          </p>
          <form onSubmit={(e) => void onSign(e)} className="space-y-4">
            <Input
              label="Uw naam"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder={contract.customer_name}
            />
            <Input
              label="Uw e-mailadres"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="naam@voorbeeld.nl"
            />
            <Button
              type="submit"
              variant="gold"
              className="w-full"
              disabled={signing || !name || !email}
            >
              {signing ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Ondertekenen…
                </span>
              ) : (
                'Contract ondertekenen'
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
