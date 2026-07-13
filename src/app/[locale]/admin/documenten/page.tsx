import { redirect } from 'next/navigation';

/**
 * Trello #81: "Documenten" is an alias entry point for the invoice/document
 * import queue. The real UI lives at /admin/facturen/import.
 */
export default async function DocumentenPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/admin/facturen/import`);
}
