interface Tab<T extends string> {
  value: T;
  label: string;
  count?: number;
}

interface TabsProps<T extends string> {
  tabs: Tab<T>[];
  active: T | null;
  onSelect: (value: T | null) => void;
  allLabel?: string;
}

export function Tabs<T extends string>({ tabs, active, onSelect, allLabel = 'Все' }: TabsProps<T>) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <button
        onClick={() => onSelect(null)}
        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
          active === null
            ? 'bg-accent-600 text-white'
            : 'bg-white text-primary-600 hover:bg-primary-100 border border-primary-200'
        }`}
      >
        {allLabel}
      </button>
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onSelect(tab.value)}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            active === tab.value
              ? 'bg-accent-600 text-white'
              : 'bg-white text-primary-600 hover:bg-primary-100 border border-primary-200'
          }`}
        >
          {tab.label}
          {tab.count != null && (
            <span className="ml-1.5 text-xs opacity-75">({tab.count})</span>
          )}
        </button>
      ))}
    </div>
  );
}
