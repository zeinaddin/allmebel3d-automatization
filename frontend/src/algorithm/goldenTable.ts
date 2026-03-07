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

// ─── Shorthand helpers for building rules compactly ───

const S = (w: number): GoldenModuleRef => ({ code: 'С', width: w });
const D = (w: number): GoldenModuleRef => ({ code: 'СЯШ', width: w });
const K = (w: number): GoldenModuleRef => ({ code: 'СК2', width: w });

let _rid = 0;
function r(ctx: SegmentContext, w: number, mods: GoldenModuleRef[]): GoldenRule {
  return { id: `default-${++_rid}`, context: ctx, segmentWidth: w, modules: mods };
}

// ─── DEFAULT GOLDEN TABLE ───
// Designer rules for 3 contexts. Widths intentionally skipped will be
// resolved by Layer 1.5 (golden_table + filler: subtract 150 or 200, re-lookup).

export const DEFAULT_GOLDEN_RULES: GoldenRule[] = [
  // ══════════════════════════════════════════════════
  // STANDARD — uniform widths, 500-600mm sweet spot, minimize module count
  // ══════════════════════════════════════════════════
  r('standard', 300,  [S(300)]),
  r('standard', 350,  [S(350)]),
  r('standard', 400,  [S(400)]),
  r('standard', 450,  [S(450)]),
  r('standard', 500,  [S(500)]),
  r('standard', 600,  [S(600)]),
  r('standard', 700,  [S(700)]),
  r('standard', 800,  [S(800)]),
  r('standard', 900,  [S(450), S(450)]),
  r('standard', 950,  [S(500), S(450)]),
  r('standard', 1000, [S(500), S(500)]),
  // 1050 → skipped (1050-150=900 ✓ or 1050-200=850 → bt)
  r('standard', 1100, [S(500), S(600)]),
  // 1150 → skipped (1150-150=1000 ✓)
  r('standard', 1200, [S(600), S(600)]),
  // 1250 → skipped (1250-150=1100 ✓ or 1250-200=1050 → bt)
  r('standard', 1300, [S(600), S(700)]),
  // 1350 → skipped (1350-150=1200 ✓)
  r('standard', 1400, [S(700), S(700)]),
  // 1450 → skipped (1450-150=1300 ✓ or 1450-200=1250 → bt)
  r('standard', 1500, [S(500), S(500), S(500)]),
  // 1550 → skipped (1550-150=1400 ✓)
  r('standard', 1600, [S(800), S(800)]),
  // 1650 → skipped (1650-150=1500 ✓ or 1650-200=1450 → bt)
  r('standard', 1700, [S(800), S(500), S(400)]),
  // 1750 → skipped (1750-150=1600 ✓)
  r('standard', 1800, [S(600), S(600), S(600)]),
  // 1850 → skipped (1850-150=1700 ✓ or 1850-200=1650 → bt)
  r('standard', 1900, [S(600), S(600), S(700)]),
  // 1950 → skipped (1950-150=1800 ✓)
  r('standard', 2000, [S(500), S(500), S(500), S(500)]),
  r('standard', 2100, [S(700), S(700), S(700)]),
  r('standard', 2200, [S(800), S(700), S(700)]),
  r('standard', 2400, [S(600), S(600), S(600), S(600)]),
  r('standard', 2500, [S(500), S(500), S(500), S(500), S(500)]),

  // ══════════════════════════════════════════════════
  // SINK — drawers (СЯШ/СК2) first, then С standard. No drawers if < 400mm.
  // ══════════════════════════════════════════════════
  r('sink', 300,  [S(300)]),
  r('sink', 350,  [S(350)]),
  r('sink', 400,  [D(400)]),
  r('sink', 450,  [S(450)]),
  r('sink', 500,  [D(500)]),
  r('sink', 600,  [D(600)]),
  r('sink', 700,  [S(700)]),
  r('sink', 800,  [K(800)]),
  r('sink', 900,  [D(500), S(400)]),
  r('sink', 950,  [D(500), S(450)]),
  r('sink', 1000, [D(500), S(500)]),
  r('sink', 1100, [D(600), S(500)]),
  r('sink', 1200, [D(600), S(600)]),
  r('sink', 1300, [D(600), S(700)]),
  r('sink', 1400, [D(600), S(800)]),
  r('sink', 1500, [D(500), S(500), S(500)]),
  r('sink', 1600, [D(600), S(500), S(500)]),
  r('sink', 1700, [D(600), S(600), S(500)]),
  r('sink', 1800, [D(600), S(600), S(600)]),
  r('sink', 1900, [D(600), S(600), S(700)]),
  r('sink', 2000, [D(600), S(500), S(500), S(400)]),
  r('sink', 2100, [D(600), S(500), S(500), S(500)]),
  r('sink', 2200, [D(600), S(600), S(500), S(500)]),
  r('sink', 2400, [D(600), S(600), S(600), S(600)]),
  r('sink', 2500, [D(600), S(600), S(600), S(700)]),

  // ══════════════════════════════════════════════════
  // STOVE — ONLY С standard modules (no drawers near heat), prefer large
  // ══════════════════════════════════════════════════
  r('stove', 300,  [S(300)]),
  r('stove', 350,  [S(350)]),
  r('stove', 400,  [S(400)]),
  r('stove', 450,  [S(450)]),
  r('stove', 500,  [S(500)]),
  r('stove', 600,  [S(600)]),
  r('stove', 700,  [S(700)]),
  r('stove', 800,  [S(800)]),
  r('stove', 900,  [S(500), S(400)]),
  r('stove', 950,  [S(500), S(450)]),
  r('stove', 1000, [S(500), S(500)]),
  r('stove', 1100, [S(600), S(500)]),
  r('stove', 1200, [S(600), S(600)]),
  r('stove', 1300, [S(700), S(600)]),
  r('stove', 1400, [S(700), S(700)]),
  r('stove', 1500, [S(800), S(700)]),
  r('stove', 1600, [S(800), S(800)]),
  r('stove', 1700, [S(800), S(500), S(400)]),
  r('stove', 1800, [S(600), S(600), S(600)]),
  r('stove', 1900, [S(700), S(600), S(600)]),
  r('stove', 2000, [S(800), S(600), S(600)]),
  r('stove', 2100, [S(700), S(700), S(700)]),
  r('stove', 2200, [S(800), S(700), S(700)]),
  r('stove', 2400, [S(800), S(800), S(800)]),
  r('stove', 2500, [S(800), S(800), S(500), S(400)]),
];

