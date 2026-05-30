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

  const timeline = useQuery([readFilter], () =>
    portalService.timeline({
      status: readFilter || undefined,
      per_page: 50,
    })
  );

  const markRead = useMutation(portalService.markRead);
  const markAllRead = useMutation(portalService.markAllRead);

  const items = timeline.data?.items ?? [];
  const unreadCount = timeline.data?.pagination.unread_count ?? items.filter(isUnread).length;
  const grouped = groupByDateKey(items);

  const openItem = async (item: PortalTimelineItem) => {
    setSelected(item);
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
                ]}
              />
            </PortalModalBody>
            <PortalModalFooter>
              <Button variant="outline" onClick={() => setSelected(null)}>
                {t('adminNew.common.cancel')}
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
