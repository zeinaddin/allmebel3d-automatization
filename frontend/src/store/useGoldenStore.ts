import { create } from 'zustand';
import type { SegmentContext } from '../algorithm/types';
import type { GoldenRule, GoldenModuleRef } from '../algorithm/goldenTable';
import { loadGoldenTable, saveGoldenTable, generateRuleId } from '../algorithm/goldenTable';

interface GoldenState {
  rules: GoldenRule[];
  addRule: (context: SegmentContext, segmentWidth: number, modules: GoldenModuleRef[]) => void;
  removeRule: (ruleId: string) => void;
  clearAll: () => void;
}

export const useGoldenStore = create<GoldenState>((set, get) => ({
  rules: loadGoldenTable(),

  addRule: (context, segmentWidth, modules) => {
    // Overwrite any existing rule with same context + width
    const existing = get().rules.filter(
      (r) => !(r.context === context && r.segmentWidth === segmentWidth),
    );
    const newRule: GoldenRule = {
      id: generateRuleId(),
      context,
      segmentWidth,
      modules,
    };
    const updated = [...existing, newRule];
    saveGoldenTable(updated);
    set({ rules: updated });
  },

  removeRule: (ruleId) => {
    const updated = get().rules.filter((r) => r.id !== ruleId);
    saveGoldenTable(updated);
    set({ rules: updated });
  },

  clearAll: () => {
    saveGoldenTable([]);
    set({ rules: [] });
  },
}));
