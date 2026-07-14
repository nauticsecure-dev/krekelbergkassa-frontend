'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Activity,
  ArrowUpRight,
  Bot,
  CalendarClock,
  CreditCard,
  Eye,
  EyeOff,
  FileSearch,
  MessageSquare,
  MessageSquarePlus,
  Send,
  Ship,
  User,
  Warehouse,
  Wrench,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import {
  AdminContent,
  AdminFilterPill,
  AdminSearchInput,
  AdminSectionCard,
  AdminSelect,
  AdminTableFooter,
} from '@/components/admin/AdminUi';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { EmptyState, ErrorState, LoadingState } from '@/components/admin/DataState';
import { adminService } from '@/lib/services';
import { useQuery, useMutation } from '@/lib/hooks/useAsync';
import { useToast } from '@/components/ui/ToastProvider';
import { getApiErrorMessage } from '@/lib/api-error';
import { formatDateTime } from '@/lib/format';
import { useIntl } from '@/i18n/IntlProvider';

type Rec = Record<string, unknown>;
const str = (r: Rec | undefined | null, ...keys: string[]): string => {
  if (!r) return '';
  for (const k of keys) {
    const v = r[k];
    if (typeof v === 'string' && v.trim()) return v;
  }
  return '';
};

const CATEGORIES = [
  'finance',
  'accounting',
  'storage',
  'operations',
  'planning',
  'crm',
  'boats',
  'supplier_ocr',
  'system',
] as const;

type Category = (typeof CATEGORIES)[number];

function categoryMeta(category: string): { icon: LucideIcon; tone: React.ComponentProps<typeof Badge>['tone']; label: string } {
  switch (category as Category) {
    case 'finance':
      return { icon: CreditCard, tone: 'gold', label: 'Finance' };
    case 'accounting':
      return { icon: CreditCard, tone: 'gold', label: 'Boekhouding' };
    case 'storage':
      return { icon: Warehouse, tone: 'marine', label: 'Stalling' };
    case 'operations':
      return { icon: Wrench, tone: 'navy', label: 'Werkbonnen' };
    case 'planning':
      return { icon: CalendarClock, tone: 'marine', label: 'Planning' };
    case 'crm':
      return { icon: User, tone: 'success', label: 'CRM' };
    case 'boats':
      return { icon: Ship, tone: 'marine', label: 'Boten' };
    case 'supplier_ocr':
      return { icon: FileSearch, tone: 'navy', label: 'OCR' };
    default:
      return { icon: Activity, tone: 'neutral', label: 'Systeem' };
  }
}

