import { useMemo } from 'react';
import { useCatalogStore } from '../store/useCatalogStore';
import { useKitchenStore } from '../store/useKitchenStore';
import { useGoldenStore } from '../store/useGoldenStore';
import { planKitchen } from '../algorithm/planner';
import type { KitchenPlan } from '../algorithm/types';

/**
 * Reactively computes a kitchen plan whenever config, modules, or golden rules change.
 */
export function useKitchenPlan(): KitchenPlan | null {
  const modules = useCatalogStore((s) => s.modules);
  const goldenRules = useGoldenStore((s) => s.rules);
  const getConfig = useKitchenStore((s) => s.getConfig);
  const layout = useKitchenStore((s) => s.layout);
  const wallALength = useKitchenStore((s) => s.wallALength);
  const wallBLength = useKitchenStore((s) => s.wallBLength);
  const cornerWidth = useKitchenStore((s) => s.cornerWidth);
  const anchors = useKitchenStore((s) => s.anchors);
  const isBuiltInStove = useKitchenStore((s) => s.isBuiltInStove);

  return useMemo(() => {
    if (modules.length === 0) return null;

    const config = getConfig();
    return planKitchen(config, modules, goldenRules);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modules, goldenRules, layout, wallALength, wallBLength, cornerWidth, anchors, isBuiltInStove, getConfig]);
}
