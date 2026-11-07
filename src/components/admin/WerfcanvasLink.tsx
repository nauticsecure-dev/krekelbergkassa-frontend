'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { getAuthToken } from '@/lib/auth-storage';

export function WerfcanvasLink({ locale, moves = false, className, children }: {
  locale: string;
  moves?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={`/${locale}/admin/stalling/werfcanvas${moves ? '#verplaatsingen' : ''}`}
      className={className}
      prefetch={false}
      onClick={() => {
        // Restore the staff cookie from local storage before middleware checks it.
        getAuthToken();
      }}
    >
      {children}
    </Link>
  );
}
