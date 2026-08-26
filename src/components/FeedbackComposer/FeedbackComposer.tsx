import { useCallback, useEffect, useRef, useState } from 'react';
import { ReactFlow, ReactFlowProvider, Background, Controls, MiniMap, useReactFlow, type Edge } from '@xyflow/react';
import { CompositorEngine } from './engine/CompositorEngine';
import { EngineContext } from './engine/EngineContext';
import type { ResolutionScale } from './engine/types';
import { nodeTypes, edgeTypes } from './nodes/nodeTypes';
import type { PatchGraphNode } from './nodes/patchTypes';
import type { RegistryKey } from './registry/nodeRegistry';
import { useCompositorGraph } from './useCompositorGraph';
import { PaletteSidebar, PaletteContextMenu } from './Palette';
import Toolbar from './Toolbar';
import PreviewPanel from './PreviewPanel';
import { PRESETS } from './presets';
import { downloadGraphJson, parseGraphJson, buildShareUrl, readGraphFromLocationHash } from './serialize';

// The graph's state (useCompositorGraph) and the canvas DOM element both
// live here, at the top level, so that toggling perform mode -- which
// unmounts the ReactFlow/Palette/Toolbar tree below -- never resets the
// patch the user built or remounts the <canvas> the engine is bound to.
function FeedbackComposerRoot() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [engine, setEngine] = useState<CompositorEngine | null>(null);
  const [performMode, setPerformMode] = useState(false);
  const [resolution, setResolution] = useState<ResolutionScale>(1);
  const [isRecording, setIsRecording] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, isValidConnection, addNode, setNodes, setEdges, renderGraph } =
    useCompositorGraph();
  const { toObject } = useReactFlow<PatchGraphNode, Edge>();

  useEffect(() => {
    if (!canvasRef.current) return;
    const eng = new CompositorEngine(canvasRef.current);
    setEngine(eng);
    return () => eng.dispose();
  }, []);

  useEffect(() => {
    if (engine) engine.update(renderGraph);
  }, [engine, renderGraph]);

  useEffect(() => {
    const canvasEl = canvasRef.current;
    if (!engine || !canvasEl) return;
    const updateSize = () => {
      const rect = canvasEl.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      engine.resize(Math.max(1, rect.width * dpr), Math.max(1, rect.height * dpr), resolution);
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(canvasEl);
    return () => observer.disconnect();
  }, [engine, resolution, performMode]);

  // Load a shared patch from the URL hash exactly once -- this effect lives
  // at the top level (which never remounts), unlike the ReactFlow tree below.
  useEffect(() => {
    const shared = readGraphFromLocationHash();
    if (shared) {
      setNodes(shared.nodes as PatchGraphNode[]);
      setEdges(shared.edges);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSetPerformMode = useCallback(
    (active: boolean) => {
      setPerformMode(active);
      engine?.setPerformMode(active);
    },
    [engine]
  );

  const hasOutput = nodes.some((n) => n.data.registryKey === 'output');

  const handleAdd = useCallback(
    (key: RegistryKey, screenPosition?: { x: number; y: number }) => {
      // Pass screenPosition through as-is: the context menu supplies an
      // exact cursor position, the sidebar omits it so addNode cascades a
      // non-overlapping position instead of stacking every node at center.
      addNode(key, screenPosition);
      setContextMenu(null);
    },
    [addNode]
  );

  const handleSave = useCallback(() => downloadGraphJson(toObject()), [toObject]);

  const handleLoadFile = useCallback(
    async (file: File) => {
      try {
        const text = await file.text();
        const graph = parseGraphJson(text);
        setNodes(graph.nodes as PatchGraphNode[]);
        setEdges(graph.edges);
      } catch (err) {
        console.error('Failed to load patch:', err);
      }
    },
    [setNodes, setEdges]
  );

  const handleLoadPreset = useCallback(
    (presetId: string) => {
      const preset = PRESETS.find((p) => p.id === presetId);
      if (!preset) return;
      setNodes(preset.nodes);
      setEdges(preset.edges);
    },
    [setNodes, setEdges]
  );

  const handleCopyShareLink = useCallback(() => {
    const url = buildShareUrl(toObject());
    navigator.clipboard?.writeText(url).catch(() => {});
  }, [toObject]);

  const handleToggleRecord = useCallback(() => {
    if (!engine) return;
    if (isRecording) {
      void engine.stopRecording().then(() => setIsRecording(false));
    } else {
      engine.startRecording();
      setIsRecording(true);
    }
  }, [engine, isRecording]);

  return (
    <EngineContext.Provider value={engine}>
      <div className="relative h-full w-full bg-black">
        {engine && !performMode && (
          <>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              defaultEdgeOptions={{ type: 'patchEdge' }}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              isValidConnection={isValidConnection}
              deleteKeyCode={['Backspace', 'Delete']}
              colorMode="dark"
              onPaneContextMenu={(e) => {
                e.preventDefault();
                setContextMenu({ x: e.clientX, y: e.clientY });
              }}
              onPaneClick={() => setContextMenu(null)}
              fitView
              fitViewOptions={{ padding: 0.35 }}
            >
              <Background color="#333" gap={24} />
              <Controls />
              <MiniMap pannable zoomable />
            </ReactFlow>

            <div className="pointer-events-none absolute left-3 top-3 z-20">
              <PaletteSidebar hasOutput={hasOutput} onAdd={(key) => handleAdd(key)} />
            </div>

            <div className="pointer-events-none absolute left-1/2 top-3 z-20 -translate-x-1/2">
              <Toolbar
                isRecording={isRecording}
                onToggleRecord={handleToggleRecord}
                onScreenshot={() => engine.requestScreenshot()}
                onSave={handleSave}
                onLoadFile={handleLoadFile}
                onLoadPreset={handleLoadPreset}
                onCopyShareLink={handleCopyShareLink}
                onGlobalReset={() => engine.resetFeedback()}
                resolution={resolution}
                onResolutionChange={setResolution}
                performMode={performMode}
                onTogglePerformMode={() => handleSetPerformMode(!performMode)}
              />
            </div>

            {contextMenu && (
              <PaletteContextMenu
                x={contextMenu.x}
                y={contextMenu.y}
                hasOutput={hasOutput}
                onAdd={(key) => handleAdd(key, contextMenu)}
                onClose={() => setContextMenu(null)}
              />
            )}
          </>
        )}

        {performMode && (
          <div className="pointer-events-auto absolute right-3 top-3 z-[60]">
            <button
              className="rounded-lg border border-neutral-700 bg-black/60 px-3 py-1.5 text-xs text-neutral-200 backdrop-blur hover:bg-black/80"
              onClick={() => handleSetPerformMode(false)}
            >
              Exit perform mode
            </button>
          </div>
        )}

        <PreviewPanel canvasRef={canvasRef} performMode={performMode} />
      </div>
    </EngineContext.Provider>
  );
}

export default function FeedbackComposer() {
  return (
    <ReactFlowProvider>
      <FeedbackComposerRoot />
    </ReactFlowProvider>
  );
}
