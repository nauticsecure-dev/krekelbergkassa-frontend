'use client';

import { useAuth } from '@/lib/auth-context';
import { userCan } from './permission-check';
export { userCan, type PermissionUser } from './permission-check';

export function usePermission() {
  const { user } = useAuth();
  return {
    can: (permission: string | readonly string[]) => userCan(user, permission),
  };
}
