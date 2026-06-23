import { redirect } from 'next/navigation';

/**
 * Trello #81: "OCR review" is an alias entry point that lands on the import
 * queue pre-filtered to items that still need a human review.
 */
export default async function OcrReviewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/admin/facturen/import?status=review_required`);
}
