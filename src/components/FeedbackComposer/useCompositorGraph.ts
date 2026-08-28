import { useCallback, useEffect, useMemo } from 'react';
import {
  useNodesState,
  useEdgesState,
  useReactFlow,
  addEdge,
  getOutgoers,
  type Connection,
  type Edge,
  type IsValidConnection,
} from '@xyflow/react';
import { getNodeDef, defaultParamsForDef, type RegistryKey } from './registry/nodeRegistry';
import type { RenderGraph } from './engine/types';
import { DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT, type PatchGraphNode } from './nodes/patchTypes';
import { PRESETS } from './presets';

// "Video loop" loads by default so the page is already doing something the
// instant you land on it, using a bundled clip (bootstrap-loaded into the
// 'vid' node by FeedbackComposer.tsx) rather than Webcam -- no permission
// prompt needed for the default landing state.
const DEFAULT_PRESET = PRESETS.find((p) => p.id === 'video-loop')!;
const initialNodes: PatchGraphNode[] = DEFAULT_PRESET.nodes;
const initialEdges: Edge[] = DEFAULT_PRESET.edges;

/**
 * Wraps React Flow's own state hooks and derives the plain-data RenderGraph
 * the WebGL2 engine consumes. The signature memo below is the mechanism that
 * keeps dragging a node around the canvas (which fires 60+ position updates/
 * sec) from ever reaching the engine -- only actual shape/param changes do.
 */
export function useCompositorGraph() {
  const [nodes, setNodes, onNodesChange] = useNodesState<PatchGraphNode>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const { getNodes, getEdges, screenToFlowPosition, setCenter, getZoom } = useReactFlow<PatchGraphNode>();

  const signature = useMemo(() => {
    const nodeSig = nodes
      .map((n) => `${n.id}:${n.data.registryKey}:${JSON.stringify(Object.entries(n.data.params ?? {}).sort())}`)
      .sort()
      .join('|');
    const edgeSig = edges
      .map((e) => `${e.source}.${e.sourceHandle ?? ''}->${e.target}.${e.targetHandle ?? ''}`)
      .sort()
      .join('|');
    return `${nodeSig}##${edgeSig}`;
  }, [nodes, edges]);

  // eslint-disable-next-line react-hooks/exhaustive-deps -- deliberately keyed on the cheap signature, not node/edge identity, so position/selection churn during drag never recomputes this.
  const renderGraph: RenderGraph = useMemo(
    () => ({
      nodes: nodes.map((n) => ({ id: n.id, registryKey: n.data.registryKey, params: n.data.params })),
      edges: edges.map((e) => ({
        id: e.id,
        source: e.source,
        sourceHandle: e.sourceHandle ?? '',
        target: e.target,
        targetHandle: e.targetHandle ?? '',
      })),
    }),
    [signature]
  );

  const isValidConnection: IsValidConnection = useCallback(
    (connection) => {
      const conn = connection as Connection;
      if (conn.source === conn.target) return false;
      const nodesNow = getNodes();
      const edgesNow = getEdges();
      const target = nodesNow.find((n) => n.id === conn.target);
      if (!target) return false;

      // Every input port takes exactly one cable. @xyflow/react's installed
      // version doesn't support a numeric isConnectable cap on <Handle>, so
      // this is enforced here instead: reject if the target port already has
      // an incoming edge (Blend's two ports are checked independently since
      // targetHandle differs).
      const portAlreadyConnected = edgesNow.some((e) => e.target === conn.target && e.targetHandle === conn.targetHandle);
      if (portAlreadyConnected) return false;

      const hasCycle = (node: PatchGraphNode, visited: Set<string> = new Set()): boolean => {
        if (visited.has(node.id)) return false;
        visited.add(node.id);
        for (const outgoer of getOutgoers(node, nodesNow, edgesNow)) {
          if (outgoer.id === conn.source) return true;
          if (hasCycle(outgoer as PatchGraphNode, visited)) return true;
        }
        return false;
      };

      return !hasCycle(target);
    },
    [getNodes, getEdges]
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge({ ...connection, type: 'patchEdge' }, eds));
    },
    [setEdges]
  );

  const addNode = useCallback(
    (registryKey: RegistryKey, screenPosition?: { x: number; y: number }) => {
      const def = getNodeDef(registryKey);
      let position: { x: number; y: number };
      if (screenPosition) {
        // Explicit position (right-click-at-cursor) -- honor it exactly.
        position = screenToFlowPosition(screenPosition);
      } else {
        // Sidebar "click to add" with no cursor position: cascade each new
        // node so repeated clicks don't stack exactly on top of each other
        // (which made cables nearly impossible to grab -- every port was
        // hidden under the node added after it).
        const base = screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
        const index = getNodes().length;
        const step = 40;
        const col = index % 6;
        const row = Math.floor(index / 6);
        position = { x: base.x + col * step * 3, y: base.y + col * step + row * 200 };
      }
      const newNode: PatchGraphNode = {
        id: crypto.randomUUID(),
        type: registryKey,
        position,
        width: DEFAULT_NODE_WIDTH,
        height: DEFAULT_NODE_HEIGHT,
        selected: true,
        data: { registryKey, params: defaultParamsForDef(def) },
      };
      // Select it (shows the fuchsia ring + resize handles) and pan the
      // viewport to it -- a cascaded sidebar-add can easily land outside the
      // current view, and a node that appears with no visible change reads
      // as "nothing happened" rather than "a node was added".
      setNodes((nds) => [...nds.map((n) => ({ ...n, selected: false })), newNode]);
      void setCenter(position.x + DEFAULT_NODE_WIDTH / 2, position.y + DEFAULT_NODE_HEIGHT / 2, {
        zoom: getZoom(),
        duration: 400,
      });
    },
    [screenToFlowPosition, setNodes, getNodes, setCenter, getZoom]
  );

  // Cmd+D duplicate. Not built into React Flow; a plain keydown listener
  // (not useKeyPress, which is a documented render-body side-effect
  // anti-pattern) guarded by e.repeat so holding the key doesn't spam copies.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isDuplicateShortcut = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'd';
      if (!isDuplicateShortcut || e.repeat) return;
      const selectedNodes = getNodes().filter((n) => n.selected);
      if (selectedNodes.length === 0) return;
      e.preventDefault();

      const idMap = new Map<string, string>();
      const duplicatedNodes: PatchGraphNode[] = selectedNodes.map((n) => {
        const newId = crypto.randomUUID();
        idMap.set(n.id, newId);
        return {
          ...n,
          id: newId,
          selected: true,
          position: { x: n.position.x + 32, y: n.position.y + 32 },
          data: { registryKey: n.data.registryKey, params: { ...n.data.params } },
        };
      });

      setNodes((nds) => [...nds.map((n) => ({ ...n, selected: false })), ...duplicatedNodes]);

      const duplicatedEdges = getEdges()
        .filter((e) => idMap.has(e.source) && idMap.has(e.target))
        .map((e) => ({ ...e, id: crypto.randomUUID(), source: idMap.get(e.source)!, target: idMap.get(e.target)! }));
      if (duplicatedEdges.length > 0) setEdges((eds) => [...eds, ...duplicatedEdges]);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [getNodes, getEdges, setNodes, setEdges]);

  return {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    isValidConnection,
    addNode,
    setNodes,
    setEdges,
    renderGraph,
  };
}
