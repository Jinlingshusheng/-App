import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '@/utils/api';

const TOKEN_KEY = 'xczd_star_token';
const USER_KEY = 'xczd_star_user';

export interface AuthUser {
  id: number;
  username: string;
  role: 'teacher' | 'parent';
  name: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<AuthUser>;
  register: (payload: {
    username: string;
    password: string;
    name: string;
    student_no: string;
    student_name: string;
  }) => Promise<AuthUser>;
  logout: () => Promise<void>;
  updateUser: (patch: Partial<AuthUser>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [t, u] = await Promise.all([
          AsyncStorage.getItem(TOKEN_KEY),
          AsyncStorage.getItem(USER_KEY),
        ]);
        if (t) setToken(t);
        if (u) setUser(JSON.parse(u));
      } catch {
        /* ignore */
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const persist = useCallback(async (t: string | null, u: AuthUser | null) => {
    try {
      if (t) await AsyncStorage.setItem(TOKEN_KEY, t);
      else await AsyncStorage.removeItem(TOKEN_KEY);
      if (u) await AsyncStorage.setItem(USER_KEY, JSON.stringify(u));
      else await AsyncStorage.removeItem(USER_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const login = useCallback(
    async (username: string, password: string) => {
      const { token: t, user: u } = await api.login({ username, password });
      setToken(t);
      setUser(u);
      await persist(t, u);
      return u as AuthUser;
    },
    [persist]
  );

  const register = useCallback(
    async (payload: {
      username: string;
      password: string;
      name: string;
      student_no: string;
      student_name: string;
    }) => {
      const { token: t, user: u } = await api.register(payload);
      setToken(t);
      setUser(u);
      await persist(t, u);
      return u as AuthUser;
    },
    [persist]
  );

  const logout = useCallback(async () => {
    try {
      await api.logout(token);
    } catch {
      /* ignore */
    }
    setToken(null);
    setUser(null);
    await persist(null, null);
  }, [token, persist]);

  const updateUser = useCallback(
    (patch: Partial<AuthUser>) => {
      setUser((prev) => {
        if (!prev) return prev;
        const next = { ...prev, ...patch };
        persist(token, next);
        return next;
      });
    },
    [token, persist]
  );

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: !!token && !!user,
      isLoading,
      login,
      register,
      logout,
      updateUser,
    }),
    [user, token, isLoading, login, register, logout, updateUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};