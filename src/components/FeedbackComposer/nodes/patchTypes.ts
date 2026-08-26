import type { Node } from '@xyflow/react';
import type { RegistryKey } from '../registry/nodeRegistry';

export interface PatchNodeData extends Record<string, unknown> {
  registryKey: RegistryKey;
  params: Record<string, number | string>;
}

export type PatchGraphNode = Node<PatchNodeData, RegistryKey>;

// Compact by default -- NodeResizer lets a node grow from here when its
// thumbnail or param list needs more room.
export const DEFAULT_NODE_WIDTH = 220;
export const DEFAULT_NODE_HEIGHT = 200;
