import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { CurrentUser } from '../types';
import { authApi } from '../api/auth';

interface AuthContextType {
  user: CurrentUser | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  login: (token: string, refreshToken: string | null, user: CurrentUser) => void;
  logout: () => Promise<void>;
  hasRole: (role: string) => boolean;
  /** Update the current user in auth state + localStorage (e.g. after a profile picture change) */
  updateUser: (userData: Partial<CurrentUser>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    const storedUser = localStorage.getItem('auth_user');
    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('auth_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback((token: string, refreshToken: string | null, userData: CurrentUser) => {
    localStorage.setItem('auth_token', token);
    if (refreshToken) {
      localStorage.setItem('refresh_token', refreshToken);
    }
    localStorage.setItem('auth_user', JSON.stringify(userData));
    setUser(userData);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore logout errors
    } finally {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('auth_user');
      setUser(null);
    }
  }, []);

  const hasRole = useCallback(
    (role: string) => {
      return user?.roles?.includes(role) ?? false;
    },
    [user]
  );

  // Update auth state immediately (no logout / refresh required) and persist to localStorage
  const updateUser = useCallback((userData: Partial<CurrentUser>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...userData };
      localStorage.setItem('auth_user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isAdmin: hasRole('Admin'),
    isLoading,
    login,
    logout,
    hasRole,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
