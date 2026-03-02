import { useMemo } from 'react';
import { useCatalogStore } from '../../store/useCatalogStore';
import { Tabs } from '../common/Tabs';
import { ModuleCard } from './ModuleCard';
import type { Tier, Subtype } from '../../api/types';

const TIER_LABELS: Record<Tier, string> = {
  lower: 'Нижние',
  upper: 'Верхние',
  upper_tall: 'Высокие верхние',
  antresol_35: 'Антресоли 35',
  antresol_45: 'Антресоли 45',
  antresol_35_deep: 'Антресоли 35 глубокие',
  antresol_45_deep: 'Антресоли 45 глубокие',
  pantry: 'Пеналы',
};

const SUBTYPE_LABELS: Record<Subtype, string> = {
  standard: 'Стандарт',
  drawer: 'Ящики',
  combo: 'Комбо',
  corner: 'Угловой',
  filler: 'Филлер',
  sink: 'Мойка',
  oven: 'Духовка',
  with_oven: 'С духовкой',
  with_oven_microwave: 'С духовкой и СВЧ',
};

export function CatalogBrowser() {
  const {
    catalogs,
    selectedCatalogId,
    modules,
    tierFilter,
    subtypeFilter,
    loading,
    error,
    fetchCatalogs,
    selectCatalog,
    setTierFilter,
    setSubtypeFilter,
  } = useCatalogStore();

  // Compute available tiers/subtypes from loaded modules
  const availableTiers = useMemo(() => {
    const counts = new Map<Tier, number>();
    for (const m of modules) {
      counts.set(m.tier, (counts.get(m.tier) ?? 0) + 1);
    }
    return Array.from(counts.entries()).map(([value, count]) => ({
      value,
      label: TIER_LABELS[value],
      count,
    }));
  }, [modules]);

  const availableSubtypes = useMemo(() => {
    const filtered = tierFilter ? modules.filter((m) => m.tier === tierFilter) : modules;
    const counts = new Map<Subtype, number>();
    for (const m of filtered) {
      counts.set(m.subtype, (counts.get(m.subtype) ?? 0) + 1);
    }
    return Array.from(counts.entries()).map(([value, count]) => ({
      value,
      label: SUBTYPE_LABELS[value],
      count,
    }));
  }, [modules, tierFilter]);

  // Filter modules
  const filteredModules = useMemo(() => {
    return modules.filter((m) => {
      if (tierFilter && m.tier !== tierFilter) return false;
      if (subtypeFilter && m.subtype !== subtypeFilter) return false;
      return true;
    });
  }, [modules, tierFilter, subtypeFilter]);

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600 mb-2 font-medium">Ошибка загрузки</p>
        <p className="text-sm text-gray-500">{error}</p>
        <button
          onClick={() => fetchCatalogs()}
          className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-md text-sm hover:bg-primary-700"
        >
          Повторить
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Catalog selector */}
      {catalogs.length > 1 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Каталог</label>
          <select
            value={selectedCatalogId ?? ''}
            onChange={(e) => selectCatalog(e.target.value)}
            className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            {catalogs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.moduleCount} модулей)
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Tier filter */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Ярус</label>
        <Tabs tabs={availableTiers} active={tierFilter} onSelect={setTierFilter} />
      </div>

      {/* Subtype filter */}
      {availableSubtypes.length > 1 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Тип</label>
          <Tabs tabs={availableSubtypes} active={subtypeFilter} onSelect={setSubtypeFilter} />
        </div>
      )}

      {/* Module count */}
      <p className="text-sm text-gray-500">
        {loading ? 'Загрузка...' : `${filteredModules.length} модулей`}
      </p>

      {/* Module grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse"
            >
              <div className="h-4 bg-gray-200 rounded w-2/3 mb-3" />
              <div className="h-3 bg-gray-200 rounded w-full mb-3" />
              <div className="h-5 bg-gray-200 rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredModules.map((m) => (
            <ModuleCard key={m.id} module={m} />
          ))}
        </div>
      )}
    </div>
  );
}
