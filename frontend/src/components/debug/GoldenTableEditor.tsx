import { useState } from 'react';
import { useGoldenStore } from '../../store/useGoldenStore';
import { useCatalogStore } from '../../store/useCatalogStore';
import type { SegmentContext } from '../../algorithm/types';
import type { GoldenModuleRef } from '../../algorithm/goldenTable';

const CONTEXT_LABELS: Record<SegmentContext, string> = {
  sink: 'Мойка',
  stove: 'Плита',
  standard: 'Стандарт',
};

export function GoldenTableEditor() {
  const { rules, addRule, removeRule, clearAll } = useGoldenStore();
  const allModules = useCatalogStore((s) => s.modules);
  const [isAdding, setIsAdding] = useState(false);

  // Form state
  const [context, setContext] = useState<SegmentContext>('standard');
  const [segmentWidth, setSegmentWidth] = useState('');
  const [entries, setEntries] = useState<GoldenModuleRef[]>([]);
  const [entryCode, setEntryCode] = useState('');
  const [entryWidth, setEntryWidth] = useState('');

  // Get unique module codes from catalog for autocomplete
  const lowerModules = allModules.filter((m) => m.tier === 'lower' && !m.isCorner);
  const uniqueCodes = [...new Set(lowerModules.map((m) => m.code))].sort();

  const entriesTotal = entries.reduce((s, e) => s + e.width, 0);
  const targetWidth = Number(segmentWidth) || 0;
  const isValid = entries.length > 0 && targetWidth > 0 && entriesTotal === targetWidth;

  function addEntry() {
    const code = entryCode.trim();
    const width = Number(entryWidth);
    if (!code || !width) return;

    // Verify module exists in catalog
    const exists = lowerModules.some((m) => m.code === code && m.width === width);
    if (!exists) return;

    setEntries([...entries, { code, width }]);
    setEntryCode('');
    setEntryWidth('');
  }

  function removeEntry(idx: number) {
    setEntries(entries.filter((_, i) => i !== idx));
  }

  function handleSave() {
    if (!isValid) return;
    addRule(context, targetWidth, entries);
    resetForm();
  }

  function resetForm() {
    setIsAdding(false);
    setContext('standard');
    setSegmentWidth('');
    setEntries([]);
    setEntryCode('');
    setEntryWidth('');
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="flex items-center justify-between p-3 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-700">
          Золотая таблица
          {rules.length > 0 && (
            <span className="ml-1.5 text-xs font-normal text-gray-400">
              ({rules.length})
            </span>
          )}
        </h3>
        <div className="flex gap-1.5">
          {rules.length > 0 && (
            <button
              onClick={clearAll}
              className="text-xs px-2 py-1 text-red-500 hover:bg-red-50 rounded transition-colors"
            >
              Очистить
            </button>
          )}
          {!isAdding && (
            <button
              onClick={() => setIsAdding(true)}
              className="text-xs px-2 py-1 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors"
            >
              + Правило
            </button>
          )}
        </div>
      </div>

      {/* Existing rules */}
      {rules.length > 0 && (
        <div className="divide-y divide-gray-50">
          {rules.map((rule) => (
            <div key={rule.id} className="px-3 py-2 flex items-center gap-2 group hover:bg-gray-50">
              <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-medium">
                {CONTEXT_LABELS[rule.context]}
              </span>
              <span className="text-xs font-mono text-gray-500">
                {rule.segmentWidth}мм
              </span>
              <span className="text-xs text-gray-400">&rarr;</span>
              <span className="text-xs font-mono text-gray-700 flex-1">
                {rule.modules.map((m) => `${m.code} ${m.width}`).join(' + ')}
              </span>
              <button
                onClick={() => removeRule(rule.id)}
                className="text-xs text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}

      {rules.length === 0 && !isAdding && (
        <div className="px-3 py-4 text-center text-xs text-gray-400">
          Нет правил. Добавьте правило для приоритетного размещения модулей.
        </div>
      )}

      {/* Add rule form */}
      {isAdding && (
        <div className="p-3 border-t border-gray-100 space-y-3 bg-gray-50/50">
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-gray-500 block mb-1">Контекст</label>
              <select
                value={context}
                onChange={(e) => setContext(e.target.value as SegmentContext)}
                className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 bg-white"
              >
                <option value="sink">Мойка</option>
                <option value="stove">Плита</option>
                <option value="standard">Стандарт</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-500 block mb-1">Ширина сегмента (мм)</label>
              <input
                type="number"
                value={segmentWidth}
                onChange={(e) => setSegmentWidth(e.target.value)}
                placeholder="600"
                className="w-full text-xs border border-gray-200 rounded px-2 py-1.5"
              />
            </div>
          </div>

          {/* Module entries */}
          <div>
            <label className="text-xs text-gray-500 block mb-1">Модули</label>
            {entries.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {entries.map((e, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-primary-50 text-primary-700 border border-primary-200"
                  >
                    {e.code} {e.width}
                    <button
                      onClick={() => removeEntry(i)}
                      className="text-primary-400 hover:text-primary-600"
                    >
                      &times;
                    </button>
                  </span>
                ))}
                <span className="text-xs text-gray-400 self-center">
                  = {entriesTotal}мм
                  {targetWidth > 0 && entriesTotal !== targetWidth && (
                    <span className="text-red-400 ml-1">
                      (нужно {targetWidth}мм)
                    </span>
                  )}
                </span>
              </div>
            )}

            <div className="flex gap-1.5">
              <select
                value={entryCode}
                onChange={(e) => {
                  setEntryCode(e.target.value);
                  // Auto-set width to first available width for this code
                  const code = e.target.value;
                  const available = lowerModules.filter((m) => m.code === code);
                  if (available.length === 1) {
                    setEntryWidth(String(available[0]!.width));
                  }
                }}
                className="text-xs border border-gray-200 rounded px-2 py-1.5 bg-white flex-1"
              >
                <option value="">Код...</option>
                {uniqueCodes.map((code) => (
                  <option key={code} value={code}>{code}</option>
                ))}
              </select>
              <select
                value={entryWidth}
                onChange={(e) => setEntryWidth(e.target.value)}
                className="text-xs border border-gray-200 rounded px-2 py-1.5 bg-white w-24"
                disabled={!entryCode}
              >
                <option value="">Ширина...</option>
                {lowerModules
                  .filter((m) => m.code === entryCode)
                  .map((m) => (
                    <option key={m.id} value={m.width}>{m.width}мм</option>
                  ))}
              </select>
              <button
                onClick={addEntry}
                disabled={!entryCode || !entryWidth}
                className="text-xs px-2 py-1.5 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                +
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <button
              onClick={resetForm}
              className="text-xs px-3 py-1.5 text-gray-500 hover:bg-gray-100 rounded transition-colors"
            >
              Отмена
            </button>
            <button
              onClick={handleSave}
              disabled={!isValid}
              className="text-xs px-3 py-1.5 bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Сохранить
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
