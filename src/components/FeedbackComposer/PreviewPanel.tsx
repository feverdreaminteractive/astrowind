import { useRef, useState, type PointerEvent, type RefObject } from 'react';
import { Move } from 'lucide-react';
import { getNavClearance } from './useDraggablePosition';

interface PreviewPanelProps {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  performMode: boolean;
}

const MIN_WIDTH = 240;
const MIN_HEIGHT = 135;
const MAX_WIDTH = 960;
const MAX_HEIGHT = 720;
const MARGIN = 16;
// This canvas IS the one and only render surface (the patch editor behind it
// is just the node graph, not the composited output), so its box shape is
// literally the destination aspect ratio the fit shaders crop/letterbox
// against. Sized to match the bundled default video (810x1536, portrait) so
// its 'contain' fit shows edge-to-edge with no bars.
const DEFAULT_SIZE = { width: 320, height: 607 };

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

// The <canvas> itself never unmounts (the engine holds a live reference to
// it) -- only its container's size/position changes between patch mode's
// movable/resizable floating preview and perform mode's fullscreen takeover.
// Position is plain left/top px, initialized to the top-right corner;
// dragging the top-left corner handle resizes by growing toward that corner
// while shifting left/top so the opposite (bottom-right) corner visually
// stays put, matching the old anchored-resize feel.
export default function PreviewPanel({ canvasRef, performMode }: PreviewPanelProps) {
  const [size, setSize] = useState(DEFAULT_SIZE);
  const [position, setPosition] = useState(() => ({
    left: window.innerWidth - MARGIN - DEFAULT_SIZE.width,
    top: getNavClearance() + MARGIN,
  }));
  const resizeState = useRef<{
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
    startLeft: number;
    startTop: number;
  } | null>(null);
  const moveState = useRef<{ startX: number; startY: number; startLeft: number; startTop: number } | null>(null);

  const handleResizePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    resizeState.current = {
      startX: e.clientX,
      startY: e.clientY,
      startWidth: size.width,
      startHeight: size.height,
      startLeft: position.left,
      startTop: position.top,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleResizePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const start = resizeState.current;
    if (!start) return;
    const dx = start.startX - e.clientX;
    const dy = start.startY - e.clientY;
    const width = clamp(start.startWidth + dx, MIN_WIDTH, MAX_WIDTH);
    const height = clamp(start.startHeight + dy, MIN_HEIGHT, MAX_HEIGHT);
    setSize({ width, height });
    setPosition({
      left: start.startLeft - (width - start.startWidth),
      top: clamp(start.startTop - (height - start.startHeight), getNavClearance(), window.innerHeight - height),
    });
  };

  const handleResizePointerUp = (e: PointerEvent<HTMLDivElement>) => {
    resizeState.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const handleMovePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    moveState.current = { startX: e.clientX, startY: e.clientY, startLeft: position.left, startTop: position.top };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleMovePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const start = moveState.current;
    if (!start) return;
    const left = clamp(start.startLeft + (e.clientX - start.startX), 0, window.innerWidth - size.width);
    const top = clamp(start.startTop + (e.clientY - start.startY), getNavClearance(), window.innerHeight - size.height);
    setPosition({ left, top });
  };

  const handleMovePointerUp = (e: PointerEvent<HTMLDivElement>) => {
    moveState.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  return (
    <div
      className={
        performMode
          ? 'fixed inset-0 z-50 bg-black'
          : 'pointer-events-auto fixed z-30 overflow-hidden rounded-lg border border-neutral-800 bg-black shadow-2xl'
      }
      style={performMode ? undefined : { width: size.width, height: size.height, left: position.left, top: position.top }}
    >
      <canvas ref={canvasRef} className="h-full w-full" />
      {!performMode && (
        <>
          <div
            onPointerDown={handleMovePointerDown}
            onPointerMove={handleMovePointerMove}
            onPointerUp={handleMovePointerUp}
            className="nodrag nowheel absolute inset-x-0 top-0 z-10 flex h-5 touch-none cursor-move items-center justify-center bg-black/30 hover:bg-black/50"
            title="Drag to move"
          >
            <Move className="size-3 text-neutral-400" />
          </div>
          <div
            onPointerDown={handleResizePointerDown}
            onPointerMove={handleResizePointerMove}
            onPointerUp={handleResizePointerUp}
            className="nodrag nowheel absolute left-0 top-0 z-20 h-5 w-5 touch-none cursor-nwse-resize"
            title="Drag to resize"
          >
            <div className="absolute left-1.5 top-1.5 h-2.5 w-2.5 border-l-2 border-t-2 border-neutral-400" />
          </div>
        </>
      )}
    </div>
  );
}
