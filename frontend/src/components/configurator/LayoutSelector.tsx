import { useKitchenStore } from '../../store/useKitchenStore';
import type { LayoutType } from '../../algorithm/types';

function LinearIcon({ active }: { active: boolean }) {
  const col = active ? '#b87a2a' : '#a69b8b';
  return (
    <svg viewBox="0 0 56 40" className="w-14 h-10">
      {/* Wall line */}
      <line x1="4" y1="8" x2="52" y2="8" stroke={col} strokeWidth="2" opacity="0.4" />
      {/* Cabinets */}
      <rect x="6" y="10" width="44" height="18" rx="2" fill={col} opacity={active ? 0.9 : 0.5} />
      {/* Counter line */}
      <line x1="5" y1="28" x2="51" y2="28" stroke={col} strokeWidth="1.5" opacity="0.7" />
      {/* Floor */}
      <line x1="2" y1="36" x2="54" y2="36" stroke={col} strokeWidth="1" opacity="0.2" />
    </svg>
  );
}

function LShapedIcon({ active }: { active: boolean }) {
  const col = active ? '#b87a2a' : '#a69b8b';
  return (
    <svg viewBox="0 0 56 40" className="w-14 h-10">
      {/* Wall lines */}
      <path d="M4 8 L52 8" stroke={col} strokeWidth="2" opacity="0.4" />
      <path d="M52 8 L52 36" stroke={col} strokeWidth="2" opacity="0.4" />
      {/* Top cabinets */}
      <rect x="6" y="10" width="32" height="14" rx="2" fill={col} opacity={active ? 0.9 : 0.5} />
      {/* Side cabinets */}
      <rect x="40" y="10" width="10" height="24" rx="2" fill={col} opacity={active ? 0.9 : 0.5} />
      {/* Corner */}
      <rect x="38" y="10" width="4" height="4" rx="1" fill={col} opacity={active ? 0.7 : 0.35} />
      {/* Floor */}
      <line x1="2" y1="36" x2="40" y2="36" stroke={col} strokeWidth="1" opacity="0.2" />
    </svg>
  );
}

const LAYOUTS: { value: LayoutType; label: string; desc: string }[] = [
  { value: 'linear', label: 'Линейная', desc: 'Одна стена' },
  { value: 'l-shaped', label: 'Г-образная', desc: 'Две стены + угол' },
];

export function LayoutSelector() {
  const { layout, setLayout } = useKitchenStore();

  return (
    <div>
      <label className="block text-sm font-semibold text-primary-700 mb-2">
        Планировка
      </label>
      <div className="flex gap-3">
        {LAYOUTS.map((l) => (
          <button
            key={l.value}
            onClick={() => setLayout(l.value)}
            className={`flex-1 p-3 rounded-lg border-2 transition-all text-center ${
              layout === l.value
                ? 'border-accent-500 bg-accent-50'
                : 'border-primary-200 bg-white hover:border-primary-300'
            }`}
          >
            <div className="flex justify-center mb-1.5">
              {l.value === 'linear' ? (
                <LinearIcon active={layout === l.value} />
              ) : (
                <LShapedIcon active={layout === l.value} />
              )}
            </div>
            <div className="font-medium text-sm text-primary-800">{l.label}</div>
            <div className="text-xs text-primary-400">{l.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
