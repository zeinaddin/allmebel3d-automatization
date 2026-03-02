import type { Module } from '../../api/types';

const SUBTYPE_LABELS: Record<string, string> = {
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

const SUBTYPE_COLORS: Record<string, string> = {
  standard: 'bg-blue-100 text-blue-800',
  drawer: 'bg-amber-100 text-amber-800',
  combo: 'bg-purple-100 text-purple-800',
  corner: 'bg-green-100 text-green-800',
  filler: 'bg-gray-100 text-gray-800',
  sink: 'bg-cyan-100 text-cyan-800',
  oven: 'bg-red-100 text-red-800',
  with_oven: 'bg-orange-100 text-orange-800',
  with_oven_microwave: 'bg-rose-100 text-rose-800',
};

interface ModuleCardProps {
  module: Module;
}

export function ModuleCard({ module }: ModuleCardProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold text-gray-900 text-sm leading-tight">
          {module.code}
          {module.width > 0 && <span className="text-primary-600 ml-1">{module.width}</span>}
        </h3>
        {module.isCorner && (
          <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">
            УГЛ
          </span>
        )}
      </div>

      <p className="text-xs text-gray-500 mb-3 truncate" title={module.name}>
        {module.name}
      </p>

      <div className="flex flex-wrap gap-1">
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            SUBTYPE_COLORS[module.subtype] ?? 'bg-gray-100 text-gray-600'
          }`}
        >
          {SUBTYPE_LABELS[module.subtype] ?? module.subtype}
        </span>
        {module.width > 0 && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
            {module.width} мм
          </span>
        )}
      </div>

      {module.annotations.length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-100">
          {module.annotations.map((a, i) => (
            <span key={i} className="text-xs text-gray-400 block truncate" title={a}>
              {a}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
