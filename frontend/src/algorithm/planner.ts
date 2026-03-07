import type { Module } from '../api/types';
import type {
  KitchenConfig,
  KitchenPlan,
  WallPlan,
  Wall,
  Segment,
  SolvedSegment,
  ScoredCombo,
} from './types';
import { segmentWall } from './segmenter';
import { findWithFillers } from './solver';
import { scoreCombo } from './scorer';
import type { GoldenRule } from './goldenTable';
import {
  lookupGolden,
  resolveGoldenModules,
  mergeRules,
  validateResult,
  DEFAULT_GOLDEN_RULES,
} from './goldenTable';

interface ModulePool {
  /** Standard + drawer + combo modules for filling segments */
  fillCandidates: Module[];
  /** Filler modules (СБ 150, СБ 200) */
  fillers: Module[];
  /** Sink modules */
  sinks: Module[];
  /** Oven modules */
  ovens: Module[];
  /** Corner modules */
  corners: Module[];
}

/**
 * Build a module pool from the flat module list, filtering to lower tier only.
 */
export function buildModulePool(modules: Module[]): ModulePool {
  const lower = modules.filter((m) => m.tier === 'lower');
  return {
    fillCandidates: lower.filter(
      (m) =>
        m.subtype === 'standard' ||
        m.subtype === 'drawer' ||
        m.subtype === 'combo',
    ),
    fillers: lower.filter((m) => m.subtype === 'filler'),
    sinks: lower.filter((m) => m.subtype === 'sink'),
    ovens: lower.filter((m) => m.subtype === 'oven'),
    corners: lower.filter((m) => m.subtype === 'corner'),
  };
}

/**
 * Hybrid solver for a fill segment:
 *   Layer 1   — exact golden table match
 *   Layer 1.5 — golden table + filler (subtract 150 or 200, re-lookup)
 *   Layer 2   — backtracking fallback
 *
 * Every result is validated.
 */
function solveSegment(
  segment: Segment,
  pool: ModulePool,
  allModules: Module[],
  mergedRules: GoldenRule[],
): SolvedSegment {
  // ─── Layer 1: Exact golden table match ───
  const goldenRule = lookupGolden(segment.context, segment.width, mergedRules);
  if (goldenRule) {
    const resolved = resolveGoldenModules(goldenRule, allModules);
    if (resolved) {
      return {
        ...segment,
        modules: resolved,
        score: scoreCombo(resolved, segment.context),
        method: 'golden_table',
        alternatives: [],
        validation: validateResult(resolved, segment.width, segment.context),
      };
    }
  }

  // ─── Layer 1.5: Golden table + filler ───
  for (const fillerWidth of [150, 200] as const) {
    const reducedWidth = segment.width - fillerWidth;
    if (reducedWidth < 300) continue;

    const rule = lookupGolden(segment.context, reducedWidth, mergedRules);
    if (!rule) continue;

    const resolved = resolveGoldenModules(rule, allModules);
    if (!resolved) continue;

    const fillerMod = allModules.find(
      (m) => m.code === 'СБ' && m.width === fillerWidth,
    );
    if (!fillerMod) continue;

    const mods = [...resolved, fillerMod];
    return {
      ...segment,
      modules: mods,
      score: scoreCombo(mods, segment.context),
      method: 'golden_table+filler',
      alternatives: [],
      validation: validateResult(mods, segment.width, segment.context),
    };
  }

  // ─── Layer 2: Backtracking fallback ───
  const candidates = pool.fillCandidates;
  if (candidates.length === 0) {
    return {
      ...segment,
      modules: [],
      score: 0,
      method: 'no_solution',
      alternatives: [],
      validation: validateResult([], segment.width, segment.context),
      error: 'Нет доступных нижних модулей для заполнения из backend-каталога',
    };
  }

  const { combos, fillers } = findWithFillers(
    segment.width,
    candidates,
    pool.fillers,
  );

  if (combos.length === 0) {
    return {
      ...segment,
      modules: [],
      score: 0,
      method: 'no_solution',
      alternatives: [],
      validation: validateResult([], segment.width, segment.context),
      error: `Не удалось заполнить ${segment.width} мм`,
    };
  }

  // Score all combos
  const scored: ScoredCombo[] = combos
    .map((combo) => {
      const modules = [...combo, ...fillers];
      return { modules, score: scoreCombo(modules, segment.context) };
    })
    .sort((a, b) => b.score - a.score);

  const best = scored[0]!;

  return {
    ...segment,
    modules: best.modules,
    score: best.score,
    method: fillers.length > 0 ? 'backtracking+filler' : 'backtracking',
    alternatives: scored.slice(1, 6),
    validation: validateResult(best.modules, segment.width, segment.context),
  };
}

