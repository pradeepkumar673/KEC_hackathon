import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — attach JWT token automatically
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('burnex_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — unwrap data, surface errors
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (!error.response) {
      // network down / offline / timeout
      return Promise.reject({ message: 'Network error — check your connection.', offline: true });
    }

    if (error.response.status === 401) {
      localStorage.removeItem('burnex_token');
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }

    const message = error.response?.data?.message || error.response?.data?.error || 'Something went wrong.';
    console.error('API Error:', message);
    return Promise.reject({ message, status: error.response.status, data: error.response.data });
  }
);

// ── Exercise endpoints ──────────────────────────────────────────────────────

export const getExercises = async (filters = {}) => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value)) {
        if (value.length > 0) params.append(key, value.join(','));
      } else {
        params.append(key, value);
      }
    }
  });
  return api.get(`/api/exercises?${params.toString()}`);
};

export const getExerciseById = async (id) =>
  api.get(`/api/exercises/${id}`);

export const getRandomExercises = async (count = 10) =>
  api.get(`/api/exercises/random/${count}`);

export const getEquipmentTypes = async () =>
  api.get('/api/exercises/equipment');

export const getMuscleGroups = async () =>
  api.get('/api/exercises/muscles');

export const getHealth = async () =>
  api.get('/api/health');

// ── Auth endpoints ─────────────────────────────────────────────────────────

export const registerUser = async (data) =>
  api.post('/api/auth/register', data);

export const loginUser = async (data) =>
  api.post('/api/auth/login', data);

export const getProfile = async () =>
  api.get('/api/auth/profile');

export default api;
