const API_BASE = '/api';
const ASSETS_BASE = '/assets';

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

async function postJSON<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export interface GenerateResult {
  images: { url: string; width: number; height: number }[];
}

export async function generateRoom(imageBase64: string): Promise<GenerateResult> {
  return postJSON('/generate-room', { image: imageBase64 });
}

/**
 * Build a full URL for a GLB asset served by the backend.
 * Handles both legacy filesystem paths and new /uploads/ paths.
 */
export function getAssetUrl(glbPath: string): string {
  // New upload-based paths already start with /uploads/
  if (glbPath.startsWith('/uploads/') || glbPath.startsWith('http')) {
    return glbPath;
  }
  // Legacy filesystem-based paths
  return ASSETS_BASE + '/' + glbPath.split('/').map(encodeURIComponent).join('/');
}

export async function getCatalogs(): Promise<{ catalogs: import('./types').CatalogSummary[] }> {
  return fetchJSON('/catalogs');
}

export async function getModules(
  catalogId: string,
  filters?: import('./types').ModuleFilters,
): Promise<{ modules: import('./types').Module[] }> {
  const params = new URLSearchParams();
  if (filters?.tier) params.set('tier', filters.tier);
  if (filters?.subtype) params.set('subtype', filters.subtype);
  if (filters?.minWidth != null) params.set('minWidth', String(filters.minWidth));
  if (filters?.maxWidth != null) params.set('maxWidth', String(filters.maxWidth));
  if (filters?.isCorner != null) params.set('isCorner', String(filters.isCorner));
  const qs = params.toString();
  return fetchJSON(`/catalogs/${catalogId}/modules${qs ? `?${qs}` : ''}`);
}