// ─── Persistence ───

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

// ─── Lookup & Resolve ───

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

// ─── Merge & Validate ───

/**
 * Merge user rules (from localStorage) with defaults.
 * User rules override defaults for the same (context, width).
 */
export function mergeRules(userRules: GoldenRule[], defaultRules: GoldenRule[]): GoldenRule[] {
  const map = new Map<string, GoldenRule>();
  for (const rule of defaultRules) map.set(`${rule.context}:${rule.segmentWidth}`, rule);
  for (const rule of userRules) map.set(`${rule.context}:${rule.segmentWidth}`, rule);
  return [...map.values()];
}

/**
 * Validate a solved segment's modules.
 * Checks: width sum, drawer presence near sink, no module exceeds segment.
 */
export function validateResult(
  modules: Module[],
  segmentWidth: number,
  context: SegmentContext,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // 1. Width sum must equal segment width
  const total = modules.reduce((s, m) => s + m.width, 0);
  if (total !== segmentWidth) {
    errors.push(`Сумма ширин ${total} != ${segmentWidth}`);
  }

  // 2. Sink context: must include drawers/combo if segment >= 400mm
  if (context === 'sink' && segmentWidth >= 400) {
    const hasDrawers = modules.some(
      (m) => m.subtype === 'drawer' || m.subtype === 'combo',
    );
    if (!hasDrawers) {
      errors.push('Рядом с мойкой нет ящиков (СЯШ/СК2)');
    }
  }

  // 3. No single module wider than the segment
  for (const m of modules) {
    if (m.width > segmentWidth) {
      errors.push(`Модуль ${m.code} ${m.width}мм шире сегмента ${segmentWidth}мм`);
    }
  }

  return { valid: errors.length === 0, errors };
}
