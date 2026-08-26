import type { NodeTypes, EdgeTypes } from '@xyflow/react';
import { REGISTRY_KEYS } from '../registry/nodeRegistry';
import PatchNode from './PatchNode';
import PatchEdge from './PatchEdge';

// Every registry key maps to the SAME component -- only the registry data
// differs. Defined once at module scope: recreating this object per-render
// is a documented xyflow perf/remount bug.
export const nodeTypes: NodeTypes = Object.fromEntries(REGISTRY_KEYS.map((key) => [key, PatchNode]));

export const edgeTypes: EdgeTypes = {
  patchEdge: PatchEdge,
};
