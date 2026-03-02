import type { Module } from '../api/types';

interface SolveResult {
  combos: Module[][];
  fillers: Module[];
}

/**
 * Backtracking solver: finds all module combinations that exactly fill `targetWidth`.
 * Modules sorted largest-first for pruning efficiency.
 */
export function findCombos(
  targetWidth: number,
  candidates: Module[],
  maxResults = 120,
): Module[][] {
  const results: Module[][] = [];
  const sorted = [...candidates].sort((a, b) => b.width - a.width);

  function bt(remaining: number, combo: Module[], startIdx: number) {
    if (remaining === 0) {
      results.push([...combo]);
      return;
    }
    if (remaining < 0 || results.length >= maxResults) return;

    for (let i = startIdx; i < sorted.length; i++) {
      const mod = sorted[i]!;
      if (mod.width <= remaining) {
        combo.push(mod);
        bt(remaining - mod.width, combo, i); // allow reuse of same module
        combo.pop();
      }
    }
  }

  bt(targetWidth, [], 0);
  return results;
}

/**
 * Tries to fill targetWidth with candidates.
 * If exact fit fails, tries adding 1 or 2 filler modules (СБ 150/200).
 */
export function findWithFillers(
  targetWidth: number,
  candidates: Module[],
  fillerModules: Module[],
): SolveResult {
  // 1. Try exact fit
  const exact = findCombos(targetWidth, candidates);
  if (exact.length > 0) {
    return { combos: exact, fillers: [] };
  }

  // 2. Try with one filler
  const fillersSorted = [...fillerModules].sort((a, b) => a.width - b.width);
  for (const filler of fillersSorted) {
    if (filler.width < targetWidth) {
      const combos = findCombos(targetWidth - filler.width, candidates);
      if (combos.length > 0) {
        return { combos, fillers: [filler] };
      }
    }
  }

  // 3. Try with two fillers
  for (const f1 of fillersSorted) {
    for (const f2 of fillersSorted) {
      if (f1.width + f2.width < targetWidth) {
        const combos = findCombos(targetWidth - f1.width - f2.width, candidates);
        if (combos.length > 0) {
          return { combos, fillers: [f1, f2] };
        }
      }
    }
  }

  return { combos: [], fillers: [] };
}
