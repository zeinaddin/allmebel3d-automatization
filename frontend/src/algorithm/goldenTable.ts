import type { Module } from '../api/types';
import type { SegmentContext } from './types';

/** A module reference in a golden rule (code + width). */
export interface GoldenModuleRef {
  code: string;
  width: number;
}

/** A golden table rule: for a given context + segment width, use these modules. */
export interface GoldenRule {
  id: string;
  context: SegmentContext;
  segmentWidth: number;
  modules: GoldenModuleRef[];
}

const STORAGE_KEY = 'algorithm-mebel-golden-table';

/** Load golden table from localStorage. */
export function loadGoldenTable(): GoldenRule[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as GoldenRule[];
  } catch {
    return [];
  }
}

/** Save golden table to localStorage. */
export function saveGoldenTable(rules: GoldenRule[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
}

/** Look up a golden rule for the given context + segment width. */
export function lookupGolden(
  context: SegmentContext,
  width: number,
  rules: GoldenRule[],
): GoldenRule | undefined {
  return rules.find(
    (r) => r.context === context && r.segmentWidth === width,
  );
}

/**
 * Resolve a golden rule's module refs to actual Module objects from the catalog.
 * Returns null if any module can't be found or total width doesn't match.
 */
export function resolveGoldenModules(
  rule: GoldenRule,
  catalog: Module[],
): Module[] | null {
  const resolved: Module[] = [];
  for (const ref of rule.modules) {
    const mod = catalog.find(
      (m) => m.code === ref.code && m.width === ref.width,
    );
    if (!mod) return null;
    resolved.push(mod);
  }
  const total = resolved.reduce((s, m) => s + m.width, 0);
  if (total !== rule.segmentWidth) return null;
  return resolved;
}

/** Generate a unique ID for a new rule. */
export function generateRuleId(): string {
  return `gr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
