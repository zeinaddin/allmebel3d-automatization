import type { Module } from '../api/types';

/** A placed module with position info */
export interface PlacedModule {
  module: Module;
  x: number; // offset from wall start in mm
}

/** Context determines which modules are preferred near an anchor */
export type SegmentContext = 'sink' | 'stove' | 'standard';

/** A segment of the wall — either an anchor (sink/stove) or a fillable gap */
export interface Segment {
  kind: 'anchor' | 'fill';
  start: number;   // mm from wall start
  width: number;    // mm
  context: SegmentContext;
  anchorType?: 'sink' | 'stove' | 'oven';
}

/** A solved segment with modules placed into it */
export interface SolvedSegment extends Segment {
  modules: Module[];
  score: number;
  method: 'anchor' | 'backtracking' | 'backtracking+filler' | 'golden_table' | 'golden_table+filler' | 'no_solution';
  alternatives: ScoredCombo[];
  validation?: { valid: boolean; errors: string[] };
  error?: string;
}

/** A module combination with its score */
export interface ScoredCombo {
  modules: Module[];
  score: number;
}

/** Anchor definition for sink/stove placement on a wall */
export interface Anchor {
  type: 'sink' | 'stove';
  position: number;   // mm from wall start
  width: number;       // mm
  isBuiltIn?: boolean; // for stove: built-in oven vs freestanding
}

/** Wall definition */
export interface Wall {
  id: string;
  length: number; // mm
  anchors: Anchor[];
}

/** Layout type */
export type LayoutType = 'linear' | 'l-shaped';

/** Kitchen configuration input */
export interface KitchenConfig {
  layout: LayoutType;
  wallA: Wall;
  wallB?: Wall;         // only for L-shaped
  cornerWidth?: number; // lower corner module width in mm (backend-driven)
}

/** Full solved plan for a wall */
export interface WallPlan {
  wallId: string;
  wallLength: number;
  segments: SolvedSegment[];
  totalScore: number;
}

/** Complete kitchen plan */
export interface KitchenPlan {
  config: KitchenConfig;
  wallPlans: WallPlan[];
  overallScore: number;
}
