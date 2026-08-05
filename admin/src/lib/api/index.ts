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

  const res = await fetch(fullUrl, { ...opts, headers });

  if (res.status === 401 && auth.refreshToken) {
    const refreshOk = await tryRefresh();
    if (refreshOk) {
      headers['Authorization'] = `Bearer ${auth.accessToken}`;
      const retry = await fetch(fullUrl, { ...opts, headers });
      if (!retry.ok) {
        const text = await retry.text();
        throw new Error(text);
      }
      const body = await resOrEmpty(retry);
      return body as T;
    }
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
    throw new Error(text);
  }
  return resOrEmpty(res) as Promise<T>;
}

/*
 * Some backend DELETE/PATCH endpoints return 200 with an empty body.
 * res.json() on an empty body throws 'Unexpected end of JSON input'.
 * This helper parses only non-empty responses.
 */
async function resOrEmpty(res: Response) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new Error('Invalid JSON response from server');
  }
}

async function tryRefresh(): Promise<boolean> {
  const auth = getAuth();
  try {
    const res = await fetch('/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: auth.refreshToken }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    auth.accessToken = data.accessToken;
    auth.refreshToken = data.refreshToken;
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

export const api = {
  // ========== Education ==========
  listEducationPaths: () => request<any[]>('/education/paths'),
  listEducationLessons: (pathId?: string) => {
    const params = pathId ? `?pathId=${pathId}` : '';
    return request<any[]>(`/education/lessons${params}`);
  },
  createEducationPath: (data: any) =>
    request<any>('/education/paths', { method: 'POST', body: JSON.stringify(data) }),
  updateEducationPath: (id: string, data: any) =>
    request<any>('/education/paths/' + id, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteEducationPath: (id: string) =>
    request<any>('/education/paths/' + id, { method: 'DELETE' }),
  getEducationLesson: (id: string) => request<any>('/education/lessons/' + id),
  createEducationLesson: (data: any) =>
    request<any>('/education/lessons', { method: 'POST', body: JSON.stringify(data) }),
  updateEducationLesson: (id: string, data: any) =>
    request<any>('/education/lessons/' + id, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteEducationLesson: (id: string) =>
    request<any>('/education/lessons/' + id, { method: 'DELETE' }),
  createEducationAdviceLink: (data: any) =>
    request<any>('/education/advice-links', { method: 'POST', body: JSON.stringify(data) }),
  deleteEducationAdviceLink: (id: string) =>
    request<any>('/education/advice-links/' + id, { method: 'DELETE' }),
  saveEducationCanvas: (edges: { source: string; target: string }[]) =>
    request<any>('/education/canvas/save', { method: 'POST', body: JSON.stringify({ edges }) }),
  // ========== Quiz ==========
  listQuizzes: () => request<any[]>('/quiz'),
  getQuiz: (id: string) => request<any>('/quiz/' + id),
  createQuiz: (data: any) =>
    request<any>('/quiz', { method: 'POST', body: JSON.stringify(data) }),
  updateQuiz: (id: string, data: any) =>
    request<any>('/quiz/' + id, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteQuiz: (id: string) =>
    request<any>('/quiz/' + id, { method: 'DELETE' }),
  addQuestion: (quizId: string, data: any) =>
    request<any>('/quiz/' + quizId + '/questions', { method: 'POST', body: JSON.stringify(data) }),
  updateQuestion: (qid: string, data: any) =>
    request<any>('/quiz/questions/' + qid, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteQuestion: (qid: string) =>
    request<any>('/quiz/questions/' + qid, { method: 'DELETE' }),
  addChoice: (qid: string, data: any) =>
    request<any>('/quiz/questions/' + qid + '/choices', { method: 'POST', body: JSON.stringify(data) }),
  updateChoice: (cid: string, data: any) =>
    request<any>('/quiz/choices/' + cid, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteChoice: (cid: string) =>
    request<any>('/quiz/choices/' + cid, { method: 'DELETE' }),
  linkQuizToLesson: (quizId: string, lessonId: string) =>
    request<any>('/quiz/' + quizId + '/lessons/' + lessonId, { method: 'POST' }),
  unlinkQuizFromLesson: (quizId: string, lessonId: string) =>
    request<any>('/quiz/' + quizId + '/lessons/' + lessonId, { method: 'DELETE' }),

  getEducationPathStats: () => request<any>('/education/stats/paths'),
  getEducationLessonStats: () => request<any>('/education/stats/lessons'),

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
  toggleProductStatus: (id: string, isActive: boolean) =>
    request<any>('/products/' + id + '/status', {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    }),
  deleteProduct: (id: string) =>
    request<any>('/products/' + id, { method: 'DELETE' }),

  listRules: () => request<any[]>('/rules'),
  getRule: (id: string) => request<any>('/rules/' + id),
  createRule: (data: any) =>
    request<any>('/rules', { method: 'POST', body: JSON.stringify(data) }),
  updateRule: (id: string, d: any) =>
    request<any>('/rules/' + id, { method: 'PUT', body: JSON.stringify(d) }),
  toggleRuleStatus: (id: string, isActive: boolean) =>
    request<any>('/rules/' + id + '/status', {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    }),
  deleteRule: (id: string) =>
    request<any>('/rules/' + id, { method: 'DELETE' }),

  getCatalog: () => request<any>('/catalog'),
  updateCatalog: (data: any) =>
    request<any>('/catalog', { method: 'PUT', body: JSON.stringify(data) }),

  getCatalogFragments: () => request<any>('/catalog-fragments'),
  updateCatalogFragments: (data: any) =>
    request<any>('/catalog-fragments', { method: 'PUT', body: JSON.stringify(data) }),
  previewNlg: (data: { kind: string; severity: string; vars?: Record<string, any> }) =>
    request<any>('/nlg/preview', { method: 'POST', body: JSON.stringify(data) }),
  listNlgIntents: () => request<string[]>('/nlg/intents'),

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

  testCamenBert: (body: string) =>
    request<any>('/camenbert/test', {
      method: 'POST',
      body: JSON.stringify({ body }),
    }),
  camenBertStatus: () => request<any>('/camenbert/status'),
  loadCamenBert: () => request<any>('/camenbert/load', { method: 'POST' }),

  modelList: () => request<any>('/models'),
  runModelTraining: (params: { epochs?: number; batchSize?: number; lr?: number }) =>
    request<any>('/models/train', {
      method: 'POST',
      body: JSON.stringify(params),
    }),
  datasetInfo: () => request<any>('/models/dataset'),
  trainingStatus: () => request<any>('/models/training/status'),
  cancelTraining: () => request<any>('/models/training/cancel', { method: 'POST' }),
  deployModel: () => request<any>('/models/training/deploy', { method: 'POST' }),
  trainingLogs: (offset = 0) => request<any>('/models/training/logs?offset=' + offset),
  regexStats: () => request<any>('/models/regex-stats'),

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

  purgeNotifications: (data?: { type?: string; before?: string }) =>
    request<any>('/notifications', {
      method: 'DELETE',
      body: JSON.stringify(data ?? {}),
    }),

  listScheduled: () => request<any[]>('/notifications/scheduled'),

  createScheduled: (data: {
    title: string;
    body: string;
    type?: string;
    severity?: string;
    scheduledAt: string;
    recurrence?: string;
    targetType?: string;
    targetIds?: string[];
  }) =>
    request<any>('/notifications/scheduled', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateScheduled: (id: string, data: any) =>
    request<any>(`/notifications/scheduled/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteScheduled: (id: string) =>
    request<any>(`/notifications/scheduled/${id}`, { method: 'DELETE' }),

  // ========== Users ==========
  listUsers: (params: { q?: string; role?: string; status?: string; page?: number; limit?: number }) => {
    const sp = new URLSearchParams();
    if (params.q) sp.set('q', params.q);
    if (params.role) sp.set('role', params.role);
    if (params.status) sp.set('status', params.status);
    if (params.page) sp.set('page', String(params.page));
    if (params.limit) sp.set('limit', String(params.limit));
    return request<any>(`/users?${sp.toString()}`);
  },
  getUser: (id: string) => request<any>(`/users/${id}`),
  createUser: (data: { email: string; password: string; role: string }) =>
    request<any>('/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id: string, data: any) =>
    request<any>(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteUser: (id: string) =>
    request<any>(`/users/${id}`, { method: 'DELETE' }),
  getUserSessions: (id: string) => request<any[]>(`/users/${id}/sessions`),
  revokeUserSessions: (id: string) =>
    request<any>(`/users/${id}/sessions`, { method: 'DELETE' }),

  dashboardAnalytics: () => request<any>('/analytics/dashboard'),

  // ========== Logs ==========
  listAuthLogs: (params: { userId?: string; action?: string; success?: string; from?: string; to?: string; page?: number; limit?: number }) => {
    const sp = new URLSearchParams();
    if (params.userId) sp.set('userId', params.userId);
    if (params.action) sp.set('action', params.action);
    if (params.success) sp.set('success', params.success);
    if (params.from) sp.set('from', params.from);
    if (params.to) sp.set('to', params.to);
    if (params.page) sp.set('page', String(params.page));
    if (params.limit) sp.set('limit', String(params.limit));
    return request<any>(`/auth-logs?${sp.toString()}`);
  },
  getAuthLog: (id: string) => request<any>(`/auth-logs/${id}`),
  listAuditLogs: (params: { entityType?: string; entityId?: string; action?: string; actorId?: string; from?: string; to?: string; page?: number; limit?: number }) => {
    const sp = new URLSearchParams();
    if (params.entityType) sp.set('entityType', params.entityType);
    if (params.entityId) sp.set('entityId', params.entityId);
    if (params.action) sp.set('action', params.action);
    if (params.actorId) sp.set('actorId', params.actorId);
    if (params.from) sp.set('from', params.from);
    if (params.to) sp.set('to', params.to);
    if (params.page) sp.set('page', String(params.page));
    if (params.limit) sp.set('limit', String(params.limit));
    return request<any>(`/audit-logs?${sp.toString()}`);
  },
  purgeAuthLogs: (data?: { before?: string }) =>
    request<any>('/auth-logs', { method: 'DELETE', body: JSON.stringify(data ?? {}) }),
  purgeAuditLogs: (data?: { before?: string }) =>
    request<any>('/audit-logs', { method: 'DELETE', body: JSON.stringify(data ?? {}) }),

  // ========== Eligibility ==========
  eligibilityDashboard: (customerId: string) =>
    request<any>(`/eligibility/dashboard/${customerId}`),
  eligibilityEvaluate: (data: { customerId: string; productCode: string; inputs?: Record<string, any>; mode?: string }) =>
    request<any>('/eligibility/evaluate', { method: 'POST', body: JSON.stringify(data) }),
  eligibilitySimulate: (data: { customerId: string; productCode: string; adjustments: Record<string, number>; mode?: string }) =>
    request<any>('/eligibility/simulate', { method: 'POST', body: JSON.stringify(data) }),
  eligibilityImprovementPlan: (customerId: string) =>
    request<any>(`/eligibility/improvement-plan/${customerId}`),
  eligibilityProducts: () => request<any[]>('/eligibility/products'),
  eligibilityProductRules: (code: string) => request<any>(`/eligibility/products/${code}/rules`),

  // ========== Monitoring ==========
  monitoringStats: () => request<any>('/monitoring/stats'),
  driftReport: () => request<any>('/monitoring/drift'),
  saveBaseline: () => request<any>('/monitoring/baseline', { method: 'POST' }),

  // ========== SMS (contrôle admin) ==========
  smsStats: (params: {
    operator?: string;
    status?: string;
    direction?: string;
    customerId?: string;
    days?: number;
  }) => {
    const sp = new URLSearchParams();
    if (params.operator) sp.set('operator', params.operator);
    if (params.status) sp.set('status', params.status);
    if (params.direction) sp.set('direction', params.direction);
    if (params.customerId) sp.set('customerId', params.customerId);
    if (params.days) sp.set('days', String(params.days));
    return request<any>(`/sms/stats?${sp.toString()}`);
  },
  listSmsRules: (customerId?: string) =>
    request<any[]>(`/sms/rules${customerId ? `?customerId=${customerId}` : ''}`),
  createSmsRule: (data: any) =>
    request<any>('/sms/rules', { method: 'POST', body: JSON.stringify(data) }),
  updateSmsRule: (id: string, data: any) =>
    request<any>(`/sms/rules/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  toggleSmsRuleStatus: (id: string, isActive: boolean) =>
    request<any>(`/sms/rules/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    }),
  deleteSmsRule: (id: string) => request<any>(`/sms/rules/${id}`, { method: 'DELETE' }),

  smsPipelineConfig: () => request<any>('/sms/pipeline'),
  updateSmsPipelineConfig: (data: {
    regexEnabled?: boolean;
    camenbertEnabled?: boolean;
    camenbertThreshold?: number;
  }) =>
    request<any>('/sms/pipeline', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
};
