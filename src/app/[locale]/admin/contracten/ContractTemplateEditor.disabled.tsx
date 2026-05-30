import { redirect } from 'next/navigation';

/**
 * Contract template editor is disabled until backend template APIs exist.
 * Stalling contracts are managed at /admin/stalling (stallingService).
 * Previous UI preserved in ContractTemplateEditor.disabled.tsx
 */
export default async function ContractsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/admin/stalling`);
}
