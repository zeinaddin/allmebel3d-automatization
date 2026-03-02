import { create } from 'zustand';
import type { CatalogSummary, Module, Tier, Subtype } from '../api/types';
import { getCatalogs, getModules } from '../api/client';

interface CatalogState {
  // Data
  catalogs: CatalogSummary[];
  selectedCatalogId: string | null;
  modules: Module[];

  // Filters
  tierFilter: Tier | null;
  subtypeFilter: Subtype | null;

  // UI state
  loading: boolean;
  error: string | null;

  // Actions
  fetchCatalogs: () => Promise<void>;
  selectCatalog: (id: string) => Promise<void>;
  setTierFilter: (tier: Tier | null) => void;
  setSubtypeFilter: (subtype: Subtype | null) => void;
}

export const useCatalogStore = create<CatalogState>((set, get) => ({
  catalogs: [],
  selectedCatalogId: null,
  modules: [],
  tierFilter: null,
  subtypeFilter: null,
  loading: false,
  error: null,

  fetchCatalogs: async () => {
    set({ loading: true, error: null });
    try {
      const { catalogs } = await getCatalogs();
      set({ catalogs, loading: false });

      // Auto-select first catalog if none selected
      if (!get().selectedCatalogId && catalogs.length > 0) {
        await get().selectCatalog(catalogs[0]!.id);
      }
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },

  selectCatalog: async (id: string) => {
    set({ selectedCatalogId: id, loading: true, error: null, tierFilter: null, subtypeFilter: null });
    try {
      const { modules } = await getModules(id);
      set({ modules, loading: false });
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },

  setTierFilter: (tier: Tier | null) => set({ tierFilter: tier }),
  setSubtypeFilter: (subtype: Subtype | null) => set({ subtypeFilter: subtype }),
}));
