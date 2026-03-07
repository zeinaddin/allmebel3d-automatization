const API = '/api/admin';

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(`${API}${url}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

async function mutate<T>(url: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API}${url}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ── Companies ──
export interface Company {
  id: number;
  name: string;
  createdAt: string;
  _count: { catalogs: number };
}

export const getCompanies = () => fetchJSON<Company[]>('/companies');
export const createCompany = (name: string) => mutate<Company>('/companies', 'POST', { name });
export const updateCompany = (id: number, name: string) => mutate<Company>(`/companies/${id}`, 'PUT', { name });
export const deleteCompany = (id: number) => mutate<{ ok: boolean }>(`/companies/${id}`, 'DELETE');

// ── Catalogs ──
export interface AdminCatalog {
  id: number;
  name: string;
  companyId: number;
  company: { name: string };
  createdAt: string;
  _count: { assets: number };
}

export const getCatalogs = (companyId?: number) =>
  fetchJSON<AdminCatalog[]>(companyId ? `/catalogs?companyId=${companyId}` : '/catalogs');
export const createCatalog = (name: string, companyId: number) =>
  mutate<AdminCatalog>('/catalogs', 'POST', { name, companyId });
export const updateCatalog = (id: number, data: { name?: string; companyId?: number }) =>
  mutate<AdminCatalog>(`/catalogs/${id}`, 'PUT', data);
export const deleteCatalog = (id: number) =>
  mutate<{ ok: boolean }>(`/catalogs/${id}`, 'DELETE');

// ── Assets ──
export interface AdminAsset {
  id: number;
  catalogId: number;
  name: string;
  code: string;
  width: number;
  tier: string;
  subtype: string;
  isCorner: boolean;
  glbUrl: string;
  price: string; // Decimal comes as string from Prisma
  description: string | null;
  annotations: string[];
  createdAt: string;
  catalog: { name: string; company: { name: string } };
}

export const getAssets = (catalogId?: number) =>
  fetchJSON<AdminAsset[]>(catalogId ? `/assets?catalogId=${catalogId}` : '/assets');

export async function createAsset(formData: FormData): Promise<AdminAsset> {
  const res = await fetch(`${API}/assets`, { method: 'POST', body: formData });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error || `HTTP ${res.status}`);
  }
  return res.json() as Promise<AdminAsset>;
}

export async function updateAsset(id: number, formData: FormData): Promise<AdminAsset> {
  const res = await fetch(`${API}/assets/${id}`, { method: 'PUT', body: formData });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error || `HTTP ${res.status}`);
  }
  return res.json() as Promise<AdminAsset>;
}

export const deleteAsset = (id: number) =>
  mutate<{ ok: boolean }>(`/assets/${id}`, 'DELETE');
