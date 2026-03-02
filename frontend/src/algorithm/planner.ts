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
import { lookupGolden, resolveGoldenModules } from './goldenTable';

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
 * Solve a single fill segment: find the best module combination.
 * Checks golden table first, then falls back to backtracking.
 */
function solveSegment(
  segment: Segment,
  pool: ModulePool,
  allModules: Module[],
  goldenRules: GoldenRule[],
): SolvedSegment {
  // 1. Check golden table first
  const goldenRule = lookupGolden(segment.context, segment.width, goldenRules);
  if (goldenRule) {
    const resolved = resolveGoldenModules(goldenRule, allModules);
    if (resolved) {
      return {
        ...segment,
        modules: resolved,
        score: scoreCombo(resolved, segment.context),
        method: 'golden_table',
        alternatives: [],
      };
    }
  }

  // 2. Fall back to backtracking
  const candidates = pool.fillCandidates;
  if (candidates.length === 0) {
    return {
      ...segment,
      modules: [],
      score: 0,
      method: 'no_solution',
      alternatives: [],
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
  goldenRules: GoldenRule[],
): WallPlan {
  const segments = segmentWall(wall);

  const solved = segments.map((seg) => {
    if (seg.kind === 'anchor') {
      return solveAnchor(seg, pool);
    }
    return solveSegment(seg, pool, allModules, goldenRules);
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
 * Golden rules are checked before backtracking for each fill segment.
 */
export function planKitchen(
  config: KitchenConfig,
  modules: Module[],
  goldenRules: GoldenRule[] = [],
): KitchenPlan {
  const pool = buildModulePool(modules);
  const wallPlans: WallPlan[] = [];

  // Wall A
  wallPlans.push(planWall(config.wallA, pool, modules, goldenRules));

  // Wall B (L-shaped)
  if (config.layout === 'l-shaped' && config.wallB) {
    wallPlans.push(planWall(config.wallB, pool, modules, goldenRules));
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