// Map /admin/... backend paths to locale-prefixed frontend URLs.
function resolveCta(item: Rec, locale: string): { label: string; href: string } | null {
  const cta = item.cta as Rec | undefined;
  const rawUrl = cta ? str(cta, 'url') : '';
  if (!rawUrl) return null;

  let href = rawUrl;
  // Strip locale prefix if already present
  href = href.replace(/^\/[a-z]{2}\//, '/');
  // Prefix with locale
  if (href.startsWith('/admin/')) {
    href = `/${locale}${href}`;
  } else if (href.startsWith('http')) {
    // external — keep as-is
  } else {
    return null;
  }

  return { label: str(cta, 'label') || 'Open', href };
}

type DatePreset = 'today' | 'yesterday' | 'last7' | 'thisMonth' | 'custom';

function presetDates(id: DatePreset): { from: string; to: string } {
  const pad = (n: number) => String(n).padStart(2, '0');
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const now = new Date();
  switch (id) {
    case 'today':
      return { from: fmt(now), to: fmt(now) };
    case 'yesterday': {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      return { from: fmt(y), to: fmt(y) };
    }
    case 'last7': {
      const s = new Date(now);
      s.setDate(s.getDate() - 6);
      return { from: fmt(s), to: fmt(now) };
    }
    case 'thisMonth':
      return { from: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`, to: fmt(now) };
    default:
      return { from: '', to: '' };
  }
}

export default function TimelinePage() {
  const { locale, t } = useIntl();
  const { push } = useToast();
  const dateLocale = locale === 'en' ? 'en-GB' : locale === 'de' ? 'de-DE' : 'nl-NL';

  const [search, setSearch] = React.useState('');
  const [category, setCategory] = React.useState('');
  const [priority, setPriority] = React.useState('');
  const [visibility, setVisibility] = React.useState('');
  const [source, setSource] = React.useState('');
  const [from, setFrom] = React.useState('');
  const [to, setTo] = React.useState('');
  const [datePreset, setDatePreset] = React.useState<DatePreset | ''>('');
  const [page, setPage] = React.useState(1);

  // Saved filter presets, persisted per-device.
  const [activePreset, setActivePreset] = React.useState('all');

  // Comment thread state
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const [commentText, setCommentText] = React.useState('');
  const [commentVisibility, setCommentVisibility] = React.useState<'customer' | 'internal'>('customer');

  // Send message modal
  const [showMessageModal, setShowMessageModal] = React.useState(false);
  const [msgCustomerId, setMsgCustomerId] = React.useState('');
  const [msgTitle, setMsgTitle] = React.useState('');
  const [msgBody, setMsgBody] = React.useState('');
  const [msgPriority, setMsgPriority] = React.useState('normal');
  const [msgVisibility, setMsgVisibility] = React.useState<'customer' | 'internal'>('customer');

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
    setDatePreset('');
    switch (id) {
      case 'urgent':
        setCategory('');
        setPriority('urgent');
        setVisibility('');
        setSource('');
        break;
      case 'finance':
        setCategory('finance');
        setPriority('');
        setVisibility('');
        setSource('');
        break;
      case 'storage':
        setCategory('storage');
        setPriority('');
        setVisibility('');
        setSource('');
        break;
      case 'planning':
        setCategory('planning');
        setPriority('');
        setVisibility('');
        setSource('');
        break;
      case 'internal':
        setCategory('');
        setPriority('');
        setVisibility('internal');
        setSource('');
        break;
      case 'audit':
        setCategory('');
        setPriority('');
        setVisibility('');
        setSource('audit');
        break;
      default:
        setCategory('');
        setPriority('');
        setVisibility('');
        setSource('');
    }
  };

  const applyDatePreset = (id: DatePreset) => {
    setDatePreset(id);
    const { from: f, to: tDate } = presetDates(id);
    setFrom(f);
    setTo(tDate);
    setPage(1);
  };

  const searchDebounced = React.useDeferredValue(search);

  const feed = useQuery([searchDebounced, category, priority, visibility, source, from, to, page], () =>
    adminService.timelineFeed({
      search: searchDebounced || undefined,
      category: category || undefined,
      priority: priority || undefined,
      visibility: visibility || undefined,
      source: source || undefined,
      from: from || undefined,
      to: to || undefined,
      page,
      per_page: 30,
    })
  );

  const postComment = useMutation(
    ({ id, message, vis }: { id: string; message: string; vis: 'customer' | 'internal' }) =>
      adminService.timelineComment(id, { message, visibility: vis })
  );

  const sendMessage = useMutation(
    (payload: { customer_id: string; title: string; message: string; priority: 'low' | 'normal' | 'high' | 'urgent'; visibility: 'customer' | 'internal' }) =>
      adminService.timelineMessage(payload)
  );

  const rows = (feed.data?.data ?? []) as Rec[];

  const handleComment = async (sourceId: string) => {
    if (!commentText.trim()) return;
    try {
      await postComment.mutate({ id: sourceId, message: commentText, vis: commentVisibility });
      setCommentText('');
      void feed.refetch();
    } catch (err) {
      push({ tone: 'error', title: 'Fout', message: getApiErrorMessage(err) });
    }
  };

  const handleSendMessage = async () => {
    try {
      await sendMessage.mutate({
        customer_id: msgCustomerId,
        title: msgTitle,
        message: msgBody,
        priority: msgPriority as 'low' | 'normal' | 'high' | 'urgent',
        visibility: msgVisibility,
      });
      setShowMessageModal(false);
      setMsgCustomerId('');
      setMsgTitle('');
      setMsgBody('');
      push({ tone: 'success', title: 'Verzonden', message: 'Bericht toegevoegd aan timeline.' });
      void feed.refetch();
    } catch (err) {
      push({ tone: 'error', title: 'Fout', message: getApiErrorMessage(err) });
    }
  };

  return (
    <>
      <AdminPageHeader
        title={t('adminNew.timeline.title')}
        subtitle={t('adminNew.timeline.subtitle')}
        rightSlot={
          <Button variant="gold" size="sm" onClick={() => setShowMessageModal(true)}>
            <MessageSquarePlus className="mr-1.5 h-4 w-4" />
            {t('adminNew.timeline.sendMessage', { defaultValue: 'Bericht sturen' })}
          </Button>
        }
      />
      <AdminContent>
        <AdminSectionCard
          title={t('adminNew.timeline.feedTitle')}
          description={t('adminNew.timeline.feedSubtitle')}
          icon={Activity}
        >
          {/* Quick preset pills */}
          <div className="mb-3 flex flex-wrap gap-2">
            {(['all', 'urgent', 'finance', 'storage', 'planning', 'internal', 'audit'] as const).map((id) => (
              <AdminFilterPill
                key={id}
                active={activePreset === id}
                onClick={() => applyPreset(id)}
              >
                {t(`adminNew.timeline.presets.${id}`, { defaultValue: id })}
              </AdminFilterPill>
            ))}
          </div>

          {/* Date presets */}
          <div className="mb-3 flex flex-wrap gap-2">
            {(['today', 'yesterday', 'last7', 'thisMonth'] as const).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => applyDatePreset(id)}
                className={
                  datePreset === id
                    ? 'rounded-full bg-navy-700 px-3 py-1 text-xs font-semibold text-white'
                    : 'rounded-full border border-navy-200 px-3 py-1 text-xs font-medium text-navy-500 hover:bg-sand-50'
                }
              >
                {t(`adminNew.timeline.datePresets.${id}`, { defaultValue: id })}
              </button>
            ))}
            {(from || to) && (
              <button
                type="button"
                onClick={() => { setFrom(''); setTo(''); setDatePreset(''); }}
                className="flex items-center gap-1 rounded-full border border-navy-200 px-3 py-1 text-xs font-medium text-navy-500 hover:bg-sand-50"
              >
                <X className="h-3 w-3" />
                {t('adminNew.common.clear', { defaultValue: 'Wis datum' })}
              </button>
            )}
          </div>

          {/* Search + filters */}
          <div className="mb-4 flex flex-wrap items-end gap-2">
            <AdminSearchInput
              value={search}
              onChange={(v) => { setSearch(v); setPage(1); }}
              placeholder={t('adminNew.timeline.searchPlaceholder')}
              className="min-w-[200px] flex-1"
            />
            <AdminSelect
              value={category}
              onChange={(v) => { setCategory(v); setActivePreset('all'); setPage(1); }}
            >
              <option value="">{t('adminNew.timeline.allCategories')}</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {categoryMeta(c).label}
                </option>
              ))}
            </AdminSelect>
            <AdminSelect
              value={priority}
              onChange={(v) => { setPriority(v); setPage(1); }}
            >
              <option value="">{t('adminNew.timeline.allPriorities', { defaultValue: 'Alle prioriteiten' })}</option>
              <option value="urgent">Urgent</option>
              <option value="high">Hoog</option>
              <option value="normal">Normaal</option>
              <option value="low">Laag</option>
            </AdminSelect>
            <AdminSelect
              value={visibility}
              onChange={(v) => { setVisibility(v); setActivePreset('all'); setPage(1); }}
            >
              <option value="">{t('adminNew.timeline.allVisibility', { defaultValue: 'Alle zichtbaarheid' })}</option>
              <option value="customer">{t('adminNew.customerDetail.timelineCustomer', { defaultValue: 'Klant' })}</option>
              <option value="internal">{t('adminNew.customerDetail.timelineInternal', { defaultValue: 'Intern' })}</option>
            </AdminSelect>
            <AdminSelect
              value={source}
              onChange={(v) => { setSource(v); setActivePreset('all'); setPage(1); }}
            >
              <option value="">{t('adminNew.timeline.allSources', { defaultValue: 'Alle bronnen' })}</option>
              <option value="timeline">{t('adminNew.timeline.sourceTimeline', { defaultValue: 'Timeline' })}</option>
              <option value="audit">{t('adminNew.timeline.sourceAudit', { defaultValue: 'Auditlog' })}</option>
            </AdminSelect>
            <div className="flex gap-2">
              <Input
                type="date"
                aria-label={t('adminNew.timeline.from')}
                value={from}
                onChange={(e) => { setFrom(e.target.value); setDatePreset('custom'); setPage(1); }}
              />
              <Input
                type="date"
                aria-label={t('adminNew.timeline.to')}
                value={to}
                onChange={(e) => { setTo(e.target.value); setDatePreset('custom'); setPage(1); }}
              />
            </div>
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
                const itemSource = str(item, 'source');
                const sourceId = str(item, 'source_id', 'id').replace(/^(timeline|audit):/, '');
                const dedupeId = str(item, 'id') || String(i);
                const cat = str(item, 'category') || 'system';
                const meta = categoryMeta(cat);
                const Icon = meta.icon;
                const cta = resolveCta(item, locale);
                const itemPriority = str(item, 'priority');
                const isInternal = str(item, 'visibility') === 'internal';
                const createdBy = item.created_by as Rec | null;
                const customer = item.customer as Rec | null;
                const boat = item.boat as Rec | null;
                const isExpanded = expandedId === dedupeId;
                const comments = (item.comments as Rec[] | undefined) ?? [];

                return (
                  <li key={dedupeId} className="relative">
                    <span className="absolute -left-[27px] flex h-5 w-5 items-center justify-center rounded-full bg-white ring-1 ring-navy-100">
                      <Icon className="h-3 w-3 text-navy-500" />
                    </span>
                    <div className="rounded-xl border border-navy-100/70 bg-white shadow-sm">
                      <div className="p-3">
                        {/* Header row */}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-navy-900">
                              {str(item, 'title', 'type') || '—'}
                            </span>
                            <Badge tone={meta.tone}>{meta.label}</Badge>
                            {(itemPriority === 'high' || itemPriority === 'urgent') && (
                              <Badge tone="danger">{itemPriority}</Badge>
                            )}
                            {isInternal && (
                              <span className="flex items-center gap-0.5 rounded-full bg-navy-50 px-2 py-0.5 text-xs font-medium text-navy-500">
                                <EyeOff className="h-3 w-3" />
                                Intern
                              </span>
                            )}
                            {itemSource === 'audit' && (
                              <span className="flex items-center gap-0.5 rounded-full bg-sand-100 px-2 py-0.5 text-xs font-medium text-navy-500">
                                <Bot className="h-3 w-3" />
                                Audit
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-navy-400">
                            {str(item, 'created_at') ? formatDateTime(str(item, 'created_at'), dateLocale) : ''}
                          </span>
                        </div>

                        {/* Description */}
                        {str(item, 'description') ? (
                          <p className="mt-1 text-sm text-navy-600">{str(item, 'description')}</p>
                        ) : null}

                        {/* Meta: customer, boat, created_by, cta */}
                        <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-navy-400">
                          {customer?.name ? (
                            <Link
                              href={`/${locale}/admin/klanten/${String(customer.id)}`}
                              className="flex items-center gap-0.5 hover:text-marine-700"
                            >
                              <User className="h-3 w-3" />
                              {String(customer.name)}
                            </Link>
                          ) : null}
                          {boat?.name ? (
                            <Link
                              href={`/${locale}/admin/boten/${String(boat.id)}`}
                              className="flex items-center gap-0.5 hover:text-marine-700"
                            >
                              <Ship className="h-3 w-3" />
                              {String(boat.name)}
                            </Link>
                          ) : null}
                          {createdBy?.name ? (
                            <span className="flex items-center gap-0.5">
                              <Eye className="h-3 w-3" />
                              {String(createdBy.name)}
                            </span>
                          ) : null}
                          {cta ? (
                            <a
                              href={cta.href}
                              className="inline-flex items-center gap-0.5 font-semibold text-marine-700 hover:text-marine-900"
                            >
                              {cta.label}
                              <ArrowUpRight className="h-3 w-3" />
                            </a>
                          ) : null}
                          {/* boat_moved special metadata */}
                          {str(item, 'type') === 'boat_moved' && item.metadata ? (
                            <span className="text-navy-500">
                              {str(item.metadata as Rec, 'from_location')} → {str(item.metadata as Rec, 'to_location')}
                            </span>
                          ) : null}
                          {/* Comment toggle (only for timeline items, not audit) */}
                          {itemSource !== 'audit' && (
                            <button
                              type="button"
                              onClick={() => setExpandedId(isExpanded ? null : dedupeId)}
                              className="flex items-center gap-0.5 hover:text-marine-700"
                            >
                              <MessageSquare className="h-3 w-3" />
                              {comments.length > 0 ? comments.length : ''}
                              {isExpanded ? ' Sluiten' : ' Reactie'}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Comment thread */}
                      {isExpanded && itemSource !== 'audit' && (
                        <div className="border-t border-navy-50 px-3 py-3">
                          {comments.length > 0 ? (
                            <ol className="mb-3 space-y-2">
                              {comments.map((c, ci) => {
                                const cr = c as Rec;
                                const cu = cr.created_by as Rec | null;
                                const isInternalComment = str(cr, 'visibility') === 'internal';
                                return (
                                  <li key={str(cr, 'id') || ci} className="text-sm">
                                    <div className="flex items-center gap-2 text-xs text-navy-400">
                                      <span className="font-semibold text-navy-600">
                                        {cu?.name ? String(cu.name) : str(cr, 'actor_type')}
                                      </span>
                                      {isInternalComment && (
                                        <span className="rounded bg-navy-50 px-1 text-[10px] text-navy-400">intern</span>
                                      )}
                                      <span>{str(cr, 'created_at') ? formatDateTime(str(cr, 'created_at'), dateLocale) : ''}</span>
                                    </div>
                                    <p className="mt-0.5 text-navy-700">{str(cr, 'message')}</p>
                                  </li>
                                );
                              })}
                            </ol>
                          ) : (
                            <p className="mb-3 text-xs text-navy-400">Nog geen reacties.</p>
                          )}
                          <div className="flex gap-2">
                            <textarea
                              className="input-base min-h-[60px] flex-1 resize-none text-sm"
                              placeholder="Reactie toevoegen…"
                              value={commentText}
                              onChange={(e) => setCommentText(e.target.value)}
                            />
                            <div className="flex flex-col gap-1">
                              <select
                                className="input-base text-xs"
                                value={commentVisibility}
                                onChange={(e) => setCommentVisibility(e.target.value as 'customer' | 'internal')}
                              >
                                <option value="customer">Klant</option>
                                <option value="internal">Intern</option>
                              </select>
                              <Button
                                size="sm"
                                variant="gold"
                                onClick={() => void handleComment(sourceId)}
                                disabled={postComment.loading || !commentText.trim()}
                              >
                                <Send className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
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

      {/* Send message modal */}
      <Modal
        open={showMessageModal}
        onClose={() => setShowMessageModal(false)}
      >
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-navy-900">
            {t('adminNew.timeline.sendMessage', { defaultValue: 'Bericht naar klant' })}
          </h2>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-navy-500">
              Klant ID
            </label>
            <Input
              value={msgCustomerId}
              onChange={(e) => setMsgCustomerId(e.target.value)}
              placeholder="UUID van klant"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-navy-500">
              Onderwerp
            </label>
            <Input
              value={msgTitle}
              onChange={(e) => setMsgTitle(e.target.value)}
              placeholder="Onderwerp"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-navy-500">
              Bericht
            </label>
            <textarea
              className="input-base min-h-[100px] w-full resize-none text-sm"
              value={msgBody}
              onChange={(e) => setMsgBody(e.target.value)}
              placeholder="Typ het bericht hier…"
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-navy-500">
                Prioriteit
              </label>
              <AdminSelect value={msgPriority} onChange={setMsgPriority}>
                <option value="low">Laag</option>
                <option value="normal">Normaal</option>
                <option value="high">Hoog</option>
                <option value="urgent">Urgent</option>
              </AdminSelect>
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-navy-500">
                Zichtbaar voor
              </label>
              <AdminSelect value={msgVisibility} onChange={(v) => setMsgVisibility(v as 'customer' | 'internal')}>
                <option value="customer">Klant</option>
                <option value="internal">Alleen intern</option>
              </AdminSelect>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={() => setShowMessageModal(false)}>
              Annuleren
            </Button>
            <Button
              variant="gold"
              size="sm"
              onClick={() => void handleSendMessage()}
              disabled={sendMessage.loading || !msgCustomerId || !msgTitle || !msgBody}
            >
              Verzenden
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
