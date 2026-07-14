import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import api, { setTokens, clearTokens, getAccessToken, getRefreshToken } from '../services/api';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<{ twoFactorRequired: true; pendingToken: string } | void>;
  completeTwoFactor: (pendingToken: string, code: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

interface RegisterData {
  nom: string;
  prenom: string;
  email: string;
  password: string;
  ecole?: string;
  matieres?: string[];
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(getAccessToken());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (token) {
      api.get('/auth/profile')
        .then((res) => setUser(res.data))
        .catch(() => { setToken(null); clearTokens(); })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [token]);

  const applySession = (t: string, refreshToken: string, u: User) => {
    setTokens(t, refreshToken);
    setToken(t);
    setUser(u);
  };

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.data.twoFactorRequired) {
      return { twoFactorRequired: true as const, pendingToken: res.data.pendingToken };
    }
    const { token: t, refreshToken, user: u } = res.data;
    applySession(t, refreshToken, u);
  };

  const completeTwoFactor = async (pendingToken: string, code: string) => {
    const res = await api.post('/auth/login/2fa', { pendingToken, code });
    const { token: t, refreshToken, user: u } = res.data;
    applySession(t, refreshToken, u);
  };

  const register = async (data: RegisterData) => {
    const res = await api.post('/auth/register', data);
    const { token: t, refreshToken, user: u } = res.data;
    setTokens(t, refreshToken);
    setToken(t);
    setUser(u);
  };

  const logout = () => {
    const refreshToken = getRefreshToken();
    if (refreshToken) api.post('/auth/logout', { refreshToken }).catch(() => {});
    clearTokens();
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, completeTwoFactor, register, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
