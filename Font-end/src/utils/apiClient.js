import axios from 'axios';

const rawUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const BASE = rawUrl.endsWith('/api') ? rawUrl : `${rawUrl}/api`;

const apiClient = axios.create({ baseURL: BASE });

apiClient.interceptors.request.use((config) => {
  config.headers['X-Request-Id'] = typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `web-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return config;
});

export default apiClient;
