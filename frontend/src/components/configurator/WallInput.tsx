import { useEffect, useMemo } from 'react';
import { useKitchenStore } from '../../store/useKitchenStore';
import { useCatalogStore } from '../../store/useCatalogStore';

const DEFAULT_SINK_WIDTHS = [600];
const DEFAULT_STOVE_WIDTHS = [600];
const DEFAULT_CORNER_WIDTHS = [1000, 1050];

function toWidthOptions(widths: number[], fallback: number[]): number[] {
  const uniqueSorted = [...new Set(widths)]
    .filter((w) => Number.isFinite(w) && w > 0)
    .sort((a, b) => a - b);
  return uniqueSorted.length > 0 ? uniqueSorted : fallback;
}

/** Small inline SVG icons */
function FaucetIcon() {
  return (
    <svg viewBox="0 0 20 20" className="w-4 h-4 inline-block mr-1.5 -mt-0.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M10 4 L10 8" />
      <path d="M10 8 C10 8, 14 8, 14 12" />
      <rect x="6" y="12" width="8" height="4" rx="1" fill="currentColor" opacity="0.15" stroke="currentColor" />
    </svg>
  );
}

function FlameIcon() {
  return (
    <svg viewBox="0 0 20 20" className="w-4 h-4 inline-block mr-1.5 -mt-0.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M10 3 C10 3, 14 7, 14 11 C14 14, 10 16, 10 16 C10 16, 6 14, 6 11 C6 7, 10 3, 10 3" />
      <path d="M10 10 C10 10, 12 11, 12 12.5 C12 14, 10 15, 10 15 C10 15, 8 14, 8 12.5 C8 11, 10 10, 10 10" fill="currentColor" opacity="0.2" />
    </svg>
  );
}

