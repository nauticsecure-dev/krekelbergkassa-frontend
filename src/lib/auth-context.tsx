'use client';

import * as React from 'react';
import { api, auth } from './api';

export type Role = 'customer' | 'staff' | 'admin' | 'manager' | 'guest';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  locale?: string;
  avatarUrl?: string | null;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  isDemo: boolean;
  signIn: (email: string, password: string, remember?: boolean) => Promise<User>;
  signInDemo: (role?: Role) => Promise<User>;
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [isDemo, setIsDemo] = React.useState(false);

  const refresh = React.useCallback(async () => {
    const token = auth.getToken();
    if (!token) {
      setUser(null);
      setIsDemo(false);
      setLoading(false);
      return;
    }
    // Demo session — hydrate from localStorage, no backend call
    if (token.startsWith(DEMO_TOKEN_PREFIX)) {
      const stored =
        typeof window !== 'undefined' ? localStorage.getItem(DEMO_USER_KEY) : null;
      const parsed: User | null = stored ? JSON.parse(stored) : null;
      setUser(parsed ?? demoUserFor('customer'));
      setIsDemo(true);
      setLoading(false);
      return;
    }
    // Real session
    try {
      const me = await api<User>('/auth/me');
      setUser(me);
      setIsDemo(false);
    } catch {
      auth.clearSession();
      setUser(null);
      setIsDemo(false);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const signIn = React.useCallback(
    async (email: string, password: string, remember = true) => {
      const res = await api<{ token: string; user: User }>('/auth/login', {
        method: 'POST',
        body: { email, password },
        auth: false,
      });
      auth.setSession(res.token, remember);
      setUser(res.user);
      setIsDemo(false);
      return res.user;
    },
    []
  );

  const signInDemo = React.useCallback(async (role: Role = 'customer') => {
    const demoUser = demoUserFor(role);
    auth.setSession(`${DEMO_TOKEN_PREFIX}${role}::${Date.now()}`, true);
    if (typeof window !== 'undefined') {
      localStorage.setItem(DEMO_USER_KEY, JSON.stringify(demoUser));
    }
    setUser(demoUser);
    setIsDemo(true);
    return demoUser;
  }, []);

  const signOut = React.useCallback(async () => {
    const token = auth.getToken();
    if (token && !token.startsWith(DEMO_TOKEN_PREFIX)) {
      try {
        await api('/auth/logout', { method: 'POST' });
      } catch {
        /* ignore */
      }
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem(DEMO_USER_KEY);
    }
    auth.clearSession();
    setUser(null);
    setIsDemo(false);
  }, []);

  return (
    <AuthCtx.Provider
      value={{ user, loading, isDemo, signIn, signInDemo, signOut, refresh }}
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
