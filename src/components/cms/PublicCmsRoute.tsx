'use client';
import { usePathname } from 'next/navigation';
import { useRegisterCmsPage } from './CmsProvider';

export function PublicCmsRoute() {
  const pathname = usePathname();
  useRegisterCmsPage(pathname.replace(/^\/(nl|en|de|fr)\/?/, '').replace(/\/$/, '') || 'home');
  return null;
}
