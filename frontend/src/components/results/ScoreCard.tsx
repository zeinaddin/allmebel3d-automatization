import type { KitchenPlan } from '../../algorithm/types';

interface ScoreCardProps {
  plan: KitchenPlan;
}

export function ScoreCard({ plan }: ScoreCardProps) {
  const totalModules = plan.wallPlans.reduce(
    (sum, wp) => sum + wp.segments.reduce((s, seg) => s + seg.modules.length, 0),
    0,
  );
  const totalWidth = plan.wallPlans.reduce(
    (sum, wp) => sum + wp.segments.reduce((s, seg) => s + seg.modules.reduce((sw, m) => sw + m.width, 0), 0),
    0,
  );
  const errors = plan.wallPlans.flatMap((wp) =>
    wp.segments.filter((s) => s.error).map((s) => s.error!),
  );

  const scoreColor =
    plan.overallScore >= 80
      ? 'text-green-600'
      : plan.overallScore >= 50
        ? 'text-amber-600'
        : 'text-red-600';

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-700">Результат</h3>
        <span className={`text-2xl font-bold ${scoreColor}`}>
          {plan.overallScore}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <div className="text-lg font-semibold text-gray-900">{totalModules}</div>
          <div className="text-xs text-gray-500">модулей</div>
        </div>
        <div>
          <div className="text-lg font-semibold text-gray-900">{totalWidth}</div>
          <div className="text-xs text-gray-500">мм общая</div>
        </div>
        <div>
          <div className="text-lg font-semibold text-gray-900">
            {plan.wallPlans.length}
          </div>
          <div className="text-xs text-gray-500">стен</div>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="mt-3 bg-red-50 rounded p-2">
          {errors.map((err, i) => (
            <p key={i} className="text-xs text-red-600">{err}</p>
          ))}
        </div>
      )}
    </div>
  );
}
