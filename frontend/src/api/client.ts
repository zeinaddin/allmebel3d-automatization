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

/**
 * Build a full URL for a GLB asset served by the backend.
 * The glbPath comes from the module API (e.g. "Каталог Рояль Мебелей/С - Нижние модули/С 300.glb").
 * Each path segment is URI-encoded to handle Cyrillic + spaces.
 */
export function getAssetUrl(glbPath: string): string {
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
