'use client';

import { useParams } from 'next/navigation';
import YardCanvas from '@/components/admin/yard/YardCanvas';

export default function WerfcanvasPage() {
  return <YardCanvas locale={useParams<{ locale: string }>().locale} />;
}
