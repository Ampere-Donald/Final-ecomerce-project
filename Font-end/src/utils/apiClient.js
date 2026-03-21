import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const apiClient = axios.create({ baseURL: BASE });

export default apiClient;
