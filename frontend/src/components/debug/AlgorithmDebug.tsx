import type { KitchenPlan, SolvedSegment, SegmentContext } from '../../algorithm/types';

const METHOD_STYLES: Record<string, { label: string; bg: string; text: string }> = {
  golden_table:           { label: 'ТАБЛИЦА',           bg: 'bg-purple-100', text: 'text-purple-700' },
  'golden_table+filler': { label: 'ТАБЛИЦА+ФИЛЛЕР',   bg: 'bg-violet-100', text: 'text-violet-700' },
  anchor:                { label: 'ЯКОРЬ',             bg: 'bg-blue-100',   text: 'text-blue-700' },
  backtracking:         { label: 'АЛГОРИТМ',          bg: 'bg-green-100',  text: 'text-green-700' },
  'backtracking+filler': { label: 'АЛГОРИТМ+ФИЛЛЕР', bg: 'bg-amber-100',  text: 'text-amber-700' },
  no_solution:          { label: 'НЕТ РЕШЕНИЯ',       bg: 'bg-red-100',    text: 'text-red-700' },
};

const CONTEXT_LABELS: Record<SegmentContext, string> = {
  sink: 'мойка',
  stove: 'плита',
  standard: 'стандарт',
};

function SegmentRow({ segment, index }: { segment: SolvedSegment; index: number }) {
  const style = METHOD_STYLES[segment.method] ?? METHOD_STYLES.backtracking!;
  const end = segment.start + segment.width;

  return (
    <div className="border border-gray-100 rounded-lg overflow-hidden">
      {/* Segment header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-50">
        <span className="text-xs font-mono text-gray-400 w-5">#{index + 1}</span>
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${style.bg} ${style.text}`}>
          {style.label}
        </span>
        <span className="text-xs text-gray-600 font-mono">
          {segment.start}–{end}мм
        </span>
        <span className="text-xs text-gray-400">
          ({segment.width}мм)
        </span>
        <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
          {CONTEXT_LABELS[segment.context]}
        </span>
        {segment.kind === 'fill' && (
          <span className="text-xs text-gray-500 ml-auto">
            оценка: <span className="font-semibold">{segment.score}</span>
          </span>
        )}
      </div>

      {/* Module details */}
      {segment.modules.length > 0 && (
        <div className="px-3 py-2">
          <div className="flex flex-wrap gap-1">
            {segment.modules.map((mod, j) => (
              <span
                key={j}
                className="text-xs px-2 py-1 rounded bg-white border border-gray-200 font-mono"
              >
                {mod.code} {mod.width}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Alternatives count */}
      {segment.alternatives.length > 0 && (
        <div className="px-3 pb-2">
          <details>
            <summary className="text-[10px] text-gray-400 cursor-pointer hover:text-gray-600">
              {segment.alternatives.length} альтернатив
            </summary>
            <div className="mt-1 space-y-0.5 pl-2">
              {segment.alternatives.slice(0, 5).map((alt, j) => (
                <div key={j} className="text-[10px] text-gray-500 font-mono">
                  <span className="text-gray-400">#{j + 2}</span>{' '}
                  {alt.modules.map((m) => `${m.code} ${m.width}`).join(' + ')}{' '}
                  <span className="text-gray-400">(оценка: {alt.score})</span>
                </div>
              ))}
              {segment.alternatives.length > 5 && (
                <div className="text-[10px] text-gray-400">
                  ...и ещё {segment.alternatives.length - 5}
                </div>
              )}
            </div>
          </details>
        </div>
      )}

      {/* Validation errors */}
      {segment.validation && !segment.validation.valid && (
        <div className="px-3 pb-2">
          {segment.validation.errors.map((err, j) => (
            <span key={j} className="text-xs text-orange-500 block">{err}</span>
          ))}
        </div>
      )}

      {/* Error */}
      {segment.error && (
        <div className="px-3 pb-2">
          <span className="text-xs text-red-500">{segment.error}</span>
        </div>
      )}
    </div>
  );
}

interface AlgorithmDebugProps {
  plan: KitchenPlan;
}

export function AlgorithmDebug({ plan }: AlgorithmDebugProps) {
  // Summary stats
  const allSegments = plan.wallPlans.flatMap((wp) => wp.segments);
  const methodCounts = allSegments.reduce<Record<string, number>>((acc, s) => {
    acc[s.method] = (acc[s.method] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {/* Method summary */}
      <div className="bg-white rounded-lg border border-gray-200 p-3">
        <h3 className="text-xs font-semibold text-gray-500 mb-2">Методы решения</h3>
        <div className="flex flex-wrap gap-2">
          {Object.entries(methodCounts).map(([method, count]) => {
            const style = METHOD_STYLES[method] ?? METHOD_STYLES.backtracking!;
            return (
              <span
                key={method}
                className={`text-xs font-medium px-2 py-1 rounded ${style.bg} ${style.text}`}
              >
                {style.label}: {count}
              </span>
            );
          })}
        </div>
      </div>

      {/* Per-wall segments */}
      {plan.wallPlans.map((wp) => (
        <div key={wp.wallId}>
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-sm font-medium text-gray-700">
              {wp.wallId === 'wall-a' ? 'Стена A' : 'Стена B'} — {wp.wallLength}мм
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary-100 text-primary-700 font-medium">
              {wp.totalScore}
            </span>
          </div>
          <div className="space-y-1.5">
            {wp.segments.map((seg, i) => (
              <SegmentRow key={i} segment={seg} index={i} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
