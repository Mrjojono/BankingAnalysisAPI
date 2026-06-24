import { getAuth } from '../stores/auth.svelte';

const BASE = '/api/admin';

async function request<T>(url: string, opts?: RequestInit): Promise<T> {
  const fullUrl = BASE + url;
  const auth = getAuth();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opts?.headers as Record<string, string>),
  };

  if (auth.accessToken) {
    headers['Authorization'] = `Bearer ${auth.accessToken}`;
  }

  const method = opts?.method ?? 'GET';
  console.log(`[API] ${method} ${fullUrl}`);

  const res = await fetch(fullUrl, { ...opts, headers });

  if (res.status === 401 && auth.refreshToken) {
    console.log(`[API] 401 ${fullUrl} → tentative refresh`);
    const refreshOk = await tryRefresh();
    if (refreshOk) {
      console.log(`[API] refresh OK, retry ${fullUrl}`);
      headers['Authorization'] = `Bearer ${auth.accessToken}`;
      const retry = await fetch(fullUrl, { ...opts, headers });
      if (!retry.ok) {
        const text = await retry.text();
        console.error(`[API] retry échoué ${retry.status} ${fullUrl}:`, text);
        throw new Error(text);
      }
      return retry.json();
    }
    console.error(`[API] refresh échoué, session expirée`);
    auth.accessToken = null;
    auth.refreshToken = null;
    auth.user = null;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    throw new Error('Session expirée');
  }

  if (!res.ok) {
    const text = await res.text();
    console.error(`[API] ${res.status} ${fullUrl}:`, text);
    throw new Error(text);
  }
  return res.json();
}

async function tryRefresh(): Promise<boolean> {
  const auth = getAuth();
  try {
    console.log(`[API] refresh token: /auth/refresh`);
    const res = await fetch('/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: auth.refreshToken }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error(`[API] refresh échoué ${res.status}:`, text);
      return false;
    }
    const data = await res.json();
    auth.accessToken = data.accessToken;
    auth.refreshToken = data.refreshToken;
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    console.log(`[API] refresh réussi`);
    return true;
  } catch (err) {
    console.error(`[API] refresh erreur:`, err);
    return false;
  }
}

export const api = {
  listProducts: () => request<any[]>('/products'),
  getProduct: (id: string) => request<any>('/products/' + id),
  createProduct: (data: any) =>
    request<any>('/products', { method: 'POST', body: JSON.stringify(data) }),
  updateProduct: (id: string, d: any) =>
    request<any>('/products/' + id, { method: 'PUT', body: JSON.stringify(d) }),
  updateProductRules: (id: string, ruleIds: string[]) =>
    request<any>('/products/' + id + '/rules', {
      method: 'PUT',
      body: JSON.stringify({ ruleIds }),
    }),
  deleteProduct: (id: string) =>
    request<any>('/products/' + id, { method: 'DELETE' }),

  listRules: () => request<any[]>('/rules'),
  getRule: (id: string) => request<any>('/rules/' + id),
  createRule: (data: any) =>
    request<any>('/rules', { method: 'POST', body: JSON.stringify(data) }),
  updateRule: (id: string, d: any) =>
    request<any>('/rules/' + id, { method: 'PUT', body: JSON.stringify(d) }),
  deleteRule: (id: string) =>
    request<any>('/rules/' + id, { method: 'DELETE' }),

  getCatalog: () => request<any>('/catalog'),
  updateCatalog: (data: any) =>
    request<any>('/catalog', { method: 'PUT', body: JSON.stringify(data) }),

  testClassifier: (desc: string) =>
    request<any>('/classifier/test?desc=' + encodeURIComponent(desc)),

  embeddingStats: () => request<any>('/embedding/stats'),
  embeddingNeighbors: (desc: string, n = 5) =>
    request<any>(
      '/embedding/neighbors?desc=' + encodeURIComponent(desc) + '&n=' + n,
    ),

  trainingExamples: () => request<any>('/training/examples'),
  createTrainingExample: (data: any) =>
    request<any>('/training/examples', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateTrainingExample: (id: string, data: any) =>
    request<any>('/training/examples/' + id, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteTrainingExample: (id: string) =>
    request<any>('/training/examples/' + id, { method: 'DELETE' }),
  runTraining: (params: {
    epochs?: number;
    lr?: number;
    layers?: number;
    margin?: number;
  }) =>
    request<any>('/training/run', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  debugSmsFilter: (params: {
    address: string;
    body: string;
    dateSent?: string;
  }) =>
    request<any>('/sms/debug', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  notificationStats: () => request<any>('/notifications/stats'),
  listCustomers: (q?: string, page?: number, limit?: number) => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (page) params.set('page', String(page));
    if (limit) params.set('limit', String(limit));
    return request<any>(`/customers?${params.toString()}`);
  },
  broadcastNotification: (data: {
    title: string;
    body: string;
    type?: string;
    severity?: string;
    target?: string | string[];
    customerTargets?: string[];
  }) =>
    request<any>('/notifications/broadcast', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
