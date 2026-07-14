'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Activity, ArrowLeft } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import {
  AdminContent,
  AdminSearchInput,
  AdminSelect,
  AdminSectionCard,
  AdminTableFooter,
} from '@/components/admin/AdminUi';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { EmptyState, ErrorState, LoadingState } from '@/components/admin/DataState';
import { adminService, customersService, boatsService } from '@/lib/services';
import { useMutation, useQuery } from '@/lib/hooks/useAsync';
import { formatDateTime, formatDate } from '@/lib/format';
import { useIntl } from '@/i18n/IntlProvider';
import { useToast } from '@/components/ui/ToastProvider';
import { getApiErrorMessage } from '@/lib/api-error';

type Rec = Record<string, unknown>;
const str = (r: Rec, ...keys: string[]): string => {
  for (const k of keys) {
    const v = r[k];
    if (typeof v === 'string' && v.trim()) return v;
  }
  return '';
};

export default function CustomerTimelinePage() {
  const { locale, t } = useIntl();
  const { push } = useToast();
  const params = useParams<{ id: string }>();
  const customerId = params?.id ?? '';
  const dateLocale = locale === 'en' ? 'en-GB' : locale === 'de' ? 'de-DE' : 'nl-NL';

  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState('');
  const [visibility, setVisibility] = React.useState('');

  // Composer state
  const [tlTitle, setTlTitle] = React.useState('');
  const [tlBody, setTlBody] = React.useState('');
  const [tlVisibility, setTlVisibility] = React.useState<'internal' | 'customer'>('internal');
  const [tlPriority, setTlPriority] = React.useState<'low' | 'normal' | 'high' | 'urgent'>('normal');
  const [tlBoatId, setTlBoatId] = React.useState('');
  const [commentState, setCommentState] = React.useState<Record<string, { open: boolean; body: string; loading: boolean }>>({});

  const customer = useQuery([customerId], () => customersService.get(customerId).catch(() => null));
  const boats = useQuery([customerId, 'boats'], () =>
    boatsService.list({ customer_id: customerId, per_page: 100 }).catch(() => ({ data: [] }))
  );
  const feed = useQuery([customerId, page, search, visibility], () =>
    adminService.timeline({
      customer_id: customerId,
      per_page: 30,
      page,
      search: search || undefined,
      visibility: visibility || undefined,
    })
  );

  const rows = (feed.data?.data ?? []) as Rec[];

  const postTimeline = useMutation((payload: Parameters<typeof adminService.timelineMessage>[0]) =>
    adminService.timelineMessage(payload)
  );

  const handlePost = async () => {
    if (!tlTitle.trim() || !tlBody.trim()) return;
    try {
      await postTimeline.mutate({
        customer_id: customerId,
        title: tlTitle.trim(),
        message: tlBody.trim(),
        visibility: tlVisibility,
        priority: tlPriority,
        boat_id: tlBoatId || undefined,
      });
      setTlTitle('');
      setTlBody('');
      setTlBoatId('');
      push({ tone: 'success', title: t('adminNew.customerDetail.timelinePosted') });
      setPage(1);
      await feed.refetch();
    } catch (err) {
      push({ tone: 'error', title: t('adminNew.common.operationFailed'), message: getApiErrorMessage(err) });
    }
  };

  const handlePostComment = async (itemId: string) => {
    const cs = commentState[itemId];
    if (!cs?.body.trim()) return;
    setCommentState((prev) => ({ ...prev, [itemId]: { ...prev[itemId], loading: true } }));
    try {
      await adminService.timelineComment(itemId, { message: cs.body.trim() });
      setCommentState((prev) => ({ ...prev, [itemId]: { open: false, body: '', loading: false } }));
      await feed.refetch();
    } catch (err) {
      push({ tone: 'error', title: t('adminNew.common.operationFailed'), message: getApiErrorMessage(err) });
      setCommentState((prev) => ({ ...prev, [itemId]: { ...prev[itemId], loading: false } }));
    }
  };

  return (
    <>
      <AdminPageHeader
        title={customer.data?.name ?? t('adminNew.customerDetail.timeline')}
        subtitle={t('adminNew.customerDetail.timelineSubtitle')}
        rightSlot={
          <Link href={`/${locale}/admin/klanten/${customerId}`}>
            <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
              {t('adminNew.common.back')}
            </Button>
          </Link>
        }
      />
      <AdminContent>
        <AdminSectionCard
          title={t('adminNew.customerDetail.timeline')}
          description={t('adminNew.customerDetail.timelineSubtitle')}
          icon={Activity}
        >
          {/* Composer */}
          <div className="mb-4 rounded-xl border border-navy-100 bg-sand-50/40 p-3 space-y-2">
            <Input
              placeholder={t('adminNew.customerDetail.timelineTitlePlaceholder', { defaultValue: 'Onderwerp / titel' })}
              value={tlTitle}
              onChange={(e) => setTlTitle(e.target.value)}
            />
            <textarea
              className="input-base min-h-16 w-full"
              placeholder={t('adminNew.customerDetail.timelinePlaceholder')}
              value={tlBody}
              onChange={(e) => setTlBody(e.target.value)}
            />
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex overflow-hidden rounded-lg border border-navy-200">
                {(['internal', 'customer'] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setTlVisibility(v)}
                    className={
                      'px-3 py-1.5 text-xs font-semibold transition ' +
                      (tlVisibility === v
                        ? 'bg-marine-600 text-white'
                        : 'bg-white text-navy-600 hover:bg-sand-50')
                    }
                  >
                    {v === 'internal'
                      ? t('adminNew.customerDetail.timelineInternal')
                      : t('adminNew.customerDetail.timelineCustomer')}
                  </button>
                ))}
              </div>
              <select
                className="input-base py-1.5 text-xs"
                value={tlPriority}
                onChange={(e) => setTlPriority(e.target.value as typeof tlPriority)}
              >
                {(['low', 'normal', 'high', 'urgent'] as const).map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              {(boats.data?.data?.length ?? 0) > 0 ? (
                <select
                  className="input-base py-1.5 text-xs"
                  value={tlBoatId}
                  onChange={(e) => setTlBoatId(e.target.value)}
                >
                  <option value="">{t('adminNew.customerDetail.timelineNoBoat', { defaultValue: 'Geen boot' })}</option>
                  {boats.data!.data.map((b) => (
                    <option key={String(b.id)} value={String(b.id)}>{b.name}</option>
                  ))}
                </select>
              ) : null}
              <div className="ml-auto">
                <Button
                  size="sm"
                  variant="gold"
                  disabled={!tlTitle.trim() || !tlBody.trim() || postTimeline.loading}
                  onClick={() => void handlePost()}
                >
                  {t('adminNew.customerDetail.timelinePost')}
                </Button>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="mb-4 flex flex-wrap gap-2">
            <AdminSearchInput
              value={search}
              onChange={(v) => { setSearch(v); setPage(1); }}
              placeholder={t('adminNew.timeline.searchPlaceholder')}
              className="flex-1"
            />
            <AdminSelect
              value={visibility}
              onChange={(v) => { setVisibility(v); setPage(1); }}
            >
              <option value="">{t('adminNew.timeline.allVisibility', { defaultValue: 'Alle' })}</option>
              <option value="customer">{t('adminNew.customerDetail.timelineCustomer')}</option>
              <option value="internal">{t('adminNew.customerDetail.timelineInternal')}</option>
            </AdminSelect>
          </div>

          {feed.loading ? (
            <LoadingState label={t('adminNew.common.loading')} />
          ) : feed.error ? (
            <ErrorState message={feed.error} onRetry={() => void feed.refetch()} />
          ) : rows.length === 0 ? (
            <EmptyState title={t('adminNew.timeline.emptyTitle')} message={t('adminNew.timeline.emptyMessage')} />
          ) : (
            <ol className="relative space-y-3 border-l border-navy-100 pl-5">
              {rows.map((item, i) => {
                const itemId = str(item, 'id') || String(i);
                const vis = str(item, 'visibility');
                const priority = str(item, 'priority');
                const comments = Array.isArray(item.comments) ? item.comments as Rec[] : [];
                const cs = commentState[itemId] ?? { open: false, body: '', loading: false };
                return (
                  <li key={itemId} className="relative">
                    <span className="absolute -left-[27px] flex h-5 w-5 items-center justify-center rounded-full bg-white ring-1 ring-navy-100">
                      <Activity className="h-3 w-3 text-navy-500" />
                    </span>
                    <div className="rounded-xl border border-navy-100/70 bg-white p-3 shadow-sm">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <span className="flex items-center gap-2 flex-wrap font-semibold text-navy-900">
                            {str(item, 'title', 'type') || '—'}
                            {vis === 'internal' ? (
                              <Badge tone="neutral">{t('adminNew.customerDetail.internalNote')}</Badge>
                            ) : null}
                            {priority === 'high' || priority === 'urgent' ? (
                              <Badge tone="danger">{priority}</Badge>
                            ) : null}
                          </span>
                          {str(item, 'message', 'description') ? (
                            <p className="mt-1 text-sm text-navy-600">{str(item, 'message', 'description')}</p>
                          ) : null}
                          {/* Comments */}
                          {comments.length > 0 ? (
                            <div className="mt-2 space-y-1 border-l-2 border-navy-100 pl-3">
                              {comments.map((c, ci) => (
                                <div key={str(c, 'id') || String(ci)} className="text-xs text-navy-600">
                                  <span className="font-semibold">
                                    {str((c.created_by as Rec | undefined) ?? {}, 'name') || str(c, 'actor_type') || 'Staff'}:
                                  </span>{' '}
                                  {str(c, 'message')}
                                  <span className="ml-1 text-navy-400">{str(c, 'created_at') ? formatDate(str(c, 'created_at')) : ''}</span>
                                </div>
                              ))}
                            </div>
                          ) : null}
                          {/* Inline comment form */}
                          {cs.open ? (
                            <div className="mt-2 flex gap-2">
                              <input
                                className="input-base flex-1 py-1 text-sm"
                                placeholder={t('adminNew.customerDetail.commentPlaceholder', { defaultValue: 'Reageer...' })}
                                value={cs.body}
                                onChange={(e) => setCommentState((prev) => ({ ...prev, [itemId]: { ...prev[itemId], body: e.target.value } }))}
                                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handlePostComment(itemId); } }}
                              />
                              <Button size="sm" variant="outline" disabled={cs.loading || !cs.body.trim()} onClick={() => void handlePostComment(itemId)}>
                                {t('adminNew.customerDetail.commentSend', { defaultValue: 'Stuur' })}
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setCommentState((prev) => ({ ...prev, [itemId]: { open: false, body: '', loading: false } }))}>
                                {t('adminNew.common.cancel')}
                              </Button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              className="mt-1.5 text-xs text-marine-700 hover:text-marine-900 underline"
                              onClick={() => setCommentState((prev) => ({ ...prev, [itemId]: { open: true, body: '', loading: false } }))}
                            >
                              {t('adminNew.customerDetail.addComment', { defaultValue: '+ Opmerking' })}
                            </button>
                          )}
                        </div>
                        <span className="text-xs text-navy-400">
                          {str(item, 'created_at') ? formatDateTime(str(item, 'created_at'), dateLocale) : ''}
                        </span>
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
