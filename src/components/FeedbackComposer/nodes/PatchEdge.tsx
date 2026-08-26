import { BaseEdge, EdgeLabelRenderer, getBezierPath, useReactFlow, type EdgeProps } from '@xyflow/react';
import { X } from 'lucide-react';

// Cables read as signal flow: a bezier for correct hit-testing/selection
// (BaseEdge), plus a second pointer-events-none overlay path with a dashed
// stroke animated via a static CSS keyframe -- no per-frame JS involved.
export default function PatchEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, selected }: EdgeProps) {
  const { setEdges } = useReactFlow();
  const [path, labelX, labelY] = getBezierPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition });

  return (
    <>
      {/* interactionWidth widens the invisible click target well past the
          visible stroke -- selecting a cable to delete it (Backspace/Delete)
          was hard to hit precisely at the default width. */}
      <BaseEdge id={id} path={path} interactionWidth={36} style={{ stroke: selected ? '#c084fc' : '#525252', strokeWidth: 2.5 }} />
      <path
        d={path}
        fill="none"
        stroke={selected ? '#e9d5ff' : '#a78bfa'}
        strokeWidth={1.5}
        strokeDasharray="4 6"
        className="feedback-patch-edge-flow"
        pointerEvents="none"
      />
      {selected && (
        <EdgeLabelRenderer>
          <button
            className="nodrag nowheel pointer-events-auto absolute flex size-5 items-center justify-center rounded-full border border-fuchsia-300 bg-neutral-900 text-fuchsia-200 shadow hover:bg-fuchsia-900"
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
            title="Unhook this cable"
            onClick={() => setEdges((eds) => eds.filter((e) => e.id !== id))}
          >
            <X className="size-3" />
          </button>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
