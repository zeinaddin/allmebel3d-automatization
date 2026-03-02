import type { Wall, Segment, SegmentContext } from './types';

/**
 * Splits a wall into segments around anchors (sink, stove).
 * Returns ordered segments: [fill, anchor, fill, anchor, fill, ...]
 *
 * Fill segments get a context based on their adjacent anchor:
 * - Next to sink → 'sink' (drawers preferred)
 * - Next to stove → 'stove'
 * - Otherwise → 'standard'
 */
export function segmentWall(wall: Wall): Segment[] {
  const anchors = [...wall.anchors].sort((a, b) => a.position - b.position);
  const segments: Segment[] = [];
  let cursor = 0;

  for (let i = 0; i < anchors.length; i++) {
    const anchor = anchors[i]!;

    // Fill gap before this anchor
    if (anchor.position > cursor) {
      let context: SegmentContext = 'standard';
      if (anchor.type === 'sink') {
        context = 'sink';
      } else if (i > 0 && anchors[i - 1]!.type === 'sink') {
        context = 'sink';
      } else if (anchor.type === 'stove') {
        context = 'stove';
      }

      segments.push({
        kind: 'fill',
        start: cursor,
        width: anchor.position - cursor,
        context,
      });
    }

    // Anchor segment
    segments.push({
      kind: 'anchor',
      start: anchor.position,
      width: anchor.width,
      context: anchor.type === 'sink' ? 'sink' : 'stove',
      anchorType: anchor.isBuiltIn ? 'oven' : anchor.type,
    });

    cursor = anchor.position + anchor.width;
  }

  // Fill gap after last anchor
  if (cursor < wall.length) {
    const lastAnchor = anchors[anchors.length - 1];
    let context: SegmentContext = 'standard';
    if (lastAnchor?.type === 'sink') {
      context = 'sink';
    } else if (lastAnchor?.type === 'stove') {
      context = 'stove';
    }

    segments.push({
      kind: 'fill',
      start: cursor,
      width: wall.length - cursor,
      context,
    });
  }

  // Edge case: no anchors at all — entire wall is one fill segment
  if (anchors.length === 0) {
    segments.push({
      kind: 'fill',
      start: 0,
      width: wall.length,
      context: 'standard',
    });
  }

  return segments;
}
