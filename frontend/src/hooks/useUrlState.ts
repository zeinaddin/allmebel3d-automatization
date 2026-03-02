import { useEffect, useRef } from 'react';
import { useKitchenStore } from '../store/useKitchenStore';
import type { LayoutType } from '../algorithm/types';

/**
 * Syncs kitchen configuration to/from URL search params.
 *
 * URL format:
 *   ?layout=linear&wallA=3000&sinkPos=800&sinkW=600&stovePos=1800&stoveW=600&builtIn=0
 *   ?layout=l-shaped&wallA=3000&wallB=2000&corner=1000&sinkPos=800&sinkW=600&stovePos=1800&stoveW=600
 *   (corner accepts any positive width; UI sanitizes to backend-supported options)
 *
 * On mount: reads URL → hydrates store (if params present).
 * On store change: updates URL (replaceState, no history entries).
 */
export function useUrlState() {
  const store = useKitchenStore();
  const initialized = useRef(false);

  // Hydrate from URL on first mount
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const params = new URLSearchParams(window.location.search);
    if (params.size === 0) return;

    const layout = params.get('layout');
    if (layout === 'linear' || layout === 'l-shaped') {
      store.setLayout(layout as LayoutType);
    }

    const wallA = Number(params.get('wallA'));
    if (wallA >= 1500 && wallA <= 5000) store.setWallALength(wallA);

    const wallB = Number(params.get('wallB'));
    if (wallB >= 1500 && wallB <= 5000) store.setWallBLength(wallB);

    const corner = Number(params.get('corner'));
    if (Number.isFinite(corner) && corner > 0) store.setCornerWidth(corner);

    const sinkPos = Number(params.get('sinkPos'));
    if (sinkPos >= 0) store.setSinkPosition(sinkPos);

    const sinkW = Number(params.get('sinkW'));
    if (sinkW > 0) store.setSinkWidth(sinkW);

    const stovePos = Number(params.get('stovePos'));
    if (stovePos >= 0) store.setStovePosition(stovePos);

    const stoveW = Number(params.get('stoveW'));
    if (stoveW > 0) store.setStoveWidth(stoveW);

    const builtIn = params.get('builtIn');
    if (builtIn === '1') store.setIsBuiltInStove(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync store → URL on changes
  useEffect(() => {
    if (!initialized.current) return;

    const params = new URLSearchParams();
    params.set('layout', store.layout);
    params.set('wallA', String(store.wallALength));

    if (store.layout === 'l-shaped') {
      params.set('wallB', String(store.wallBLength));
      params.set('corner', String(store.cornerWidth));
    }

    const sink = store.anchors.find((a) => a.type === 'sink');
    if (sink) {
      params.set('sinkPos', String(sink.position));
      params.set('sinkW', String(sink.width));
    }

    const stove = store.anchors.find((a) => a.type === 'stove');
    if (stove) {
      params.set('stovePos', String(stove.position));
      params.set('stoveW', String(stove.width));
    }

    if (store.isBuiltInStove) {
      params.set('builtIn', '1');
    }

    const url = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, '', url);
  }, [
    store.layout,
    store.wallALength,
    store.wallBLength,
    store.cornerWidth,
    store.anchors,
    store.isBuiltInStove,
  ]);
}
