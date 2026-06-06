const BASE = '/api/admin';

async function request<T>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(BASE + url, {
    headers: { 'Content-Type': 'application/json', ...opts?.headers },
    ...opts,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export const api = {
  // Produits
  listProducts: () => request<any[]>('/products'),
  getProduct: (id: string) => request<any>('/products/' + id),
  createProduct: (data: any) =>
    request<any>('/products', { method: 'POST', body: JSON.stringify(data) }),
  updateProduct: (id: string, d: any) =>
    request<any>('/products/' + id, { method: 'PUT', body: JSON.stringify(d) }),
  deleteProduct: (id: string) =>
    request<any>('/products/' + id, { method: 'DELETE' }),

  // Règles
  listRules: () => request<any[]>('/rules'),
  getRule: (id: string) => request<any>('/rules/' + id),
  createRule: (data: any) =>
    request<any>('/rules', { method: 'POST', body: JSON.stringify(data) }),
  updateRule: (id: string, d: any) =>
    request<any>('/rules/' + id, { method: 'PUT', body: JSON.stringify(d) }),
  deleteRule: (id: string) =>
    request<any>('/rules/' + id, { method: 'DELETE' }),

  // Catalog
  getCatalog: () => request<any>('/catalog'),
  updateCatalog: (data: any) =>
    request<any>('/catalog', { method: 'PUT', body: JSON.stringify(data) }),
};
