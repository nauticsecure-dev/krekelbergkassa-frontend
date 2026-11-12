'use client';
import { useCompanyContact } from '@/lib/hooks/useCompanyContact';
import { EditableContactValue } from './EditableContactValue';
import { useCms } from './CmsProvider';
export const useCompanyInfo = useCompanyContact;
export function CompanyText({ field }: { field: 'email' | 'phone' | 'address' }) {
  const company = useCompanyInfo();
  const { localeTag, canEdit } = useCms();
  return <span translate="no" className="notranslate" data-cms-source="company_settings" data-cms-key={`company.${field}`} data-cms-locale={localeTag}
    data-cms-field-id={`settings.company.${field}`} data-cms-record-id={JSON.stringify(company.fieldSources?.[field]?.map(source => source.record_id) ?? [])} data-cms-field={field}
    data-cms-publication="published" data-cms-version={company.revision ?? 'unloaded'} data-cms-permission="cms.manage" data-cms-can-edit={String(canEdit)}>
    <EditableContactValue field={field} contact={company}>{company[field]}</EditableContactValue>
  </span>;
}
