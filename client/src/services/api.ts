import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({ baseURL });

export function getAccessToken(): string | null {
  return localStorage.getItem('teac_token');
}
export function getRefreshToken(): string | null {
  return localStorage.getItem('teac_refresh');
}
export function setTokens(token: string, refreshToken?: string): void {
  localStorage.setItem('teac_token', token);
  if (refreshToken) localStorage.setItem('teac_refresh', refreshToken);
}
export function clearTokens(): void {
  localStorage.removeItem('teac_token');
  localStorage.removeItem('teac_refresh');
}

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Single-flight refresh: concurrent 401s share one refresh call.
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;
  try {
    const res = await axios.post(`${baseURL}/auth/refresh`, { refreshToken });
    setTokens(res.data.token, res.data.refreshToken);
    return res.data.token as string;
  } catch {
    clearTokens();
    return null;
  }
}

function redirectToLogin(): void {
  const onAuthPage =
    window.location.pathname.includes('/login') || window.location.pathname.includes('/register');
  if (!onAuthPage) window.location.href = import.meta.env.BASE_URL + 'login';
}

api.interceptors.response.use(
  (res) => res,
  async (err: AxiosError) => {
    const original = err.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    const url = original?.url || '';
    const isAuthCall =
      url.includes('/auth/login') || url.includes('/auth/register') || url.includes('/auth/refresh');

    if (err.response?.status === 401 && original && !original._retry && !isAuthCall) {
      original._retry = true;
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => { refreshPromise = null; });
      }
      const newToken = await refreshPromise;
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      }
      redirectToLogin();
    }
    return Promise.reject(err);
  },
);

export default api;