export function WallInput() {
  const {
    layout,
    wallALength,
    wallBLength,
    cornerWidth,
    anchors,
    isBuiltInStove,
    setWallALength,
    setWallBLength,
    setCornerWidth,
    setSinkPosition,
    setSinkWidth,
    setStovePosition,
    setStoveWidth,
    setIsBuiltInStove,
  } = useKitchenStore();
  const modules = useCatalogStore((s) => s.modules);

  const lowerModules = useMemo(
    () => modules.filter((m) => m.tier === 'lower'),
    [modules],
  );
  const sinkWidths = useMemo(
    () =>
      toWidthOptions(
        lowerModules.filter((m) => m.subtype === 'sink').map((m) => m.width),
        DEFAULT_SINK_WIDTHS,
      ),
    [lowerModules],
  );
  const stoveWidths = useMemo(
    () =>
      toWidthOptions(
        lowerModules.filter((m) => m.subtype === 'oven').map((m) => m.width),
        DEFAULT_STOVE_WIDTHS,
      ),
    [lowerModules],
  );
  const cornerWidths = useMemo(
    () =>
      toWidthOptions(
        lowerModules
          .filter((m) => m.subtype === 'corner' || m.isCorner)
          .map((m) => m.width),
        DEFAULT_CORNER_WIDTHS,
      ),
    [lowerModules],
  );

  const sink = anchors.find((a) => a.type === 'sink');
  const stove = anchors.find((a) => a.type === 'stove');
  const selectedSinkWidth = sink && sinkWidths.includes(sink.width) ? sink.width : sinkWidths[0]!;
  const selectedStoveWidth = stove && stoveWidths.includes(stove.width) ? stove.width : stoveWidths[0]!;
  const selectedCornerWidth = cornerWidths.includes(cornerWidth) ? cornerWidth : cornerWidths[0]!;

  useEffect(() => {
    if (!sink) return;
    if (!sinkWidths.includes(sink.width)) {
      setSinkWidth(sinkWidths[0]!);
    }
  }, [sink, sinkWidths, setSinkWidth]);

  useEffect(() => {
    if (!stove) return;
    if (!stoveWidths.includes(stove.width)) {
      setStoveWidth(stoveWidths[0]!);
    }
  }, [stove, stoveWidths, setStoveWidth]);

  useEffect(() => {
    if (layout !== 'l-shaped') return;
    if (!cornerWidths.includes(cornerWidth)) {
      setCornerWidth(cornerWidths[0]!);
    }
  }, [layout, cornerWidth, cornerWidths, setCornerWidth]);

  return (
    <div className="space-y-5">
      {/* Wall A length */}
      <div>
        <label className="flex items-center justify-between text-sm font-medium text-primary-700 mb-1.5">
          <span>Стена A</span>
          <span className="text-xs font-bold bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">{wallALength} мм</span>
        </label>
        <input
          type="range"
          min={1500}
          max={5000}
          step={50}
          value={wallALength}
          onChange={(e) => setWallALength(Number(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-primary-300 mt-0.5">
          <span>1500</span>
          <span>5000</span>
        </div>
      </div>

      {/* Wall B length (L-shaped only) */}
      {layout === 'l-shaped' && (
        <div>
          <label className="flex items-center justify-between text-sm font-medium text-primary-700 mb-1.5">
            <span>Стена B</span>
            <span className="text-xs font-bold bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">{wallBLength} мм</span>
          </label>
          <input
            type="range"
            min={1000}
            max={4000}
            step={50}
            value={wallBLength}
            onChange={(e) => setWallBLength(Number(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-primary-300 mt-0.5">
            <span>1000</span>
            <span>4000</span>
          </div>
        </div>
      )}

      {/* Corner module (L-shaped only) */}
      {layout === 'l-shaped' && (
        <div>
          <label className="block text-sm font-medium text-primary-700 mb-2">
            Угловой модуль
          </label>
          <div className="flex flex-wrap gap-2">
            {cornerWidths.map((w) => (
              <button
                key={w}
                onClick={() => setCornerWidth(w)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  selectedCornerWidth === w
                    ? 'bg-accent-600 text-white'
                    : 'bg-white text-primary-600 border border-primary-200 hover:bg-primary-50'
                }`}
              >
                СУ {w}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Divider */}
      <div className="border-t border-primary-100" />

      {/* Sink */}
      <div className="bg-[#f0f4f8] rounded-lg p-4 space-y-3">
        <div className="text-sm font-semibold text-[#3a6b8a]">
          <FaucetIcon />
          Мойка
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-primary-500 mb-1">Позиция, мм</label>
            <input
              type="number"
              min={0}
              max={wallALength - selectedSinkWidth}
              step={50}
              value={sink?.position ?? 800}
              onChange={(e) => setSinkPosition(Number(e.target.value))}
              className="w-full px-2 py-1.5 border border-primary-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-accent-400"
            />
          </div>
          <div>
            <label className="block text-xs text-primary-500 mb-1">Ширина</label>
            <select
              value={selectedSinkWidth}
              onChange={(e) => setSinkWidth(Number(e.target.value))}
              className="w-full px-2 py-1.5 border border-primary-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-accent-400"
            >
              {sinkWidths.map((w) => (
                <option key={w} value={w}>{w} мм</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Stove */}
      <div className="bg-[#fef5ee] rounded-lg p-4 space-y-3">
        <div className="text-sm font-semibold text-[#a06030]">
          <FlameIcon />
          Плита / Духовка
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-primary-500 mb-1">Позиция, мм</label>
            <input
              type="number"
              min={0}
              max={wallALength - selectedStoveWidth}
              step={50}
              value={stove?.position ?? 1800}
              onChange={(e) => setStovePosition(Number(e.target.value))}
              className="w-full px-2 py-1.5 border border-primary-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-accent-400"
            />
          </div>
          <div>
            <label className="block text-xs text-primary-500 mb-1">Ширина</label>
            <select
              value={selectedStoveWidth}
              onChange={(e) => setStoveWidth(Number(e.target.value))}
              className="w-full px-2 py-1.5 border border-primary-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-accent-400"
            >
              {stoveWidths.map((w) => (
                <option key={w} value={w}>{w} мм</option>
              ))}
            </select>
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-primary-700">
          <input
            type="checkbox"
            checked={isBuiltInStove}
            onChange={(e) => setIsBuiltInStove(e.target.checked)}
            className="rounded accent-accent-600"
          />
          Встроенная духовка (СДШ)
        </label>
      </div>
    </div>
  );
}
