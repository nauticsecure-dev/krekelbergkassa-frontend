'use client';

import * as React from 'react';
import Link from 'next/link';
import { buttonClassName, type ButtonProps } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import { useCms } from './CmsProvider';

type CtaButton = Pick<ButtonProps, 'variant' | 'size' | 'fullWidth' | 'className' | 'leftIcon' | 'rightIcon'>;

/**
 * Link that becomes a non-interactive surface while this page is being edited,
 * so the pencil inside EditableText is never nested in an anchor or button.
 */
export function EditSafeLink({
  href,
  className,
  children,
  external,
  target,
  rel,
  button,
  'aria-label': ariaLabel,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
  external?: boolean;
  target?: string;
  rel?: string;
  /** Render the CTA look without a `<button>`, so edit controls stay valid HTML. */
  button?: CtaButton;
  'aria-label'?: string;
}) {
  const { isCmsEditing } = useCms();
  const look = button
    ? buttonClassName({
        variant: button.variant,
        size: button.size,
        fullWidth: button.fullWidth,
        className: cn(button.className, className),
      })
    : className;

  const content = (
    <>
      {button?.leftIcon ? <span className="-ml-0.5">{button.leftIcon}</span> : null}
      {button ? <span>{children}</span> : children}
      {button?.rightIcon ? <span className="-mr-0.5">{button.rightIcon}</span> : null}
    </>
  );

  if (isCmsEditing) {
    return (
      <div className={cn(look, 'cursor-text')} aria-label={ariaLabel}>
        {content}
      </div>
    );
  }

  const isExternal = external || /^(https?:|mailto:|tel:)/i.test(href);
  if (isExternal) {
    const blank = target ?? (href.startsWith('http') ? '_blank' : undefined);
    return (
      <a
        href={href}
        className={look}
        target={blank}
        rel={rel ?? (blank === '_blank' ? 'noopener noreferrer' : undefined)}
        aria-label={ariaLabel}
      >
        {content}
      </a>
    );
  }

  return (
    <Link href={href} className={look} aria-label={ariaLabel}>
      {content}
    </Link>
  );
}
