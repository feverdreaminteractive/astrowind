import { useRef, useState, type PointerEvent, type RefObject } from 'react';

export interface DraggablePosition {
  left: number;
  top: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

// Reads the site header's own live bottom edge rather than a hardcoded nav
// height -- stays correct whether the AnnouncementBanner is showing (pushes
// the header down) or has been dismissed (header snaps back to the top).
export function getNavClearance(): number {
  const header = document.getElementById('site-header');
  return header ? header.getBoundingClientRect().bottom : 64;
}

/**
 * Drag-to-move position state for a `fixed`-positioned floating panel.
 * Clamps against the panel's own live bounding rect (via `panelRef`) rather
 * than a size tracked in JS state, so it works for content-driven panels
 * (e.g. the palette, whose height changes with the search filter) as well
 * as fixed-size ones.
 *
 * `minTop` keeps the panel from being dragged under the site's fixed,
 * z-[9999] top nav (which sits above these panels' z-index and would
 * otherwise visually swallow the top of the panel) -- pass the nav's height
 * on pages where it's shown.
 */
export function useDraggablePosition(
  panelRef: RefObject<HTMLElement | null>,
  initialPosition: () => DraggablePosition,
  minTop = 0
) {
  const [position, setPosition] = useState(initialPosition);
  const dragState = useRef<{ startX: number; startY: number; startLeft: number; startTop: number } | null>(null);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragState.current = { startX: e.clientX, startY: e.clientY, startLeft: position.left, startTop: position.top };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const start = dragState.current;
    if (!start) return;
    const rect = panelRef.current?.getBoundingClientRect();
    const maxLeft = Math.max(0, window.innerWidth - (rect?.width ?? 0));
    const maxTop = Math.max(minTop, window.innerHeight - (rect?.height ?? 0));
    setPosition({
      left: clamp(start.startLeft + (e.clientX - start.startX), 0, maxLeft),
      top: clamp(start.startTop + (e.clientY - start.startY), minTop, maxTop),
    });
  };

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    dragState.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  return { position, dragHandleProps: { onPointerDown, onPointerMove, onPointerUp } };
}
