import axios from 'axios';
import type {
  Project, ProjectList, SourceFile, FileList,
  DashboardSummary, DependencyGraph, DebtSummary,
  SecuritySummary, MigrationRoadmap, AIRecommendationsResponse,
} from '../types';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  timeout: 120000,
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('legacylens_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401, clear token and redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('legacylens_token');
      localStorage.removeItem('legacylens_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ── Projects ───────────────────────────────────────────────────────────────

export const projectsApi = {
  list: () => api.get<ProjectList>('/projects').then(r => r.data),
  get: (id: string) => api.get<Project>(`/projects/${id}`).then(r => r.data),
  delete: (id: string) => api.delete(`/projects/${id}`).then(r => r.data),

  uploadZip: (file: File, name?: string) => {
    const form = new FormData();
    form.append('file', file);
    if (name) form.append('name', name);
    return api.post<Project>('/projects/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data);
  },

  cloneGithub: (url: string, name?: string) => {
    const form = new FormData();
    form.append('url', url);
    if (name) form.append('name', name);
    return api.post<Project>('/projects/github', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data);
  },
};

// ── Analysis ───────────────────────────────────────────────────────────────

export const analysisApi = {
  getFiles: (
    projectId: string,
    params?: {
      language?: string;
      risk_level?: string;
      sort_by?: string;
      order?: 'asc' | 'desc';
      limit?: number;
      offset?: number;
    }
  ) => api.get<FileList>(`/projects/${projectId}/files`, { params }).then(r => r.data),

  getFile: (projectId: string, fileId: string) =>
    api.get<SourceFile>(`/projects/${projectId}/files/${fileId}`).then(r => r.data),

  getDashboard: (projectId: string) =>
    api.get<DashboardSummary>(`/projects/${projectId}/dashboard`).then(r => r.data),
};

// ── Graph ──────────────────────────────────────────────────────────────────

export const graphApi = {
  getGraph: (projectId: string) =>
    api.get<DependencyGraph>(`/projects/${projectId}/graph`).then(r => r.data),
};

// ── Debt ───────────────────────────────────────────────────────────────────

export const debtApi = {
  getDebt: (projectId: string) =>
    api.get<DebtSummary>(`/projects/${projectId}/debt`).then(r => r.data),
};

// ── Security ───────────────────────────────────────────────────────────────

export const securityApi = {
  getSecurity: (projectId: string) =>
    api.get<SecuritySummary>(`/projects/${projectId}/security`).then(r => r.data),
};

// ── Roadmap ────────────────────────────────────────────────────────────────

export const roadmapApi = {
  getRoadmap: (projectId: string) =>
    api.get<MigrationRoadmap>(`/projects/${projectId}/roadmap`).then(r => r.data),
};

// ── AI ─────────────────────────────────────────────────────────────────────

export const aiApi = {
  generateRecommendations: (projectId: string, apiKey?: string, provider?: string) =>
    api.post<AIRecommendationsResponse>(`/projects/${projectId}/recommendations`, {
      project_id: projectId,
      api_key: apiKey || '',
      provider: provider || 'openai',
    }).then(r => r.data),

  generateNarrative: (projectId: string, apiKey?: string, provider?: string) =>
    api.post<{ narrative: string }>(`/projects/${projectId}/roadmap-narrative`, {
      project_id: projectId,
      api_key: apiKey || '',
      provider: provider || 'openai',
    }).then(r => r.data),
};

// ── Export ─────────────────────────────────────────────────────────────────

export const exportApi = {
  exportReport: (projectId: string, format: 'pdf' | 'docx', apiKey?: string, provider?: string) => {
    const token = localStorage.getItem('legacylens_token') || '';
    const params: Record<string, string> = { format };
    if (apiKey) params.api_key = apiKey;
    if (provider) params.provider = provider;
    if (token) params.token = token;
    return `${BASE_URL}/api/projects/${projectId}/export?${new URLSearchParams(params).toString()}`;
  },
  exportMetadata: (projectId: string) => {
    const token = localStorage.getItem('legacylens_token') || '';
    const params: Record<string, string> = {};
    if (token) params.token = token;
    return `${BASE_URL}/api/projects/${projectId}/export/metadata?${new URLSearchParams(params).toString()}`;
  },
};
