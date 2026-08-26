import type { Node } from '@xyflow/react';
import type { RegistryKey } from '../registry/nodeRegistry';

export interface PatchNodeData extends Record<string, unknown> {
  registryKey: RegistryKey;
  params: Record<string, number | string>;
}

export type PatchGraphNode = Node<PatchNodeData, RegistryKey>;
