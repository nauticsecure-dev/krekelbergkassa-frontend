'use client';

import * as React from 'react';
import {
  Bell,
  CheckCheck,
  MessageCircle,
  Sparkles,
} from 'lucide-react';
import { PortalPageHeader } from '@/components/portal/PortalShell';
import {
  groupByDateKey,
  PortalContent,
  PortalDetailGrid,
  PortalFilterBar,
  PortalFilterPill,
  PortalInteractiveRow,
  PortalModalBody,
  PortalModalFooter,
  PortalModalHeader,
  PortalSectionCard,
  PortalSectionLabel,
} from '@/components/portal/PortalUi';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { LoadingState, ErrorState, EmptyState } from '@/components/admin/DataState';
import { useMutation, useQuery } from '@/lib/hooks/useAsync';
import { portalService } from '@/lib/services';
import type { PortalTimelineItem } from '@/lib/api-types';
import { useIntl } from '@/i18n/IntlProvider';
import { formatDateTime } from '@/lib/format';
import { useToast } from '@/components/ui/ToastProvider';
import { getApiErrorMessage } from '@/lib/api-error';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

type ReadFilter = '' | 'unread' | 'read';

function priorityTone(priority?: string) {
  const p = (priority ?? '').toLowerCase();
  if (p.includes('urgent')) return 'danger' as const;
  if (p.includes('high')) return 'warning' as const;
  if (p.includes('low')) return 'sand' as const;
  return 'marine' as const;
}

function isUnread(item: PortalTimelineItem) {
  return !item.read_at && item.status !== 'read';
}

