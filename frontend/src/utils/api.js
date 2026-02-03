import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ============================================
// TRENDS API (Stable Trends)
// ============================================

export const getTrends = async (params = {}) => {
  const response = await api.get('/api/trends', { params });
  return response.data;
};

export const getTrendById = async (id) => {
  const response = await api.get(`/api/trends/${id}`);
  return response.data;
};

export const getTrendWorkplaceDevelopments = async (id) => {
  const response = await api.get(`/api/trends/${id}/workplace-developments`);
  return response.data;
};

export const getTrendStats = async (id) => {
  const response = await api.get(`/api/trends/${id}/stats`);
  return response.data;
};

export const getTrendsStats = async (params = {}) => {
  const response = await api.get('/api/trends/stats', { params });
  return response.data;
};

export const createTrend = async (data) => {
  const response = await api.post('/api/trends', data);
  return response.data;
};

export const updateTrend = async (id, data) => {
  const response = await api.put(`/api/trends/${id}`, data);
  return response.data;
};

export const activateTrend = async (id) => {
  const response = await api.put(`/api/trends/${id}/activate`);
  return response.data;
};

export const archiveTrend = async (id) => {
  const response = await api.put(`/api/trends/${id}/archive`);
  return response.data;
};

export const deleteTrend = async (id) => {
  const response = await api.delete(`/api/trends/${id}`);
  return response.data;
};

// ============================================
// WORKPLACE DEVELOPMENTS API (Dynamic Content)
// ============================================

export const getWorkplaceDevelopments = async (params = {}) => {
  const response = await api.get('/api/workplace-developments', { params });
  return response.data;
};

export const getWorkplaceDevelopmentById = async (id) => {
  const response = await api.get(`/api/workplace-developments/${id}`);
  return response.data;
};

export const getWorkplaceDevelopmentsByTrend = async (trendId) => {
  const response = await api.get(`/api/workplace-developments/by-trend/${trendId}`);
  return response.data;
};

export const getWorkplaceDevelopmentsStats = async (params = {}) => {
  const response = await api.get('/api/workplace-developments/stats', { params });
  return response.data;
};

export const createWorkplaceDevelopment = async (data) => {
  const response = await api.post('/api/workplace-developments', data);
  return response.data;
};

export const updateWorkplaceDevelopment = async (id, data) => {
  const response = await api.put(`/api/workplace-developments/${id}`, data);
  return response.data;
};

export const deleteWorkplaceDevelopment = async (id) => {
  const response = await api.delete(`/api/workplace-developments/${id}`);
  return response.data;
};

export const bulkUpdateWorkplaceDevelopmentStatus = async (developmentIds, status) => {
  const response = await api.put('/api/workplace-developments/bulk-status', {
    development_ids: developmentIds,
    status: status
  });
  return response.data;
};

// ============================================
// SKILLS API
// ============================================

export const getSkills = async (params = {}) => {
  const response = await api.get('/api/skills', { params });
  return response.data;
};

export const getUniqueSkills = async (params = {}) => {
  const response = await api.get('/api/skills/unique', { params });
  return response.data;
};

export const getSkillById = async (id) => {
  const response = await api.get(`/api/skills/${id}`);
  return response.data;
};

export const getSkillsStats = async () => {
  const response = await api.get('/api/skills/stats');
  return response.data;
};

export const createSkill = async (data) => {
  const response = await api.post('/api/skills', data);
  return response.data;
};

export const createSkillsBulk = async (skills) => {
  const response = await api.post('/api/skills/bulk', { skills });
  return response.data;
};

export const updateSkill = async (id, data) => {
  const response = await api.put(`/api/skills/${id}`, data);
  return response.data;
};

export const deleteSkill = async (id) => {
  const response = await api.delete(`/api/skills/${id}`);
  return response.data;
};

// ============================================
// CARDS API (Dashboard Cards)
// ============================================

export const getTopTrendsCard = async (params = {}) => {
  const response = await api.get('/api/cards/top-trends', { params });
  return response.data;
};

export const getQuickWinsCard = async (params = {}) => {
  const response = await api.get('/api/cards/quick-wins', { params });
  return response.data;
};

export const getTrendingSkillsCard = async (params = {}) => {
  const response = await api.get('/api/cards/trending-skills', { params });
  return response.data;
};

export const getSavedItemsCard = async () => {
  const response = await api.get('/api/cards/saved-items');
  return response.data;
};

export const getCardsOverview = async (params = {}) => {
  const response = await api.get('/api/cards/overview', { params });
  return response.data;
};

// ============================================
// KERNPUNTEN API
// ============================================

export const getKernpunten = async (params = {}) => {
  const response = await api.get('/api/kernpunten', { params });
  return response.data;
};

export const getKernpuntById = async (id) => {
  const response = await api.get(`/api/kernpunten/${id}`);
  return response.data;
};

export const getKernpuntTrends = async (id) => {
  const response = await api.get(`/api/kernpunten/${id}/trends`);
  return response.data;
};

export const createKernpunt = async (data) => {
  const response = await api.post('/api/kernpunten', data);
  return response.data;
};

export const updateKernpunt = async (id, data) => {
  const response = await api.put(`/api/kernpunten/${id}`, data);
  return response.data;
};

export const deleteKernpunt = async (id) => {
  const response = await api.delete(`/api/kernpunten/${id}`);
  return response.data;
};

// ============================================
// DEPARTMENTS API
// ============================================

export const getDepartments = async (params = {}) => {
  const response = await api.get('/api/departments', { params });
  return response.data;
};

export const getDepartmentById = async (id) => {
  const response = await api.get(`/api/departments/${id}`);
  return response.data;
};

// ============================================
// CATEGORIES API
// ============================================

export const getCategories = async (params = {}) => {
  const response = await api.get('/api/categories', { params });
  return response.data;
};

export const getCategoryById = async (id) => {
  const response = await api.get(`/api/categories/${id}`);
  return response.data;
};

// ============================================
// DEDUPLICATION API
// ============================================

export const startDeduplication = async (threshold = 0.90) => {
  const response = await api.post('/api/deduplication/start', { threshold });
  return response.data;
};

export const getDeduplicationStatus = async () => {
  const response = await api.get('/api/deduplication/status');
  return response.data;
};

export const resetDeduplicationStatus = async () => {
  const response = await api.post('/api/deduplication/reset');
  return response.data;
};

// ============================================
// USERS API
// ============================================

export const getUsers = async () => {
  const response = await api.get('/api/users');
  return response.data;
};

export const createUser = async (data) => {
  const response = await api.post('/api/users', data);
  return response.data;
};

export const updateUser = async (id, data) => {
  const response = await api.put(`/api/users/${id}`, data);
  return response.data;
};

export const deleteUser = async (id) => {
  const response = await api.delete(`/api/users/${id}`);
  return response.data;
};

// ============================================
// AUTH API
// ============================================

export const login = async (email, password) => {
  const response = await api.post('/api/auth/login', { email, password });
  return response.data;
};

export const getCurrentUser = async () => {
  const response = await api.get('/api/auth/me');
  return response.data;
};

export default api;
