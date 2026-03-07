export type Tier =
  | 'lower'
  | 'upper'
  | 'upper_tall'
  | 'antresol_35'
  | 'antresol_45'
  | 'antresol_35_deep'
  | 'antresol_45_deep'
  | 'pantry';

export type Subtype =
  | 'standard'
  | 'drawer'
  | 'combo'
  | 'corner'
  | 'filler'
  | 'sink'
  | 'oven'
  | 'with_oven'
  | 'with_oven_microwave';

export interface Module {
  id: string;
  code: string;
  name: string;
  width: number;
  tier: Tier;
  subtype: Subtype;
  isCorner: boolean;
  annotations: string[];
  glbPath: string;
  categoryDir: string;
  price: number;
  description: string | null;
}

export interface Catalog {
  id: string;
  name: string;
  modules: Module[];
  moduleCount: number;
  tiers: Tier[];
}

export interface CatalogSummary {
  id: string;
  name: string;
  moduleCount: number;
  tiers: Tier[];
}
