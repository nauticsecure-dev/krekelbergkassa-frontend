import { redirect } from 'next/navigation';

/**
 * Trello #81: "OCR templates" alias → the extraction-template dashboard that
 * lives under the invoices section.
 */
export default async function OcrTemplatesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/admin/facturen/templates`);
}
