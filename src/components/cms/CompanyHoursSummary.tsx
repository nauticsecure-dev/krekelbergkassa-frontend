'use client';
import Link from 'next/link';
import { Pencil } from 'lucide-react';
import { contentService } from '@/lib/services';
import { useQuery } from '@/lib/hooks/useAsync';
import { useIntl } from '@/i18n/IntlProvider';
import { useCms } from './CmsProvider';
import { TranslatedText } from './TranslatedText';

/** Display the calendar schedule rather than a second editable prose schedule. */
export function CompanyHoursSummary() {
  const { locale, t } = useIntl();
  const { isCmsEditing, localeTag } = useCms();
  const query = useQuery([localeTag], () => contentService.openingHours(localeTag));
  const groups: Array<{ first: string; last: string; value: string }> = [];
  for (const hour of query.data?.hours ?? []) {
    const value = hour.closed ? t('contactPage.closed') : hour.display;
    const last = groups.at(-1);
    if (last?.value === value) last.last = hour.label;
    else groups.push({ first: hour.label, last: hour.label, value });
  }
  return <span data-cms-key="opening_hours.regular" data-cms-field-id="opening_hours.regular" data-cms-source="opening_hours"
    data-cms-locale={localeTag} className="inline-flex flex-wrap items-center gap-2">
    <span>{groups.length ? groups.map(group => `${group.first}${group.last !== group.first ? '–' + group.last : ''} ${group.value}`).join(' · ')
      : <TranslatedText textKey={query.loading ? 'adminNew.common.loading' : 'contactPage.hoursUnavailable'} />}</span>
    {isCmsEditing && <Link href={`/${locale}/admin/kalender`} aria-label={t('cms.openingHours')} className="inline-flex rounded bg-gold-500 p-1.5 text-white"><Pencil className="h-3.5 w-3.5" /></Link>}
  </span>;
}
