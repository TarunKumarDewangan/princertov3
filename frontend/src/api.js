import axios from 'axios';

// --- CORRECT URL ---
// Do NOT add '/api' at the end.
// Your components already add it (e.g., "/api/login").
const BASE_URL = 'https://api.rtodatahub.in';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Attach token automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
