import Link from 'next/link';

export const dynamic = 'force-static';

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-sand-50 p-6">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-navy-900 text-sand-100">
          ⚓
        </div>
        <h1 className="font-display text-3xl text-navy-900">U bent offline</h1>
        <p className="mt-2 text-sm text-navy-500">
          Wij kunnen op dit moment geen verbinding maken. Eerder bezochte pagina&apos;s
          blijven beschikbaar zodra u online bent.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-lg bg-gold-500 px-4 py-2 text-sm font-semibold text-white"
        >
          Probeer opnieuw
        </Link>
      </div>
    </main>
  );
}
