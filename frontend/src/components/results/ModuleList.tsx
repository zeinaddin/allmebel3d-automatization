import type { WallPlan } from '../../algorithm/types';

const METHOD_LABELS: Record<string, { text: string; color: string }> = {
  golden_table: { text: 'Таблица', color: 'bg-purple-100 text-purple-700' },
  anchor: { text: 'Якорь', color: 'bg-blue-100 text-blue-700' },
  backtracking: { text: 'Алгоритм', color: 'bg-green-100 text-green-700' },
  'backtracking+filler': { text: 'Алгоритм + филлер', color: 'bg-amber-100 text-amber-700' },
  no_solution: { text: 'Нет решения', color: 'bg-red-100 text-red-700' },
};

interface ModuleListProps {
  plan: WallPlan;
}

export function ModuleList({ plan }: ModuleListProps) {
  return (
    <div className="space-y-3">
      {plan.segments.map((seg, i) => {
        const method = METHOD_LABELS[seg.method] ?? METHOD_LABELS.backtracking!;
        return (
          <div key={i} className="bg-white rounded-lg border border-gray-200 p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-medium text-gray-500">
                {seg.start}–{seg.start + seg.width} мм
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${method.color}`}>
                {method.text}
              </span>
              {seg.kind === 'fill' && (
                <span className="text-xs text-gray-400">
                  Оценка: {seg.score}
                </span>
              )}
            </div>

            {seg.error && (
              <p className="text-xs text-red-500 mb-1">{seg.error}</p>
            )}

            <div className="flex flex-wrap gap-1.5">
              {seg.modules.map((mod, j) => (
                <span
                  key={j}
                  className="text-xs px-2 py-1 rounded bg-gray-50 border border-gray-200 font-mono"
                >
                  {mod.code} {mod.width}
                </span>
              ))}
            </div>

            {seg.alternatives.length > 0 && (
              <details className="mt-2">
                <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">
                  {seg.alternatives.length} альтернатив
                </summary>
                <div className="mt-1 space-y-1">
                  {seg.alternatives.map((alt, j) => (
                    <div key={j} className="text-xs text-gray-500 flex items-center gap-1">
                      <span className="text-gray-400">#{j + 2}</span>
                      <span className="font-mono">
                        {alt.modules.map((m) => `${m.code} ${m.width}`).join(' + ')}
                      </span>
                      <span className="text-gray-400">(оценка: {alt.score})</span>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        );
      })}
    </div>
  );
}
