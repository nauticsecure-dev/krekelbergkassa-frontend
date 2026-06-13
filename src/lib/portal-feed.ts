import type { LucideIcon } from 'lucide-react';
import {
  Calendar,
  CreditCard,
  FileText,
  Gift,
  MessageCircle,
  Ship,
  Warehouse,
} from 'lucide-react';
import type {
  Appointment,
  PortalContract,
  PortalTimelineItem,
  PortalWallet,
} from './api-types';
import { centsToEuro } from './format';

export type FeedTimelineTone =
  | 'marine'
  | 'gold'
  | 'navy'
  | 'sand'
  | 'success'
  | 'warning'
  | 'danger';

export type FeedTimelineGroup = 'today' | 'week' | 'earlier';

export function parseWalletBalance(raw: PortalWallet | string | null | undefined): {
  balance: number;
  active: boolean;
} {
  if (raw == null) return { balance: 0, active: false };
  if (typeof raw === 'string') {
    const normalized = raw.replace(/[^\d.,-]/g, '').replace(',', '.');
    const balance = Number.parseFloat(normalized);
    return { balance: Number.isFinite(balance) ? balance : 0, active: true };
  }
  if (raw.balance_euros != null) {
    const balance = Number(raw.balance_euros);
    return { balance: Number.isFinite(balance) ? balance : 0, active: raw.active !== false };
  }
  const balance = centsToEuro(raw.balance_cents);
  return { balance, active: raw.active !== false || balance > 0 };
}

export function profileCompletion(fields: Array<string | null | undefined>): number {
  if (!fields.length) return 0;
  const filled = fields.filter((value) => value && String(value).trim()).length;
  return Math.round((filled / fields.length) * 100);
}

export function isTimelineUnread(item: PortalTimelineItem) {
  return !item.read_at && item.status !== 'read';
}

// Trello #89: portal feed filter now covers all categories and supports a
// free-text search. Prefers the backend `category` field, falls back to regex.
const TIMELINE_MATCHERS: Record<string, RegExp> = {
  appointments: /appointment|crane|service|afspraak|planning/i,
  invoices: /invoice|billing|factuur/i,
  payments: /payment|paid|refund|betaling|mollie/i,
  storage: /storage|stalling|contract|season|boat_moved|checked/i,
  work_orders: /work[_\s-]?order|werkorder|repair|maintenance/i,
  photos: /photo|image|foto/i,
  documents: /document|file|insurance|certificate/i,
  contracts: /contract|renew|stalling/i,
};

export function filterTimelineItems(
  items: PortalTimelineItem[],
  filter: string,
  search?: string
) {
  let out = items;
  if (filter) {
    const re = TIMELINE_MATCHERS[filter];
    out = out.filter((item) => {
      const cat = ((item as { category?: string }).category ?? '').toLowerCase();
      if (cat && (cat === filter || cat === filter.replace(/s$/, ''))) return true;
      if (!re) return false;
      const haystack = `${cat} ${item.type ?? ''} ${item.related_type ?? ''} ${item.title ?? ''}`;
      return re.test(haystack);
    });
  }
  const q = (search ?? '').trim().toLowerCase();
  if (q) {
    out = out.filter((item) => {
      const hay = `${item.title ?? ''} ${(item as { message?: string }).message ?? ''} ${item.type ?? ''}`.toLowerCase();
      return hay.includes(q);
    });
  }
  return out;
}

export function groupFeedTimeline(items: PortalTimelineItem[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - 7);

  const groups: Record<FeedTimelineGroup, PortalTimelineItem[]> = {
    today: [],
    week: [],
    earlier: [],
  };

  for (const item of items) {
    const raw = item.created_at;
    if (!raw) {
      groups.earlier.push(item);
      continue;
    }
    const date = new Date(raw);
    date.setHours(0, 0, 0, 0);
    if (date.getTime() === today.getTime()) groups.today.push(item);
    else if (date >= weekStart) groups.week.push(item);
    else groups.earlier.push(item);
  }

  return (['today', 'week', 'earlier'] as const)
    .map((key) => ({ key, items: groups[key] }))
    .filter((group) => group.items.length > 0);
}

export function nextUpcomingAppointment(appointments: Appointment[]) {
  const now = new Date();
  return [...appointments]
    .filter((item) => {
      const date = new Date(`${item.appointment_date}T${item.start_time ?? '00:00'}`);
      return !Number.isNaN(date.getTime()) && date >= now;
    })
    .sort(
      (a, b) =>
        new Date(`${a.appointment_date}T${a.start_time ?? '00:00'}`).getTime() -
        new Date(`${b.appointment_date}T${b.start_time ?? '00:00'}`).getTime()
    )[0];
}

export function nearestContractEnd(contracts: PortalContract[]) {
  const active = contracts.filter((c) => c.status?.toLowerCase() === 'active');
  return [...active].sort(
    (a, b) => new Date(a.end_date).getTime() - new Date(b.end_date).getTime()
  )[0];
}

export function timelinePresentation(
  item: PortalTimelineItem,
  locale: string
): {
  icon: LucideIcon;
  tone: FeedTimelineTone;
  href: string;
  priority: 'normal' | 'high' | 'urgent';
} {
  const type = `${item.type ?? ''} ${item.related_type ?? ''}`.toLowerCase();
  const priorityRaw = (item.priority ?? '').toLowerCase();
  const priority: 'normal' | 'high' | 'urgent' = priorityRaw.includes('urgent')
    ? 'urgent'
    : priorityRaw.includes('high')
      ? 'high'
      : 'normal';

  if (type.includes('invoice') || type.includes('payment') || type.includes('billing')) {
    return {
      icon: CreditCard,
      tone: priority === 'urgent' ? 'danger' : 'warning',
      href: `/${locale}/dashboard/facturen`,
      priority,
    };
  }
  if (type.includes('appointment') || type.includes('crane') || type.includes('service')) {
    return {
      icon: Calendar,
      tone: 'marine',
      href: `/${locale}/dashboard/afspraken`,
      priority,
    };
  }
  if (type.includes('storage') || type.includes('stalling') || type.includes('contract')) {
    return {
      icon: Warehouse,
      tone: 'warning',
      href: `/${locale}/dashboard/stalling`,
      priority,
    };
  }
  if (type.includes('boat') || type.includes('ship')) {
    return {
      icon: Ship,
      tone: 'marine',
      href: `/${locale}/dashboard/boten`,
      priority,
    };
  }
  if (type.includes('document') || type.includes('quote') || type.includes('file')) {
    return {
      icon: FileText,
      tone: 'navy',
      href: `/${locale}/dashboard/documenten`,
      priority,
    };
  }
  if (type.includes('welcome') || type.includes('reward') || type.includes('gift')) {
    return {
      icon: Gift,
      tone: 'gold',
      href: `/${locale}/feed`,
      priority,
    };
  }
  if (type.includes('message') || type.includes('notification')) {
    return {
      icon: MessageCircle,
      tone: 'marine',
      href: `/${locale}/dashboard/berichten`,
      priority,
    };
  }

  return {
    icon: MessageCircle,
    tone: 'navy',
    href: `/${locale}/dashboard/berichten`,
    priority,
  };
}

export function salutationForHour(hour: number, t: (key: string) => string) {
  if (hour < 6) return t('feed.greeting.night');
  if (hour < 12) return t('feed.greeting.morning');
  if (hour < 18) return t('feed.greeting.afternoon');
  return t('feed.greeting.evening');
}
