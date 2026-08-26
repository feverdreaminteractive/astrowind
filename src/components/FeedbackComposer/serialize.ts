import type { Edge, ReactFlowJsonObject } from '@xyflow/react';
import type { PatchGraphNode } from './nodes/patchTypes';

export type SavedGraph = ReactFlowJsonObject<PatchGraphNode, Edge>;

export function downloadGraphJson(graph: SavedGraph) {
  const blob = new Blob([JSON.stringify(graph, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `feedback-patch-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function parseGraphJson(text: string): SavedGraph {
  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
    throw new Error('Not a valid patch file.');
  }
  return parsed as SavedGraph;
}

export function encodeGraphForUrl(graph: SavedGraph): string {
  const json = JSON.stringify(graph);
  return btoa(encodeURIComponent(json).replace(/%([0-9A-F]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16))));
}

export function decodeGraphFromUrl(encoded: string): SavedGraph {
  const json = decodeURIComponent(
    atob(encoded)
      .split('')
      .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
      .join('')
  );
  return parseGraphJson(json);
}

const SHARE_HASH_KEY = 'patch';

export function buildShareUrl(graph: SavedGraph): string {
  const url = new URL(window.location.href);
  url.hash = `${SHARE_HASH_KEY}=${encodeGraphForUrl(graph)}`;
  return url.toString();
}

export function readGraphFromLocationHash(): SavedGraph | null {
  const hash = window.location.hash.replace(/^#/, '');
  const params = new URLSearchParams(hash);
  const encoded = params.get(SHARE_HASH_KEY);
  if (!encoded) return null;
  try {
    return decodeGraphFromUrl(encoded);
  } catch (err) {
    console.error('Failed to parse shared patch from URL:', err);
    return null;
  }
}
