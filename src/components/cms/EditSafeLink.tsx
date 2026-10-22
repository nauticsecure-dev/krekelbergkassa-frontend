'use client';

import Link from 'next/link';
import { useCms } from './CmsProvider';

/**
 * Link that stays put while CMS edit mode is on, so a click on the control
 * opens the text editor instead of navigating away.
 */
export function EditSafeLink({
  href,
  className,
  children,
  external,
  target,
  rel,
  'aria-label': ariaLabel,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
  external?: boolean;
  target?: string;
  rel?: string;
  'aria-label'?: string;
}) {
  const { canEdit, editMode } = useCms();
  if (canEdit && editMode) {
    return (
      <span className={className} aria-label={ariaLabel}>
        {children}
      </span>
    );
  }

  const isExternal = external || /^(https?:|mailto:|tel:)/i.test(href);
  if (isExternal) {
    const blank = target ?? (href.startsWith('http') ? '_blank' : undefined);
    return (
      <a
        href={href}
        className={className}
        target={blank}
        rel={rel ?? (blank === '_blank' ? 'noopener noreferrer' : undefined)}
        aria-label={ariaLabel}
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={className} aria-label={ariaLabel}>
      {children}
    </Link>
  );
}
