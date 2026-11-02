'use client';
import { useCompanyContact } from '@/lib/hooks/useCompanyContact';
import { EditableContactValue } from './EditableContactValue';
import { useCms } from './CmsProvider';
export const useCompanyInfo = useCompanyContact;
export function CompanyText({ field }: { field: 'email' | 'phone' | 'address' }) {
  const company = useCompanyInfo();
  const { localeTag } = useCms();
  return <span data-cms-source="company_settings" data-cms-key={`company.${field}`} data-cms-locale={localeTag}>
    <EditableContactValue field={field} contact={company}>{company[field]}</EditableContactValue>
  </span>;
}
