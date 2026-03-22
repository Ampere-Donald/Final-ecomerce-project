import axios from 'axios';

const rawUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const BASE = rawUrl.endsWith('/api') ? rawUrl : `${rawUrl}/api`;

const apiClient = axios.create({ baseURL: BASE });

export default apiClient;