export default function PortalMessagesPage() {
  const { t, locale } = useIntl();
  const { push } = useToast();
  const dateLocale = locale === 'en' ? 'en-GB' : locale === 'de' ? 'de-DE' : 'nl-NL';
  const [readFilter, setReadFilter] = React.useState<ReadFilter>('');
  const [selected, setSelected] = React.useState<PortalTimelineItem | null>(null);
  const [confirmMarkAll, setConfirmMarkAll] = React.useState(false);
  // Trello #89: paginate beyond the first 50 items.
  const [perPage, setPerPage] = React.useState(50);

  const timeline = useQuery([readFilter, perPage], () =>
    portalService.timeline({
      status: readFilter || undefined,
      per_page: perPage,
    })
  );

  const [replyBody, setReplyBody] = React.useState('');
  const markRead = useMutation(portalService.markRead);
  const markAllRead = useMutation(portalService.markAllRead);
  const postComment = useMutation(
    ({ id, message }: { id: string; message: string }) => portalService.timelineComment(id, message)
  );

  const items = timeline.data?.items ?? [];
  const unreadCount = timeline.data?.pagination.unread_count ?? items.filter(isUnread).length;
  const grouped = groupByDateKey(items);

  const openItem = async (item: PortalTimelineItem) => {
    setSelected(item);
    setReplyBody('');
    if (isUnread(item)) {
      try {
        await markRead.mutate(item.id);
        await timeline.refetch();
      } catch {
        /* non-blocking */
      }
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllRead.mutate();
      push({ tone: 'success', title: t('adminNew.portal.messages.markAllDone') });
      await timeline.refetch();
    } catch (err) {
      push({
        tone: 'error',
        title: t('adminNew.common.operationFailed'),
        message: getApiErrorMessage(err),
      });
    }
  };

  return (
    <>
      <PortalPageHeader
        title={t('adminNew.portal.messages.title')}
        subtitle={t('adminNew.portal.messages.subtitle')}
        stats={[
          {
            label: t('adminNew.portal.messages.metricTotal'),
            value: timeline.data?.pagination.total ?? items.length,
            icon: MessageCircle,
            tone: 'marine',
            loading: timeline.loading,
          },
          {
            label: t('adminNew.portal.messages.metricUnread'),
            value: unreadCount,
            icon: Bell,
            tone: unreadCount > 0 ? 'danger' : 'success',
            loading: timeline.loading,
          },
          {
            label: t('adminNew.portal.messages.metricLatest'),
            value: items[0]?.created_at
              ? formatDateTime(items[0].created_at, dateLocale).split(',')[0]
              : '—',
            icon: Sparkles,
            tone: 'gold',
            loading: timeline.loading,
          },
          {
            label: t('adminNew.portal.messages.metricPriority'),
            value: items.find((i) => (i.priority ?? '').toLowerCase().includes('urgent'))
              ? t('adminNew.portal.messages.priorityUrgent')
              : t('adminNew.portal.messages.priorityNormal'),
            icon: Bell,
            tone: 'navy',
            loading: timeline.loading,
          },
        ]}
      />

      <PortalContent>
        <PortalSectionCard
          title={t('adminNew.portal.messages.title')}
          description={t('adminNew.portal.messages.listOverview')}
          icon={MessageCircle}
          action={
            unreadCount > 0 ? (
              <Button
                variant="outline"
                size="sm"
                leftIcon={<CheckCheck className="h-4 w-4" />}
                disabled={markAllRead.loading}
                onClick={() => setConfirmMarkAll(true)}
              >
                {t('adminNew.portal.messages.markAll')}
              </Button>
            ) : null
          }
        >
        <PortalFilterBar className="mb-4">
          {(
            [
              ['', t('adminNew.portal.messages.filterAll')],
              ['unread', t('adminNew.portal.messages.filterUnread')],
              ['read', t('adminNew.portal.messages.filterRead')],
            ] as const
          ).map(([value, label]) => (
            <PortalFilterPill
              key={value || 'all'}
              active={readFilter === value}
              onClick={() => setReadFilter(value)}
            >
              {label}
            </PortalFilterPill>
          ))}
        </PortalFilterBar>

        {timeline.loading ? (
          <LoadingState label={t('adminNew.portal.messages.loading')} variant="list" />
        ) : null}

        {!timeline.loading && timeline.error ? (
          <ErrorState message={timeline.error} onRetry={() => void timeline.refetch()} />
        ) : null}

        {!timeline.loading && !timeline.error && items.length === 0 ? (
          <EmptyState
            title={t('adminNew.portal.messages.empty')}
            message={t('adminNew.portal.messages.emptyMessage')}
          />
        ) : null}

        {!timeline.loading && !timeline.error && items.length > 0 ? (
          <div className="space-y-5">
            {grouped.map(([dateKey, dayItems]) => (
              <div key={dateKey}>
                <PortalSectionLabel>
                  {dateKey === 'unknown'
                    ? t('adminNew.portal.messages.unknownDate')
                    : formatDateTime(`${dateKey}T12:00:00`, dateLocale).split(',')[0]}
                </PortalSectionLabel>
                <div className="space-y-2.5">
                  {dayItems.map((item) => {
                    const msg = item as PortalTimelineItem;
                    return (
                      <PortalInteractiveRow
                        key={msg.id}
                        icon={MessageCircle}
                        tone={priorityTone(msg.priority)}
                        title={String(msg.title ?? t('adminNew.portal.messages.item'))}
                        subtitle={String(msg.body ?? msg.message ?? '')}
                        meta={formatDateTime(String(msg.created_at ?? ''), dateLocale)}
                        unread={isUnread(msg)}
                        priority={
                          (msg.priority ?? '').toLowerCase().includes('urgent')
                            ? 'urgent'
                            : (msg.priority ?? '').toLowerCase().includes('high')
                              ? 'high'
                              : 'normal'
                        }
                        trailing={
                          msg.type ? (
                            <Badge tone="sand" className="hidden sm:inline-flex">
                              {msg.type}
                            </Badge>
                          ) : null
                        }
                        onClick={() => void openItem(msg)}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {/* Trello #89: load more beyond the first 50 */}
        {!timeline.loading && timeline.data?.pagination?.has_more ? (
          <div className="mt-4 flex justify-center">
            <Button variant="outline" size="sm" onClick={() => setPerPage((p) => p + 50)}>
              {t('adminNew.portal.messages.loadMore')}
            </Button>
          </div>
        ) : null}
        </PortalSectionCard>
      </PortalContent>

      <Modal open={!!selected} onClose={() => setSelected(null)} size="lg">
        {selected ? (
          <>
            <PortalModalHeader
              eyebrow={selected.type ?? t('adminNew.portal.messages.item')}
              title={String(selected.title ?? t('adminNew.portal.messages.item'))}
              subtitle={formatDateTime(String(selected.created_at ?? ''), dateLocale)}
            />
            <PortalModalBody>
              <p className="text-sm leading-relaxed text-navy-700">
                {String(selected.body ?? selected.message ?? '')}
              </p>
              <PortalDetailGrid
                items={[
                  {
                    label: t('adminNew.portal.messages.priorityLabel'),
                    value: selected.priority ?? '—',
                  },
                  {
                    label: t('adminNew.portal.messages.statusLabel'),
                    value: isUnread(selected)
                      ? t('adminNew.portal.messages.filterUnread')
                      : t('adminNew.portal.messages.filterRead'),
                  },
                  ...(selected.boat ? [{ label: t('adminNew.portal.messages.boatLabel', { defaultValue: 'Boot' }), value: String((selected.boat as Record<string, unknown>).name ?? '') }] : []),
                  ...(selected.category ? [{ label: t('adminNew.portal.messages.categoryLabel', { defaultValue: 'Categorie' }), value: selected.category }] : []),
                ]}
              />
              {/* Existing comments */}
              {Array.isArray(selected.comments) && (selected.comments as Record<string, unknown>[]).length > 0 ? (
                <div className="mt-4 space-y-2 border-t border-navy-100 pt-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">
                    {t('adminNew.portal.messages.replies', { defaultValue: 'Reacties' })}
                  </p>
                  {(selected.comments as Record<string, unknown>[]).map((c, ci) => {
                    const isCustomer = String(c.actor_type ?? '') === 'customer';
                    return (
                      <div key={String(c.id ?? ci)} className={`rounded-lg px-3 py-2 text-sm ${isCustomer ? 'bg-marine-50 text-marine-900' : 'bg-sand-50 text-navy-700'}`}>
                        <span className="font-semibold">
                          {isCustomer
                            ? t('adminNew.portal.messages.you', { defaultValue: 'Jij' })
                            : t('adminNew.portal.messages.marina', { defaultValue: 'Krekelberg' })}:
                        </span>{' '}
                        {String(c.message ?? '')}
                      </div>
                    );
                  })}
                </div>
              ) : null}
              {/* Reply textarea */}
              <div className="mt-4 border-t border-navy-100 pt-3">
                <textarea
                  className="input-base min-h-20 w-full text-sm"
                  placeholder={t('adminNew.portal.messages.replyPlaceholder', { defaultValue: 'Typ uw reactie...' })}
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                />
              </div>
            </PortalModalBody>
            <PortalModalFooter>
              <Button variant="outline" onClick={() => setSelected(null)}>
                {t('adminNew.common.cancel')}
              </Button>
              {/* CTA button when present */}
              {selected.cta_url ? (
                <a href={selected.cta_url.startsWith('http') ? selected.cta_url : `/${locale}${selected.cta_url}`}>
                  <Button variant="outline">
                    {selected.cta_label ?? t('adminNew.portal.messages.openItem')}
                  </Button>
                </a>
              ) : null}
              {/* Reply send button */}
              <Button
                variant="gold"
                disabled={!replyBody.trim() || postComment.loading}
                onClick={async () => {
                  if (!replyBody.trim() || !selected) return;
                  try {
                    await postComment.mutate({ id: selected.id, message: replyBody.trim() });
                    setReplyBody('');
                    push({ tone: 'success', title: t('adminNew.portal.messages.replySent', { defaultValue: 'Reactie verstuurd' }) });
                    await timeline.refetch();
                    setSelected(null);
                  } catch (err) {
                    push({ tone: 'error', title: t('adminNew.common.operationFailed'), message: getApiErrorMessage(err) });
                  }
                }}
              >
                {postComment.loading
                  ? t('adminNew.common.saving')
                  : t('adminNew.portal.messages.reply', { defaultValue: 'Reageer' })}
              </Button>
            </PortalModalFooter>
          </>
        ) : null}
      </Modal>

      <ConfirmModal
        open={confirmMarkAll}
        onClose={() => setConfirmMarkAll(false)}
        onConfirm={async () => {
          await handleMarkAllRead();
          setConfirmMarkAll(false);
        }}
        title={t('adminNew.portal.messages.markAll')}
        message={t('adminNew.portal.messages.confirmMarkAll', { count: String(unreadCount) })}
        confirmLabel={t('adminNew.portal.messages.markAll')}
        cancelLabel={t('adminNew.common.cancel')}
        variant="primary"
        icon={CheckCheck}
        loading={markAllRead.loading}
      />
    </>
  );
}
