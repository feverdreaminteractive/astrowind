import type { Edge } from '@xyflow/react';
import { DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT, type PatchGraphNode } from './nodes/patchTypes';
import { defaultParamsForDef, getNodeDef } from './registry/nodeRegistry';

export interface Preset {
  id: string;
  label: string;
  nodes: PatchGraphNode[];
  edges: Edge[];
}

function node(id: string, registryKey: string, x: number, y: number, params: Record<string, number | string> = {}): PatchGraphNode {
  const def = getNodeDef(registryKey);
  return {
    id,
    type: registryKey as PatchGraphNode['type'],
    position: { x, y },
    width: DEFAULT_NODE_WIDTH,
    height: DEFAULT_NODE_HEIGHT,
    data: { registryKey: registryKey as PatchGraphNode['data']['registryKey'], params: { ...defaultParamsForDef(def), ...params } },
  };
}

function edge(id: string, source: string, sourceHandle: string, target: string, targetHandle: string): Edge {
  return { id, source, sourceHandle, target, targetHandle, type: 'patchEdge' };
}

export const PRESETS: Preset[] = [
  {
    id: 'infinite-tunnel',
    label: 'Infinite tunnel',
    nodes: [
      node('src', 'shader', 0, 40, { pattern: 'plasma', speed: 0.4 }),
      node('fb', 'feedback', 340, -60, { decay: 0.96, zoom: 1.02, rotate: 0.3, mix: 0.35 }),
      node('out', 'output', 680, 80),
    ],
    edges: [edge('e1', 'src', 'out', 'fb', 'in'), edge('e2', 'fb', 'out', 'out', 'in')],
  },
  {
    id: 'kaleidoscope-drift',
    label: 'Kaleidoscope drift',
    nodes: [
      node('src', 'shader', 0, 60, { pattern: 'noise', speed: 0.2 }),
      node('fb', 'feedback', 300, -40, { decay: 0.94, zoom: 1.015, rotate: 0.5, mix: 0.4 }),
      node('kal', 'kaleidoscope', 600, 100, { segments: 8 }),
      node('out', 'output', 900, -20),
    ],
    edges: [
      edge('e1', 'src', 'out', 'fb', 'in'),
      edge('e2', 'fb', 'out', 'kal', 'in'),
      edge('e3', 'kal', 'out', 'out', 'in'),
    ],
  },
  {
    id: 'video-echo',
    label: 'Video echo',
    nodes: [
      node('cam', 'webcam', 0, 60),
      node('fb', 'feedback', 340, -60, { decay: 0.9, zoom: 1.0, rotate: 0.05, offsetX: 0.004, mix: 0.5 }),
      node('out', 'output', 680, 80),
    ],
    edges: [edge('e1', 'cam', 'out', 'fb', 'in'), edge('e2', 'fb', 'out', 'out', 'in')],
  },
];
