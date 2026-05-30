'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, Search } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { useIntl } from '@/i18n/IntlProvider';
import { searchService } from '@/lib/services';
import { cn } from '@/lib/cn';

const SECTION_KEYS = [
  'customers',
  'boats',
  'invoices',
  'products',
  'stalling',
  'calculator_records',
] as const;

const SECTION_ROUTES: Record<string, (locale: string, item: Record<string, unknown>) => string | null> = {
  customers: (locale, item) =>
    item.id ? `/${locale}/admin/klanten/${item.id}` : null,
  boats: (locale, item) =>
    item.id ? `/${locale}/admin/boten/${item.id}` : null,
  invoices: (locale, item) =>
    item.id ? `/${locale}/admin/facturen/${item.id}` : null,
  products: (locale, item) =>
    item.id ? `/${locale}/admin/producten/${item.id}` : null,
  stalling: () => null,
  calculator_records: (locale) => `/${locale}/admin/calculator`,
};

function itemLabel(section: string, item: Record<string, unknown>) {
  if (section === 'customers') return String(item.name ?? item.email ?? '—');
  if (section === 'boats') return String(item.name ?? '—');
  if (section === 'invoices') return String(item.invoice_number ?? item.id ?? '—');
  if (section === 'products') return String(item.name ?? item.barcode ?? '—');
  if (section === 'stalling') return String(item.contract_number ?? '—');
  if (section === 'calculator_records') return String(item.number ?? '—');
  return String(item.id ?? '—');
}

export function AdminGlobalSearch({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { locale, t } = useIntl();
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [query, setQuery] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [results, setResults] = React.useState<Record<string, Array<Record<string, unknown>>>>({});
  const [resultCount, setResultCount] = React.useState(0);

  React.useEffect(() => {
    if (open) {
      setQuery('');
      setResults({});
      setResultCount(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  React.useEffect(() => {
    if (!open || query.trim().length < 2) {
      setResults({});
      setResultCount(0);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await searchService.search(query.trim(), 6);
        setResults(res.results ?? {});
        setResultCount(res.result_count ?? 0);
      } catch {
        setResults({});
        setResultCount(0);
      } finally {
        setLoading(false);
      }
    }, 280);
    return () => clearTimeout(timer);
  }, [query, open]);

  const navigate = (href: string) => {
    onClose();
    router.push(href);
  };

  return (
    <Modal open={open} onClose={onClose} size="lg" className="overflow-visible">
      <div className="border-b border-navy-100 p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('admin.common.search')}
            className="input-base w-full pl-9 pr-10"
          />
          {loading ? (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-navy-400" />
          ) : null}
        </div>
      </div>
      <div className="max-h-[min(60vh,420px)] overflow-y-auto p-2 scrollbar-thin">
        {query.trim().length < 2 ? (
          <p className="px-3 py-6 text-center text-sm text-navy-500">
            {t('adminNew.search.hint')}
          </p>
        ) : null}
        {query.trim().length >= 2 && !loading && resultCount === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-navy-500">
            {t('adminNew.search.noResults')}
          </p>
        ) : null}
        {SECTION_KEYS.map((section) => {
          const items = results[section] ?? [];
          if (!items.length) return null;
          return (
            <div key={section} className="mb-3">
              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-navy-400">
                {t(`adminNew.search.sections.${section}`)}
              </div>
              <ul>
                {items.map((item, idx) => {
                  const href = SECTION_ROUTES[section]?.(locale, item);
                  const label = itemLabel(section, item);
                  return (
                    <li key={`${section}-${idx}`}>
                      {href ? (
                        <Link
                          href={href}
                          onClick={onClose}
                          className="block rounded-lg px-3 py-2 text-sm font-medium text-navy-900 hover:bg-sand-50"
                        >
                          {label}
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            navigate(`/${locale}/admin/${section === 'products' ? 'producten' : section === 'stalling' ? 'stalling' : 'calculator'}`)
                          }
                          className="block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-navy-900 hover:bg-sand-50"
                        >
                          {label}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}

export function useGlobalSearchShortcut(onOpen: () => void) {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onOpen();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onOpen]);
}

export function AdminSearchTrigger({
  onClick,
  className,
}: {
  onClick: () => void;
  className?: string;
}) {
  const { t } = useIntl();
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative hidden w-full max-w-md flex-1 items-center gap-2 rounded-lg border border-navy-100 bg-white px-3 py-2 text-left text-sm text-navy-500 transition hover:border-navy-200 lg:flex',
        className
      )}
    >
      <Search className="h-4 w-4 shrink-0 text-navy-400" />
      <span className="flex-1 truncate">{t('admin.common.search')}</span>
      <kbd className="hidden rounded border border-navy-100 bg-sand-50 px-1.5 py-0.5 text-[10px] font-semibold text-navy-500 sm:inline">
        ⌘K
      </kbd>
    </button>
  );
}
