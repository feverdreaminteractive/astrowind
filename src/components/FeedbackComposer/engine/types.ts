// The one place the graph (React Flow state) and the renderer (WebGL2) meet.
// Deliberately contains zero React Flow types -- the engine only ever sees
// this plain-data shape, never node positions/selection/etc.

export interface RenderGraphNode {
  id: string;
  registryKey: string;
  params: Record<string, number | string>;
}

export interface RenderGraphEdge {
  id: string;
  source: string;
  sourceHandle: string;
  target: string;
  targetHandle: string;
}

export interface RenderGraph {
  nodes: RenderGraphNode[];
  edges: RenderGraphEdge[];
}

export type ResolutionScale = 0.5 | 1 | 2;
