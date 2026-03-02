import type { WallPlan, SolvedSegment } from '../../algorithm/types';
import type { Module } from '../../api/types';

const SUBTYPE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  standard: { bg: '#1a3a2a', border: '#2d6b45', text: '#5EC97A' },
  drawer:   { bg: '#3a2a15', border: '#6b5020', text: '#E8B84D' },
  combo:    { bg: '#3a2815', border: '#6b6020', text: '#E8D04D' },
  sink:     { bg: '#152535', border: '#205A8B', text: '#4DA8E8' },
  oven:     { bg: '#351515', border: '#8B2020', text: '#E84D4D' },
  corner:   { bg: '#251535', border: '#5A208B', text: '#B44DE8' },
  filler:   { bg: '#1a1a1a', border: '#444444', text: '#888888' },
};

function ModuleChip({ module, scale }: { module: Module; scale: number }) {
  const pxWidth = Math.max(module.width * scale, 28);
  const colors = SUBTYPE_COLORS[module.subtype] ?? SUBTYPE_COLORS.standard!;

  return (
    <div
      className="flex flex-col items-center justify-center flex-shrink-0 rounded overflow-hidden"
      style={{
        width: pxWidth,
        height: 64,
        background: colors.bg,
        border: `1.5px solid ${colors.border}`,
      }}
    >
      <span
        className="font-bold leading-none text-center px-0.5"
        style={{ fontSize: pxWidth > 50 ? 10 : 8, color: colors.text }}
      >
        {pxWidth > 40 ? module.code : ''}
      </span>
      <span
        className="leading-none mt-0.5"
        style={{ fontSize: 9, color: colors.text, opacity: 0.8 }}
      >
        {module.width}
      </span>
    </div>
  );
}

function SegmentBlock({
  segment,
  scale,
}: {
  segment: SolvedSegment;
  scale: number;
}) {
  // Stove anchor → special rendering
  const isStove =
    segment.kind === 'anchor' &&
    (segment.anchorType === 'stove' || segment.anchorType === 'oven');

  if (isStove) {
    const pxWidth = Math.max(segment.width * scale, 28);
    return (
      <div
        className="flex flex-col items-center justify-center flex-shrink-0 rounded overflow-hidden"
        style={{
          width: pxWidth,
          height: 64,
          background: '#351a15',
          border: '1.5px solid #A04020',
        }}
      >
        <span className="font-bold text-[10px] leading-none" style={{ color: '#FF7043' }}>
          {segment.anchorType === 'oven' ? 'СДШ' : 'Плита'}
        </span>
        <span className="text-[9px] leading-none mt-0.5" style={{ color: '#FF7043', opacity: 0.8 }}>
          {segment.width}
        </span>
      </div>
    );
  }

  return (
    <div className="flex gap-px">
      {segment.modules.map((mod, i) => (
        <ModuleChip key={`${mod.id}-${i}`} module={mod} scale={scale} />
      ))}
    </div>
  );
}

interface WallDiagramProps {
  plan: WallPlan;
  maxPixelWidth?: number;
}

export function WallDiagram({ plan, maxPixelWidth = 700 }: WallDiagramProps) {
  const scale = maxPixelWidth / plan.wallLength;

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <h3 className="text-sm font-medium text-gray-700">
          {plan.wallId === 'wall-a' ? 'Стена A' : 'Стена B'} — {plan.wallLength} мм
        </h3>
        <span className="text-xs px-2 py-0.5 rounded-full bg-primary-100 text-primary-700 font-medium">
          Оценка: {plan.totalScore}
        </span>
      </div>

      {/* Visual wall diagram */}
      <div
        className="flex items-end gap-px bg-gray-100 rounded-lg p-2 overflow-x-auto"
        style={{ maxWidth: maxPixelWidth + 20 }}
      >
        {plan.segments.map((seg, i) => (
          <SegmentBlock key={i} segment={seg} scale={scale} />
        ))}
      </div>

      {/* Ruler */}
      <div className="flex mt-1" style={{ maxWidth: maxPixelWidth + 20, paddingLeft: 8, paddingRight: 8 }}>
        {plan.segments.map((seg, i) => (
          <div
            key={i}
            className="text-center text-[10px] text-gray-400 border-l border-gray-300 first:border-l-0"
            style={{ width: seg.width * scale }}
          >
            {seg.width}
          </div>
        ))}
      </div>
    </div>
  );
}
