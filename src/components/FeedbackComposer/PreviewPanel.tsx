import { useRef, useState, type PointerEvent, type RefObject } from 'react';

interface PreviewPanelProps {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  performMode: boolean;
}

const MIN_WIDTH = 240;
const MIN_HEIGHT = 135;
const MAX_WIDTH = 960;
const MAX_HEIGHT = 720;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

// The <canvas> itself never unmounts (the engine holds a live reference to
// it) -- only its container's size/position changes between patch mode's
// resizable floating preview and perform mode's fullscreen takeover. The
// panel is anchored bottom-right (bottom-4 right-4), so growing width/height
// while that anchor stays fixed naturally expands it up-and-left into the
// canvas -- dragging its top-left corner handle grows it toward the content,
// not off-screen.
export default function PreviewPanel({ canvasRef, performMode }: PreviewPanelProps) {
  const [size, setSize] = useState({ width: 380, height: 214 });
  const dragState = useRef<{ startX: number; startY: number; startWidth: number; startHeight: number } | null>(null);

  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragState.current = { startX: e.clientX, startY: e.clientY, startWidth: size.width, startHeight: size.height };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragState.current) return;
    const dx = dragState.current.startX - e.clientX;
    const dy = dragState.current.startY - e.clientY;
    setSize({
      width: clamp(dragState.current.startWidth + dx, MIN_WIDTH, MAX_WIDTH),
      height: clamp(dragState.current.startHeight + dy, MIN_HEIGHT, MAX_HEIGHT),
    });
  };

  const handlePointerUp = (e: PointerEvent<HTMLDivElement>) => {
    dragState.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  return (
    <div
      className={
        performMode
          ? 'fixed inset-0 z-50 bg-black'
          : 'pointer-events-auto fixed bottom-4 right-4 z-30 overflow-hidden rounded-lg border border-neutral-800 bg-black shadow-2xl'
      }
      style={performMode ? undefined : { width: size.width, height: size.height }}
    >
      <canvas ref={canvasRef} className="h-full w-full" />
      {!performMode && (
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="nodrag nowheel absolute left-0 top-0 z-10 h-5 w-5 touch-none cursor-nwse-resize"
          title="Drag to resize"
        >
          <div className="absolute left-1.5 top-1.5 h-2.5 w-2.5 border-l-2 border-t-2 border-neutral-400" />
        </div>
      )}
    </div>
  );
}
