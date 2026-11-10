'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User } from '@/types/auth';
import apiClient from '@/lib/axios';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  logout: () => Promise<void>;
  hasRole: (...roles: string[]) => boolean;
  /** Refresh cached user data (e.g. after self profile update) without a full re-login */
  updateUser: (partial: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Keys that must NOT be cleared on logout (they persist across sessions)
const PERSISTENT_KEYS = ['last_login_role'] as const;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Rehydrate dari localStorage saat mount
  useEffect(() => {
    const storedToken = localStorage.getItem('auth_token');
    const storedUser  = localStorage.getItem('auth_user');

    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback((newToken: string, newUser: User) => {
    localStorage.setItem('auth_token', newToken);
    localStorage.setItem('auth_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // ignore error, tetap logout di client
    } finally {
      // Simpan persistent keys sebelum clear
      const saved: Record<string, string> = {};
      PERSISTENT_KEYS.forEach((key) => {
        const val = localStorage.getItem(key);
        if (val !== null) saved[key] = val;
      });

      // Hapus hanya auth-related keys (bukan seluruh localStorage)
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');

      // Restore persistent keys
      Object.entries(saved).forEach(([key, val]) => {
        localStorage.setItem(key, val);
      });

      setToken(null);
      setUser(null);
      window.location.href = '/login';
    }
  }, []);

  const hasRole = useCallback((...roles: string[]) => {
    if (!user) return false;
    return roles.includes(user.role);
  }, [user]);

  const updateUser = useCallback((partial: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...partial };
      localStorage.setItem('auth_user', JSON.stringify(next));
      return next;
    });
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      token,
      isLoading,
      isAuthenticated: !!token && !!user,
      login,
      logout,
      hasRole,
      updateUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}