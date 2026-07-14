'use client';

import * as React from 'react';
import {
  Activity,
  ArrowUpRight,
  CalendarClock,
  CreditCard,
  FileText,
  Ship,
  User,
  Warehouse,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import {
  AdminContent,
  AdminSearchInput,
  AdminSectionCard,
  AdminSelect,
  AdminTableFooter,
} from '@/components/admin/AdminUi';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { EmptyState, ErrorState, LoadingState } from '@/components/admin/DataState';
import { adminService } from '@/lib/services';
import { useQuery } from '@/lib/hooks/useAsync';
import { formatDateTime } from '@/lib/format';
import { useIntl } from '@/i18n/IntlProvider';

type Rec = Record<string, unknown>;
const str = (r: Rec, ...keys: string[]): string => {
  for (const k of keys) {
    const v = r[k];
    if (typeof v === 'string' && v.trim()) return v;
  }
  return '';
};

// Must match TimelineItem::CATEGORIES on the backend exactly.
const CATEGORIES = [
  'storage',
  'work_orders',
  'invoices',
  'payments',
  'planning',
  'photos',
  'documents',
  'contracts',
  'notifications',
  'system',
];

function categoryMeta(category: string): { icon: LucideIcon; tone: React.ComponentProps<typeof Badge>['tone'] } {
  switch (category) {
    case 'invoices':
    case 'payments':
      return { icon: CreditCard, tone: 'gold' };
    case 'storage':
      return { icon: Warehouse, tone: 'marine' };
    case 'work_orders':
      return { icon: Ship, tone: 'marine' };
    case 'contracts':
      return { icon: User, tone: 'success' };
    case 'planning':
      return { icon: CalendarClock, tone: 'marine' };
    case 'documents':
    case 'photos':
      return { icon: FileText, tone: 'navy' };
    default:
      return { icon: Activity, tone: 'neutral' };
  }
}

export default function TimelinePage() {
  const { locale, t } = useIntl();
  const dateLocale = locale === 'en' ? 'en-GB' : locale === 'de' ? 'de-DE' : 'nl-NL';

  const [search, setSearch] = React.useState('');
  const [category, setCategory] = React.useState('');
  const [priority, setPriority] = React.useState('');
  const [visibility, setVisibility] = React.useState('');
  const [from, setFrom] = React.useState('');
  const [to, setTo] = React.useState('');
  const [page, setPage] = React.useState(1);
  // Saved filter presets, persisted per-device.
  const [activePreset, setActivePreset] = React.useState('all');

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem('timeline_preset');
    if (saved) applyPreset(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyPreset = (id: string) => {
    setActivePreset(id);
    if (typeof window !== 'undefined') window.localStorage.setItem('timeline_preset', id);
    setPage(1);
    switch (id) {
      case 'myTasks':
        setCategory('');
        setPriority('high');
        setVisibility('');
        break;
      case 'invoices':
        setCategory('invoices');
        setPriority('');
        setVisibility('');
        break;
      case 'storage':
        setCategory('storage');
        setPriority('');
        setVisibility('');
        break;
      case 'planning':
        setCategory('planning');
        setPriority('');
        setVisibility('');
        break;
      case 'internal':
        setCategory('');
        setPriority('');
        setVisibility('internal');
        break;
      default:
        setCategory('');
        setPriority('');
        setVisibility('');
    }
  };

  const feed = useQuery([search, category, priority, visibility, from, to, page], () =>
    adminService.timelineFeed({
      search: search || undefined,
      category: category || undefined,
      priority: priority || undefined,
      visibility: visibility || undefined,
      from: from || undefined,
      to: to || undefined,
      page,
      per_page: 30,
    })
  );

  const rows = (feed.data?.data ?? []) as Rec[];

  const ctaHref = (item: Rec): string | null => {
    const cta = item.cta as Rec | undefined;
    const url = cta ? str(cta, 'url') : '';
    if (!url) return null;
    // Map internal API urls to admin pages where we can.
    const inv = url.match(/\/invoices\/([^/]+)/);
    if (inv) return `/${locale}/admin/facturen/${inv[1]}`;
    const wallet = url.match(/\/wallets\/([^/]+)/);
    if (wallet) return `/${locale}/admin/klanten/${wallet[1]}`;
    return url.startsWith('http') ? url : null;
  };

  return (
    <>
      <AdminPageHeader
        title={t('adminNew.timeline.title')}
        subtitle={t('adminNew.timeline.subtitle')}
      />
      <AdminContent>
        <AdminSectionCard
          title={t('adminNew.timeline.feedTitle')}
          description={t('adminNew.timeline.feedSubtitle')}
          icon={Activity}
        >
          {/* Trello #109: saved filter presets */}
          <div className="mb-3 flex flex-wrap gap-2">
            {(['all', 'myTasks', 'invoices', 'storage', 'planning', 'internal'] as const).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => applyPreset(id)}
                className={
                  activePreset === id
                    ? 'rounded-full bg-marine-600 px-3 py-1 text-xs font-semibold text-white'
                    : 'rounded-full border border-navy-200 px-3 py-1 text-xs font-medium text-navy-600 hover:bg-sand-50'
                }
              >
                {t(`adminNew.timeline.presets.${id}`)}
              </button>
            ))}
          </div>
          <div className="mb-4 flex flex-wrap items-end gap-2">
            <AdminSearchInput
              value={search}
              onChange={(v) => {
                setSearch(v);
                setPage(1);
              }}
              placeholder={t('adminNew.timeline.searchPlaceholder')}
              className="flex-1"
            />
            <AdminSelect
              value={category}
              onChange={(v) => {
                setCategory(v);
                setActivePreset('all');
                setPage(1);
              }}
            >
              <option value="">{t('adminNew.timeline.allCategories')}</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {t(`adminNew.timeline.categories.${c}`, { defaultValue: c })}
                </option>
              ))}
            </AdminSelect>
            <AdminSelect
              value={visibility}
              onChange={(v) => {
                setVisibility(v);
                setActivePreset('all');
                setPage(1);
              }}
            >
              <option value="">{t('adminNew.timeline.allVisibility', { defaultValue: 'Alle zichtbaarheid' })}</option>
              <option value="customer">{t('adminNew.customerDetail.timelineCustomer', { defaultValue: 'Klant' })}</option>
              <option value="internal">{t('adminNew.customerDetail.timelineInternal', { defaultValue: 'Intern' })}</option>
            </AdminSelect>
            <Input
              type="date"
              aria-label={t('adminNew.timeline.from')}
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setPage(1);
              }}
            />
            <Input
              type="date"
              aria-label={t('adminNew.timeline.to')}
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setPage(1);
              }}
            />
          </div>

          {feed.loading ? (
            <LoadingState label={t('adminNew.common.loading')} />
          ) : feed.error ? (
            <ErrorState message={feed.error} onRetry={() => void feed.refetch()} />
          ) : rows.length === 0 ? (
            <EmptyState
              title={t('adminNew.timeline.emptyTitle')}
              message={t('adminNew.timeline.emptyMessage')}
            />
          ) : (
            <ol className="relative space-y-3 border-l border-navy-100 pl-5">
              {rows.map((item, i) => {
                const cat = str(item, 'category') || 'system';
                const meta = categoryMeta(cat);
                const Icon = meta.icon;
                const href = ctaHref(item);
                const priority = str(item, 'priority');
                return (
                  <li key={str(item, 'id') || i} className="relative">
                    <span className="absolute -left-[27px] flex h-5 w-5 items-center justify-center rounded-full bg-white ring-1 ring-navy-100">
                      <Icon className="h-3 w-3 text-navy-500" />
                    </span>
                    <div className="rounded-xl border border-navy-100/70 bg-white p-3 shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-navy-900">
                            {str(item, 'title', 'type') || '—'}
                          </span>
                          <Badge tone={meta.tone}>
                            {t(`adminNew.timeline.categories.${cat}`, { defaultValue: cat })}
                          </Badge>
                          {priority === 'high' || priority === 'urgent' ? (
                            <Badge tone="danger">{priority}</Badge>
                          ) : null}
                        </div>
                        <span className="text-xs text-navy-400">
                          {str(item, 'created_at') ? formatDateTime(str(item, 'created_at'), dateLocale) : ''}
                        </span>
                      </div>
                      {str(item, 'description') ? (
                        <p className="mt-1 text-sm text-navy-600">{str(item, 'description')}</p>
                      ) : null}
                      <div className="mt-1.5 flex items-center gap-3 text-xs text-navy-400">
                        {(item.created_by as Rec | undefined)?.name ? (
                          <span>{String((item.created_by as Rec).name)}</span>
                        ) : null}
                        {href ? (
                          <a
                            href={href}
                            className="inline-flex items-center gap-0.5 font-semibold text-marine-700 hover:text-marine-900"
                          >
                            {str(item.cta as Rec, 'label') || t('adminNew.timeline.open')}
                            <ArrowUpRight className="h-3 w-3" />
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}

          {rows.length > 0 && feed.data?.meta ? (
            <div className="mt-4">
              <AdminTableFooter
                summary={t('adminNew.timeline.count', { count: feed.data.meta.total ?? rows.length })}
                meta={feed.data.meta}
                onPageChange={setPage}
              />
            </div>
          ) : null}
        </AdminSectionCard>
      </AdminContent>
    </>
  );
}
