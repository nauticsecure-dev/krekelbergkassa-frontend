'use client';

import * as React from 'react';
import { auth } from './api';
import { authService, portalService } from './services';
import type { SessionUser } from './api-types';

export type Role = 'customer' | 'staff' | 'admin' | 'manager' | 'guest';

export type User = SessionUser;

interface AuthState {
  user: User | null;
  loading: boolean;
  isDemo: boolean;
  isPortalSession: boolean;
  signIn: (email: string, password: string, remember?: boolean) => Promise<User>;
  signInDemo: (role?: Role) => Promise<User>;
  requestCustomerMagicLink: (email: string, locale?: string) => Promise<{ success: boolean; message: string }>;
  verifyCustomerMagicLink: (token: string, remember?: boolean) => Promise<User>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthCtx = React.createContext<AuthState | null>(null);

const DEMO_TOKEN_PREFIX = 'demo::';
const DEMO_USER_KEY = 'krek_demo_user';

const demoUserFor = (role: Role): User => {
  switch (role) {
    case 'admin':
      return {
        id: 'demo-admin',
        name: 'Michael Schepenkring',
        email: 'admin@krekelberg.nl',
        role: 'admin',
        avatarUrl: null,
      };
    case 'manager':
      return {
        id: 'demo-manager',
        name: 'Lisa van Houten',
        email: 'lisa@krekelberg.nl',
        role: 'manager',
        avatarUrl: null,
      };
    case 'staff':
      return {
        id: 'demo-staff',
        name: 'Mark de Vries',
        email: 'mark@krekelberg.nl',
        role: 'staff',
        avatarUrl: null,
      };
    case 'customer':
    default:
      return {
        id: 'demo-customer',
        name: 'Jan Jansen',
        email: 'jan@example.com',
        role: 'customer',
        avatarUrl: null,
      };
  }
};

function normalizeRole(role: string): Role {
  if (role === 'admin' || role === 'manager' || role === 'staff' || role === 'customer') {
    return role;
  }
  return 'staff';
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [isDemo, setIsDemo] = React.useState(false);
  const [isPortalSession, setIsPortalSession] = React.useState(false);

  const refresh = React.useCallback(async () => {
    const token = auth.getToken();
    const portalToken = auth.getPortalToken();

    if (token?.startsWith(DEMO_TOKEN_PREFIX)) {
      const stored =
        typeof window !== 'undefined' ? localStorage.getItem(DEMO_USER_KEY) : null;
      const parsed: User | null = stored ? JSON.parse(stored) : null;
      setUser(parsed ?? demoUserFor('customer'));
      setIsDemo(true);
      setIsPortalSession(false);
      setLoading(false);
      return;
    }

    if (portalToken) {
      try {
        const portalMe = await portalService.me();
        const portalUser: User = {
          id: portalMe.customer.id,
          name: portalMe.customer.name,
          email: portalMe.customer.email,
          role: 'customer',
          locale: portalMe.customer.preferred_locale,
        };
        setUser(portalUser);
        setIsDemo(false);
        setIsPortalSession(true);
      } catch {
        auth.clearPortalSession();
        setUser(null);
        setIsDemo(false);
        setIsPortalSession(false);
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      const me = await authService.me();
      setUser({
        ...me,
        role: normalizeRole(me.role),
      });
      setIsDemo(false);
      setIsPortalSession(false);
    } catch {
      auth.clearSession();
      setUser(null);
      setIsDemo(false);
      setIsPortalSession(false);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const signIn = React.useCallback(
    async (email: string, password: string, remember = true) => {
      const res = await authService.login(email, password);
      if (res.token) {
        auth.setSession(res.token, remember);
      }
      const next: User = {
        ...res.user,
        role: normalizeRole(res.user.role),
      };
      setUser(next);
      setIsDemo(false);
      setIsPortalSession(false);
      return next;
    },
    []
  );

  const requestCustomerMagicLink = React.useCallback(async (email: string, locale?: string) => {
    return authService.requestMagicLink(email, locale);
  }, []);

  const verifyCustomerMagicLink = React.useCallback(async (token: string, remember = true) => {
    const res = await authService.verifyMagicLink(token);
    auth.setPortalSession(res.portal_token, remember);
    const next: User = {
      id: res.customer.id,
      name: res.customer.name,
      email: res.customer.email,
      role: 'customer',
      locale: res.customer.preferred_locale,
    };
    setUser(next);
    setIsDemo(false);
    setIsPortalSession(true);
    return next;
  }, []);

  const signInDemo = React.useCallback(async (role: Role = 'customer') => {
    const demoUser = demoUserFor(role);
    auth.setSession(`${DEMO_TOKEN_PREFIX}${role}::${Date.now()}`, true);
    if (typeof window !== 'undefined') {
      localStorage.setItem(DEMO_USER_KEY, JSON.stringify(demoUser));
    }
    setUser(demoUser);
    setIsDemo(true);
    setIsPortalSession(role === 'customer');
    return demoUser;
  }, []);

  const signOut = React.useCallback(async () => {
    const token = auth.getToken();
    const portalToken = auth.getPortalToken();

    if (token && !token.startsWith(DEMO_TOKEN_PREFIX)) {
      try {
        await authService.logout();
      } catch {
        // ignore
      }
    }

    if (portalToken) {
      auth.clearPortalSession();
    }

    if (typeof window !== 'undefined') {
      localStorage.removeItem(DEMO_USER_KEY);
    }

    auth.clearSession();
    setUser(null);
    setIsDemo(false);
    setIsPortalSession(false);
  }, []);

  return (
    <AuthCtx.Provider
      value={{
        user,
        loading,
        isDemo,
        isPortalSession,
        signIn,
        signInDemo,
        requestCustomerMagicLink,
        verifyCustomerMagicLink,
        signOut,
        refresh,
      }}
    >
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  const ctx = React.useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