/** Find module by exact width, then closest width, then any */
function findByWidth(candidates: Module[], targetWidth: number): Module | undefined {
  if (candidates.length === 0) return undefined;
  // Exact match
  const exact = candidates.find((m) => m.width === targetWidth);
  if (exact) return exact;
  // Closest match (within ±50mm tolerance)
  const sorted = [...candidates].sort(
    (a, b) => Math.abs(a.width - targetWidth) - Math.abs(b.width - targetWidth),
  );
  if (Math.abs(sorted[0]!.width - targetWidth) <= 50) return sorted[0];
  // Fallback to first available
  return candidates[0];
}

/**
 * Solve an anchor segment: place the exact sink/stove/oven module from catalog.
 * Uses real catalog modules (with glbPath) — no virtual modules.
 */
function solveAnchor(
  segment: Segment,
  pool: ModulePool,
): SolvedSegment {
  let mod: Module | undefined;

  if (segment.anchorType === 'sink') {
    mod = findByWidth(pool.sinks, segment.width);
  } else if (segment.anchorType === 'oven') {
    mod = findByWidth(pool.ovens, segment.width);
  } else if (segment.anchorType === 'stove') {
    // Freestanding stove: look for oven module (СДШ) from catalog first
    mod = findByWidth(pool.ovens, segment.width);
    // Fallback: virtual module only if nothing in catalog
    if (!mod) {
      mod = {
        id: `stove-${segment.width}`,
        code: 'Плита',
        name: `Плита ${segment.width}`,
        width: segment.width,
        tier: 'lower',
        subtype: 'oven',
        isCorner: false,
        annotations: [],
        glbPath: '',
        categoryDir: '',
        price: 0,
        description: null,
      };
    }
  }

  return {
    ...segment,
    modules: mod ? [mod] : [],
    score: 100,
    method: 'anchor',
    alternatives: [],
  };
}

/**
 * Plan a single wall: segment → solve each segment.
 */
function planWall(
  wall: Wall,
  pool: ModulePool,
  allModules: Module[],
  mergedRules: GoldenRule[],
): WallPlan {
  const segments = segmentWall(wall);

  const solved = segments.map((seg) => {
    if (seg.kind === 'anchor') {
      return solveAnchor(seg, pool);
    }
    return solveSegment(seg, pool, allModules, mergedRules);
  });

  const scores = solved.filter((s) => s.kind === 'fill').map((s) => s.score);
  const totalScore =
    scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 100;

  return {
    wallId: wall.id,
    wallLength: wall.length,
    segments: solved,
    totalScore,
  };
}

/**
 * Main entry point: plan the entire kitchen.
 * Merges user golden rules with defaults, then solves each wall.
 */
export function planKitchen(
  config: KitchenConfig,
  modules: Module[],
  goldenRules: GoldenRule[] = [],
): KitchenPlan {
  const pool = buildModulePool(modules);
  const mergedRules = mergeRules(goldenRules, DEFAULT_GOLDEN_RULES);
  const wallPlans: WallPlan[] = [];

  // Wall A
  wallPlans.push(planWall(config.wallA, pool, modules, mergedRules));

  // Wall B (L-shaped)
  if (config.layout === 'l-shaped' && config.wallB) {
    wallPlans.push(planWall(config.wallB, pool, modules, mergedRules));
  }

  const overallScore =
    wallPlans.length > 0
      ? Math.round(
          wallPlans.reduce((sum, wp) => sum + wp.totalScore, 0) /
            wallPlans.length,
        )
      : 0;

  return { config, wallPlans, overallScore };
}
