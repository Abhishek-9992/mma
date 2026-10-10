const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

export function getAuthToken(): string | null {
  return localStorage.getItem('mma_auth_token');
}

export function setAuthToken(token: string): void {
  localStorage.setItem('mma_auth_token', token);
}

export function clearAuthToken(): void {
  localStorage.removeItem('mma_auth_token');
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(errorData.error || `Request failed with status ${res.status}`);
  }

  return res.json();
}

export const api = {
  // Auth
  login: (username: string, password: string) =>
    request<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    }),
  getMe: () => request<{ user: any }>('/auth/me'),

  // Personas
  getPersonas: () => request<{ personas: any[] }>('/personas'),
  getPersona: (id: string) => request<{ persona: any }>(`/personas/${id}`),

  // Voice Session Preflight
  createVoiceSession: (personaId?: string) =>
    request<{ sessionId: string; session: any; persona: any }>('/voice/session', {
      method: 'POST',
      body: JSON.stringify({ personaId })
    }),

  // Dashboard (Protected)
  getSummary: () => request<{ summary: any }>('/dashboard/summary'),
  getTrends: (days = 14) => request<{ trends: any[] }>(`/dashboard/trends?days=${days}`),
  getSessions: (params: {
    limit?: number;
    offset?: number;
    status?: string;
    personaId?: string;
    sortField?: string;
    sortOrder?: 'ASC' | 'DESC';
  } = {}) => {
    const query = new URLSearchParams();
    if (params.limit) query.set('limit', params.limit.toString());
    if (params.offset) query.set('offset', params.offset.toString());
    if (params.status) query.set('status', params.status);
    if (params.personaId) query.set('personaId', params.personaId);
    if (params.sortField) query.set('sortField', params.sortField);
    if (params.sortOrder) query.set('sortOrder', params.sortOrder);
    return request<{ sessions: any[]; total: number }>(`/dashboard/sessions?${query.toString()}`);
  },
  getSessionDetails: (id: string) => request<{ session: any; persona: any; messages: any[]; usageEvents: any[] }>(`/dashboard/sessions/${id}`),
  getPricing: () => request<{ pricing: any }>('/dashboard/pricing'),
};
