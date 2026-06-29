import { toast } from './toast.svelte';

const AUTH_BASE = '/auth';

type User = {
  id: string;
  email: string;
  role: string;
  username?: string;
};

type AuthState = {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  loading: boolean;
};

function loadFromStorage(): Partial<AuthState> {
  try {
    return {
      accessToken: localStorage.getItem('accessToken'),
      refreshToken: localStorage.getItem('refreshToken'),
      user: JSON.parse(localStorage.getItem('user') ?? 'null'),
    };
  } catch {
    return {};
  }
}

function saveToStorage(state: AuthState) {
  if (state.accessToken) {
    localStorage.setItem('accessToken', state.accessToken);
  } else {
    localStorage.removeItem('accessToken');
  }
  if (state.refreshToken) {
    localStorage.setItem('refreshToken', state.refreshToken);
  } else {
    localStorage.removeItem('refreshToken');
  }
  if (state.user) {
    localStorage.setItem('user', JSON.stringify(state.user));
  } else {
    localStorage.removeItem('user');
  }
}

const stored = loadFromStorage();

const auth = $state<AuthState>({
  user: stored.user ?? null,
  accessToken: stored.accessToken ?? null,
  refreshToken: stored.refreshToken ?? null,
  loading: false,
});

async function request<T>(url: string, opts: RequestInit = {}): Promise<T> {
  const method = opts.method ?? 'GET';
  console.log(`[Auth] ${method} ${url}`);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opts.headers as Record<string, string>),
  };

  if (auth.accessToken) {
    headers['Authorization'] = `Bearer ${auth.accessToken}`;
  }

  const res = await fetch(url, { ...opts, headers });

  if (res.status === 401 && auth.refreshToken) {
    console.log(`[Auth] 401 ${url} → tentative refresh`);
    const refreshed = await tryRefresh();
    if (refreshed) {
      console.log(`[Auth] refresh OK, retry ${url}`);
      headers['Authorization'] = `Bearer ${auth.accessToken}`;
      const retry = await fetch(url, { ...opts, headers });
      if (!retry.ok) {
        const text = await retry.text();
        console.error(`[Auth] retry échoué ${retry.status}:`, text);
        throw new Error(text);
      }
      return retry.json();
    }
    console.error(`[Auth] refresh échoué`);
  }

  if (!res.ok) {
    const text = await res.text();
    console.error(`[Auth] ${res.status} ${url}:`, text);
    throw new Error(text);
  }
  return res.json().catch(() => ({}) as T);
}

async function tryRefresh(): Promise<boolean> {
  console.log(`[Auth] tentative refresh`);
  try {
    const res = await fetch(`${AUTH_BASE}/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: auth.refreshToken }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error(`[Auth] refresh échoué ${res.status}:`, text);
      return false;
    }
    const data = await res.json();
    auth.accessToken = data.accessToken;
    auth.refreshToken = data.refreshToken;
    saveToStorage(auth);
    console.log(`[Auth] refresh réussi`);
    return true;
  } catch (err) {
    console.error(`[Auth] refresh erreur:`, err);
    return false;
  }
}

export function getAuth() {
  return auth;
}

export async function login(email: string, password: string) {
  auth.loading = true;
  console.log(`[Auth] login ${email}`);
  try {
    const data = await request<{
      accessToken: string;
      refreshToken: string;
      user: User;
    }>(`${AUTH_BASE}/login`, {
      method: 'POST',
      body: JSON.stringify({ contact: email, password }),
    });

    console.log(`[Auth] login réussi:`, {
      email: data.user.email,
      role: data.user.role,
    });
    auth.accessToken = data.accessToken;
    auth.refreshToken = data.refreshToken;
    auth.user = data.user;
    saveToStorage(auth);
    toast.success(`Connecté en tant que ${data.user.email}`);
    return data.user;
  } catch (err) {
    console.error(`[Auth] login échoué:`, err);
    throw err;
  } finally {
    auth.loading = false;
  }
}

export async function logout() {
  console.log(`[Auth] logout`);
  if (auth.refreshToken) {
    try {
      await fetch(`${AUTH_BASE}/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: auth.refreshToken }),
      });
    } catch (err) {
      console.error(`[Auth] logout erreur:`, err);
    }
  }
  auth.accessToken = null;
  auth.refreshToken = null;
  auth.user = null;
  saveToStorage(auth);
}

export async function checkAuth(): Promise<boolean> {
  if (!auth.accessToken) {
    console.log(`[Auth] checkAuth: pas de token stocké`);
    return false;
  }
  auth.loading = true;
  console.log(`[Auth] checkAuth: validation du token...`);
  try {
    const data = await request<{
      id: string;
      email: string;
      role: string;
      username?: string;
    }>(`${AUTH_BASE}/me`, { method: 'GET' });
    auth.user = {
      id: data.id,
      email: data.email,
      role: data.role,
      username: data.username,
    };
    saveToStorage(auth);
    console.log(`[Auth] checkAuth OK: ${data.email} (${data.role})`);
    return true;
  } catch (err) {
    console.error(`[Auth] checkAuth échoué:`, err);
    auth.accessToken = null;
    auth.refreshToken = null;
    auth.user = null;
    saveToStorage(auth);
    return false;
  } finally {
    auth.loading = false;
  }
}
