import { useRef, useEffect } from 'react';
import { createScene } from './sceneBuilder';
import type { PlacedMod, SceneConfig, SceneHandle } from './sceneBuilder';
import type { KitchenPlan } from '../../algorithm/types';
import type { Module } from '../../api/types';
import { getAssetUrl } from '../../api/client';
import { useCatalogStore } from '../../store/useCatalogStore';
import { useKitchenStore } from '../../store/useKitchenStore';

/** Convert a module's glbPath to a backend asset URL (if non-empty). */
function toGlbUrl(glbPath: string | undefined): string | undefined {
  return glbPath ? getAssetUrl(glbPath) : undefined;
}

/**
 * Generate upper cabinet row by mirroring lower layout.
 * Skips area above stove (reserved for range hood).
 */
function generateUpperMods(
  lowerMods: PlacedMod[],
  allModules: Module[],
): PlacedMod[] {
  const uppers = allModules.filter((m) => m.tier === 'upper' && !m.isCorner);
  if (uppers.length === 0) return [];

  return lowerMods
    .filter((m) => m.subtype !== 'oven' && !m.id.startsWith('stove'))
    .map((m) => {
      const match =
        uppers.find((u) => u.width === m.width) ??
        uppers.find((u) => u.width >= m.width) ??
        uppers[uppers.length - 1]!;
      return {
        id: match.id,
        width: m.width,
        x: m.x,
        subtype: 'upper',
        code: match.code,
        name: match.name,
        glbUrl: toGlbUrl(match.glbPath),
      };
    });
}

/**
 * Flatten solved wall plan segments into placed modules with x positions.
 * Converts each module's glbPath into a full backend URL via getAssetUrl.
 */
function flattenPlan(plan: KitchenPlan, wallId: string): PlacedMod[] {
  const wp = plan.wallPlans.find((w) => w.wallId === wallId);
  if (!wp) return [];

  const placed: PlacedMod[] = [];
  let x = 0;
  for (const seg of wp.segments) {
    for (const mod of seg.modules) {
      placed.push({
        id: mod.id,
        width: mod.width,
        x,
        subtype: mod.subtype,
        code: mod.code,
        name: mod.name,
        glbUrl: toGlbUrl(mod.glbPath),
      });
      x += mod.width;
    }
  }
  return placed;
}

interface KitchenViewerProps {
  plan: KitchenPlan;
  canvasRef?: React.MutableRefObject<HTMLCanvasElement | null>;
  onSceneReady?: (handle: { forceRender: () => void }) => void;
}

export function KitchenViewer({ plan, canvasRef: externalRef, onSceneReady }: KitchenViewerProps) {
  const internalRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = externalRef ?? internalRef;
  const sceneHandleRef = useRef<SceneHandle | null>(null);
  const allModules = useCatalogStore((s) => s.modules);
  const store = useKitchenStore();

  const isL = store.layout === 'l-shaped';

  // Find corner module from catalog for L-shaped layouts
  const cornerModule = isL
    ? allModules.find(
        (m) => m.isCorner && m.tier === 'lower' && m.width === store.cornerWidth,
      )
    : undefined;
  const cornerGlbUrl = cornerModule ? toGlbUrl(cornerModule.glbPath) : undefined;
  const cornerCode = cornerModule?.code;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Cleanup previous scene
    if (sceneHandleRef.current) {
      sceneHandleRef.current.cleanup();
      sceneHandleRef.current = null;
    }

    const lowerMods = flattenPlan(plan, 'wall-a');
    const upperMods = generateUpperMods(lowerMods, allModules);
    const lowerModsB = isL ? flattenPlan(plan, 'wall-b') : [];
    const upperModsB = isL ? generateUpperMods(lowerModsB, allModules) : [];

    const config: SceneConfig = {
      wallMm: store.wallALength,
      lowerMods,
      upperMods,
      isL,
      wallBMm: store.wallBLength,
      cornerW: store.cornerWidth,
      lowerModsB,
      upperModsB,
      cornerCode,
      cornerGlbUrl,
    };

    const handle = createScene(canvas, config);
    sceneHandleRef.current = handle;
    onSceneReady?.({ forceRender: handle.forceRender });

    return () => {
      if (sceneHandleRef.current) {
        sceneHandleRef.current.cleanup();
        sceneHandleRef.current = null;
      }
    };
  }, [plan, allModules, isL, store.wallALength, store.wallBLength, store.cornerWidth, cornerCode, cornerGlbUrl]);

  return (
    <div className="relative w-full h-full min-h-[400px] bg-white rounded-xl overflow-hidden shadow-sm border border-primary-100">
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        style={{ cursor: 'grab' }}
      />
      <div className="absolute bottom-3 left-3 text-xs text-primary-500 bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-sm">
        Drag: вращение · Scroll: зум
      </div>
    </div>
  );
}
