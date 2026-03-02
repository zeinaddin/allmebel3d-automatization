import { create } from 'zustand';
import type { LayoutType, Anchor, KitchenConfig } from '../algorithm/types';

interface KitchenState {
  layout: LayoutType;
  wallALength: number;
  wallBLength: number;
  cornerWidth: number; // backend-driven lower corner module width in mm
  anchors: Anchor[];
  isBuiltInStove: boolean;

  setLayout: (layout: LayoutType) => void;
  setWallALength: (length: number) => void;
  setWallBLength: (length: number) => void;
  setCornerWidth: (width: number) => void;
  setAnchors: (anchors: Anchor[]) => void;
  setSinkPosition: (position: number) => void;
  setSinkWidth: (width: number) => void;
  setStovePosition: (position: number) => void;
  setStoveWidth: (width: number) => void;
  setIsBuiltInStove: (isBuiltIn: boolean) => void;

  getConfig: () => KitchenConfig;
}

export const useKitchenStore = create<KitchenState>((set, get) => ({
  layout: 'linear',
  wallALength: 3000,
  wallBLength: 2000,
  cornerWidth: 1000,
  anchors: [
    { type: 'sink', position: 800, width: 600 },
    { type: 'stove', position: 1800, width: 600 },
  ],
  isBuiltInStove: false,

  setLayout: (layout) => set({ layout }),
  setWallALength: (wallALength) => set({ wallALength }),
  setWallBLength: (wallBLength) => set({ wallBLength }),
  setCornerWidth: (cornerWidth) => set({ cornerWidth }),
  setAnchors: (anchors) => set({ anchors }),

  setSinkPosition: (position) =>
    set((state) => ({
      anchors: state.anchors.map((a) =>
        a.type === 'sink' ? { ...a, position } : a,
      ),
    })),

  setSinkWidth: (width) =>
    set((state) => ({
      anchors: state.anchors.map((a) =>
        a.type === 'sink' ? { ...a, width } : a,
      ),
    })),

  setStovePosition: (position) =>
    set((state) => ({
      anchors: state.anchors.map((a) =>
        a.type === 'stove' ? { ...a, position } : a,
      ),
    })),

  setStoveWidth: (width) =>
    set((state) => ({
      anchors: state.anchors.map((a) =>
        a.type === 'stove' ? { ...a, width } : a,
      ),
    })),

  setIsBuiltInStove: (isBuiltIn) =>
    set((state) => ({
      isBuiltInStove: isBuiltIn,
      anchors: state.anchors.map((a) =>
        a.type === 'stove' ? { ...a, isBuiltIn } : a,
      ),
    })),

  getConfig: () => {
    const state = get();
    const config: KitchenConfig = {
      layout: state.layout,
      wallA: {
        id: 'wall-a',
        length: state.wallALength,
        anchors: state.anchors,
      },
    };

    if (state.layout === 'l-shaped') {
      config.wallB = {
        id: 'wall-b',
        length: state.wallBLength,
        anchors: [], // Wall B typically has no anchors
      };
      config.cornerWidth = state.cornerWidth;
    }

    return config;
  },
}));
