import type { Module } from '../api/types';
import type { SegmentContext } from './types';

/**
 * Multi-criteria scoring for a module combination.
 *
 * Rules (from prototype):
 * - Base score: 100
 * - −5 per module (fewer joints = cleaner look)
 * - +avgWidth/50 (larger modules = more premium)
 * - +18 if all modules same width (visual harmony)
 * - −25 per filler module
 * - Sink context: +15 if has drawers/combo, −15 if missing
 * - +4 per module in 500–600mm range (sweet spot)
 * - −8 per narrow module (<400mm, non-filler)
 */
export function scoreCombo(modules: Module[], context: SegmentContext): number {
  if (modules.length === 0) return 0;

  let score = 100;

  // Fewer modules = cleaner
  score -= modules.length * 5;

  // Larger average = more premium
  const totalWidth = modules.reduce((sum, m) => sum + m.width, 0);
  const avgWidth = totalWidth / modules.length;
  score += avgWidth / 50;

  // Uniform widths = harmony
  const widths = modules.map((m) => m.width);
  if (widths.length >= 2 && widths.every((w) => w === widths[0])) {
    score += 18;
  }

  // Penalize fillers heavily
  score -= modules.filter((m) => m.subtype === 'filler').length * 25;

  // Drawers near sink = functional
  if (context === 'sink') {
    const hasDrawers = modules.some(
      (m) => m.subtype === 'drawer' || m.subtype === 'combo',
    );
    score += hasDrawers ? 15 : -15;
  }

  // Prefer 500–600mm range (sweet spot for kitchen ergonomics)
  score += modules.filter((m) => m.width >= 500 && m.width <= 600).length * 4;

  // Penalize very narrow non-filler modules
  score -= modules.filter((m) => m.width < 400 && m.subtype !== 'filler').length * 8;

  return Math.round(Math.max(0, Math.min(100, score)));
}
