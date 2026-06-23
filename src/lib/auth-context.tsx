'use client';

import * as React from 'react';
import { auth } from './api';
import type { ApiError } from './api';
import { authService, extractLoginToken, portalService } from './services';
import type { SessionUser } from './api-types';
import {
  hasAnySession,
  readCachedUser,
  writeCachedUser,
} from './auth-storage';

export type Role = 'customer' | 'staff' | 'admin' | 'manager' | 'guest';

export type User = SessionUser;

// Trello #104: thrown by signIn when the account requires a second factor.
export class MfaRequiredError extends Error {
  mfaToken: string;
  constructor(mfaToken: string) {
    super('MFA required');
    this.name = 'MfaRequiredError';
    this.mfaToken = mfaToken;
  }
}

interface AuthState {
  user: User | null;
  loading: boolean;
  isDemo: boolean;
  isPortalSession: boolean;
  signIn: (email: string, password: string, remember?: boolean) => Promise<User>;
  verifyMfa: (mfaToken: string, code: string, remember?: boolean) => Promise<User>;
  signInDemo: (role?: Role) => Promise<User>;
  requestCustomerMagicLink: (email: string, locale?: string) => Promise<{ success: boolean; message: string }>;
  verifyCustomerMagicLink: (token: string, remember?: boolean) => Promise<User>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthCtx = React.createContext<AuthState | null>(null);

const DEMO_TOKEN_PREFIX = 'demo::';
const DEMO_USER_KEY = 'krek_demo_user';

function isUnauthorized(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'status' in err &&
    (err as ApiError).status === 401
  );
}

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

function initialAuthState(): { user: User | null; loading: boolean } {
  if (typeof window === 'undefined') {
    return { user: null, loading: true };
  }
  const cached = readCachedUser<User>();
  if (cached) {
    return { user: cached, loading: false };
  }
  return { user: null, loading: hasAnySession() };
}

async function loadStaffSession(): Promise<User | null> {
  const me = await authService.me();
  return {
    ...me,
    role: normalizeRole(me.role),
  };
}

async function loadPortalSession(): Promise<User | null> {
  const portalMe = await portalService.me();
  return {
    id: portalMe.customer.id,
    name: portalMe.customer.name,
    email: portalMe.customer.email,
    role: 'customer',
    locale: portalMe.customer.preferred_locale,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [isDemo, setIsDemo] = React.useState(false);
  const [isPortalSession, setIsPortalSession] = React.useState(false);
  const hydratedRef = React.useRef(false);

  const refresh = React.useCallback(async () => {
    if (hasAnySession() && !readCachedUser<User>()) {
      setLoading(true);
    }

    try {
      const token = auth.getToken();
      const portalToken = auth.getPortalToken();
      const hasStaffToken = !!token && !token.startsWith(DEMO_TOKEN_PREFIX);

      if (token?.startsWith(DEMO_TOKEN_PREFIX)) {
        const stored =
          typeof window !== 'undefined' ? localStorage.getItem(DEMO_USER_KEY) : null;
        const parsed: User | null = stored ? JSON.parse(stored) : null;
        setUser(parsed ?? demoUserFor('customer'));
        setIsDemo(true);
        setIsPortalSession(false);
        writeCachedUser(null);
        return;
      }

      // Staff session takes priority — portal cookie must not override admin login on refresh.
      if (hasStaffToken) {
        try {
          const staffUser = await loadStaffSession();
          setUser(staffUser);
          writeCachedUser(staffUser);
          setIsDemo(false);
          setIsPortalSession(false);
          return;
        } catch (err) {
          if (isUnauthorized(err)) {
            auth.clearSession();
            writeCachedUser(null);
          } else {
            const cached = readCachedUser<User>();
            if (cached) {
              setUser(cached);
              setIsDemo(false);
              setIsPortalSession(false);
              return;
            }
          }
        }
      }

      if (portalToken) {
        try {
          const portalUser = await loadPortalSession();
          setUser(portalUser);
          writeCachedUser(portalUser);
          setIsDemo(false);
          setIsPortalSession(true);
          return;
        } catch (err) {
          if (isUnauthorized(err)) {
            auth.clearPortalSession();
            writeCachedUser(null);
          } else {
            const cached = readCachedUser<User>();
            if (cached) {
              setUser(cached);
              setIsDemo(false);
              setIsPortalSession(true);
              return;
            }
          }
        }
      }

      setUser(null);
      setIsDemo(false);
      setIsPortalSession(false);
      writeCachedUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useLayoutEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    const state = initialAuthState();
    setUser(state.user);
    setLoading(state.loading);
    void refresh();
  }, [refresh]);

  // Trello #104: complete a staff session from a login/mfa-verify response.
  const completeStaffLogin = React.useCallback(
    (res: Awaited<ReturnType<typeof authService.login>>, remember: boolean) => {
      const sessionToken = extractLoginToken(res);
      if (!sessionToken) {
        throw new Error('Login succeeded but no session token was returned.');
      }
      auth.clearPortalSession();
      auth.setSession(sessionToken, remember, res.session?.expires_at);
      const next: User = {
        ...res.user,
        role: normalizeRole(res.user.role),
      };
      setUser(next);
      writeCachedUser(next);
      setIsDemo(false);
      setIsPortalSession(false);
      setLoading(false);
      return next;
    },
    []
  );

  const signIn = React.useCallback(
    async (email: string, password: string, remember = true) => {
      const res = await authService.login(email, password);
      // Trello #104: MFA-enabled accounts get a challenge instead of a token.
      if (res.mfa_required && res.mfa_token) {
        throw new MfaRequiredError(res.mfa_token);
      }
      return completeStaffLogin(res, remember);
    },
    [completeStaffLogin]
  );

  // Trello #104: submit the second factor and complete the session.
  const verifyMfa = React.useCallback(
    async (mfaToken: string, code: string, remember = true) => {
      const res = await authService.mfaVerify(mfaToken, code);
      return completeStaffLogin(res, remember);
    },
    [completeStaffLogin]
  );

  const requestCustomerMagicLink = React.useCallback(async (email: string, locale?: string) => {
    return authService.requestMagicLink(email, locale);
  }, []);

  const verifyCustomerMagicLink = React.useCallback(async (token: string, remember = true) => {
    const res = await authService.verifyMagicLink(token);
    auth.clearSession();
    auth.setPortalSession(res.portal_token, remember);
    const next: User = {
      id: res.customer.id,
      name: res.customer.name,
      email: res.customer.email,
      role: 'customer',
      locale: res.customer.preferred_locale,
    };
    setUser(next);
    writeCachedUser(next);
    setIsDemo(false);
    setIsPortalSession(true);
    setLoading(false);
    return next;
  }, []);

  const signInDemo = React.useCallback(async (role: Role = 'customer') => {
    const demoUser = demoUserFor(role);
    auth.clearPortalSession();
    auth.setSession(`${DEMO_TOKEN_PREFIX}${role}::${Date.now()}`, true);
    if (typeof window !== 'undefined') {
      localStorage.setItem(DEMO_USER_KEY, JSON.stringify(demoUser));
    }
    setUser(demoUser);
    writeCachedUser(null);
    setIsDemo(true);
    setIsPortalSession(role === 'customer');
    setLoading(false);
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
    writeCachedUser(null);
    setUser(null);
    setIsDemo(false);
    setIsPortalSession(false);
    setLoading(false);
  }, []);

  return (
    <AuthCtx.Provider
      value={{
        user,
        loading,
        isDemo,
        isPortalSession,
        signIn,
        verifyMfa,
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
