import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('teac_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      const onAuthPage = window.location.pathname.includes('/login') ||
                         window.location.pathname.includes('/register');
      if (!onAuthPage) {
        localStorage.removeItem('teac_token');
        window.location.href = import.meta.env.BASE_URL + 'login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;
