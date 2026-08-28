import { SOURCE_FIT_FRAGMENT_SHADER, GENERATIVE_FRAGMENT_SHADER, COLOR_FRAGMENT_SHADER } from './shaders/sources';
import { FEEDBACK_FRAGMENT_SHADER, FEEDBACK_DEFAULTS } from './shaders/feedback';
import {
  HUE_COLOR_FRAGMENT_SHADER,
  BLUR_FRAGMENT_SHADER,
  DISPLACE_FRAGMENT_SHADER,
  KALEIDOSCOPE_FRAGMENT_SHADER,
  THRESHOLD_FRAGMENT_SHADER,
  INVERT_FRAGMENT_SHADER,
  PIXELATE_FRAGMENT_SHADER,
  CHROMATIC_ABERRATION_FRAGMENT_SHADER,
  VIGNETTE_FRAGMENT_SHADER,
  MIRROR_FRAGMENT_SHADER,
  EDGE_DETECT_FRAGMENT_SHADER,
  GLITCH_FRAGMENT_SHADER,
} from './shaders/effects';
import { BLEND_FRAGMENT_SHADER, BLEND_MODES, MASK_FRAGMENT_SHADER } from './shaders/blend';
import { OUTPUT_FRAGMENT_SHADER } from './shaders/output';

export type ParamType = 'float' | 'int' | 'select';

export interface ParamOption {
  label: string;
  value: string;
}

export interface ParamDef {
  key: string; // -> uniform u_<key>
  label: string;
  type: ParamType;
  min?: number;
  max?: number;
  step?: number;
  default: number | string;
  hidden?: boolean; // still wired to its uniform every frame, just not shown as a control on the node card
  options?: ParamOption[]; // required for 'select'; index is what's sent to GLSL as an int
}

export interface InputPortDef {
  id: string; // React Flow target handle id
  label: string;
  uniform: string; // e.g. 'u_input0'
}

export type NodeCategory = 'source' | 'feedback' | 'effect' | 'blend' | 'output';
export type SourceKind = 'image' | 'webcam' | 'generative' | 'video';

export interface NodeDef {
  key: string; // registry key == React Flow node.type
  label: string;
  category: NodeCategory;
  inputs: InputPortDef[];
  hasOutput: boolean;
  params: ParamDef[];
  fragmentSource: string;
  isFeedback?: boolean;
  sourceKind?: SourceKind;
}

const uniforms = { input0: 'u_input0', input1: 'u_input1' };

// Shared by Image/Webcam/Video (all three render through
// SOURCE_FIT_FRAGMENT_SHADER). Cover is the default everywhere except Video,
// since a portrait clip cropped to a landscape canvas loses most of its
// frame -- 'contain' trades that for letterbox bars instead.
function fitParam(defaultValue: 'cover' | 'contain'): ParamDef {
  return {
    key: 'fit',
    label: 'Fit',
    type: 'select',
    default: defaultValue,
    hidden: true, // set per node type below, not user-facing
    options: [
      { label: 'Cover (crop)', value: 'cover' },
      { label: 'Contain (letterbox)', value: 'contain' },
    ],
  };
}

export const NODE_REGISTRY: Record<string, NodeDef> = {
  image: {
    key: 'image',
    label: 'Image',
    category: 'source',
    inputs: [],
    hasOutput: true,
    params: [fitParam('cover')],
    fragmentSource: SOURCE_FIT_FRAGMENT_SHADER,
    sourceKind: 'image',
  },
  webcam: {
    key: 'webcam',
    label: 'Webcam',
    category: 'source',
    inputs: [],
    hasOutput: true,
    params: [fitParam('cover')],
    fragmentSource: SOURCE_FIT_FRAGMENT_SHADER,
    sourceKind: 'webcam',
  },
  video: {
    key: 'video',
    label: 'Video',
    category: 'source',
    inputs: [],
    hasOutput: true,
    params: [fitParam('contain')],
    fragmentSource: SOURCE_FIT_FRAGMENT_SHADER,
    sourceKind: 'video',
  },
  shader: {
    key: 'shader',
    label: 'Shader',
    category: 'source',
    inputs: [],
    hasOutput: true,
    params: [
      {
        key: 'pattern',
        label: 'Pattern',
        type: 'select',
        default: 'plasma',
        options: [
          { label: 'Noise', value: 'noise' },
          { label: 'Plasma', value: 'plasma' },
          { label: 'Gradient', value: 'gradient' },
        ],
      },
      { key: 'speed', label: 'Speed', type: 'float', min: 0, max: 3, step: 0.01, default: 1 },
    ],
    fragmentSource: GENERATIVE_FRAGMENT_SHADER,
    sourceKind: 'generative',
  },
  color: {
    key: 'color',
    label: 'Color',
    category: 'source',
    inputs: [],
    hasOutput: true,
    params: [
      { key: 'r', label: 'R', type: 'float', min: 0, max: 1, step: 0.01, default: 1 },
      { key: 'g', label: 'G', type: 'float', min: 0, max: 1, step: 0.01, default: 0 },
      { key: 'b', label: 'B', type: 'float', min: 0, max: 1, step: 0.01, default: 0.5 },
    ],
    fragmentSource: COLOR_FRAGMENT_SHADER,
  },
  feedback: {
    key: 'feedback',
    label: 'Feedback',
    category: 'feedback',
    inputs: [{ id: 'in', label: 'In', uniform: uniforms.input0 }],
    hasOutput: true,
    params: [
      { key: 'decay', label: 'Decay', type: 'float', min: 0, max: 1, step: 0.001, default: FEEDBACK_DEFAULTS.decay },
      { key: 'zoom', label: 'Zoom', type: 'float', min: 0.9, max: 1.1, step: 0.001, default: FEEDBACK_DEFAULTS.zoom },
      { key: 'rotate', label: 'Rotate', type: 'float', min: -5, max: 5, step: 0.01, default: FEEDBACK_DEFAULTS.rotate },
      { key: 'offsetX', label: 'Offset X', type: 'float', min: -0.05, max: 0.05, step: 0.001, default: FEEDBACK_DEFAULTS.offsetX },
      { key: 'offsetY', label: 'Offset Y', type: 'float', min: -0.05, max: 0.05, step: 0.001, default: FEEDBACK_DEFAULTS.offsetY },
      { key: 'mix', label: 'Mix', type: 'float', min: 0, max: 1, step: 0.01, default: FEEDBACK_DEFAULTS.mix },
    ],
    fragmentSource: FEEDBACK_FRAGMENT_SHADER,
    isFeedback: true,
  },
  hueColor: {
    key: 'hueColor',
    label: 'Hue / Color',
    category: 'effect',
    inputs: [{ id: 'in', label: 'In', uniform: uniforms.input0 }],
    hasOutput: true,
    params: [
      { key: 'hue', label: 'Hue', type: 'float', min: -180, max: 180, step: 1, default: 0 },
      { key: 'saturation', label: 'Saturation', type: 'float', min: 0, max: 2, step: 0.01, default: 1 },
      { key: 'brightness', label: 'Brightness', type: 'float', min: -0.5, max: 0.5, step: 0.01, default: 0 },
      { key: 'contrast', label: 'Contrast', type: 'float', min: 0, max: 2, step: 0.01, default: 1 },
    ],
    fragmentSource: HUE_COLOR_FRAGMENT_SHADER,
  },
  displace: {
    key: 'displace',
    label: 'Displace',
    category: 'effect',
    inputs: [{ id: 'in', label: 'In', uniform: uniforms.input0 }],
    hasOutput: true,
    params: [
      { key: 'amplitude', label: 'Amplitude', type: 'float', min: 0, max: 0.1, step: 0.001, default: 0.02 },
      { key: 'frequency', label: 'Frequency', type: 'float', min: 0, max: 40, step: 0.1, default: 10 },
      { key: 'speed', label: 'Speed', type: 'float', min: 0, max: 5, step: 0.01, default: 1 },
    ],
    fragmentSource: DISPLACE_FRAGMENT_SHADER,
  },
  blur: {
    key: 'blur',
    label: 'Blur',
    category: 'effect',
    inputs: [{ id: 'in', label: 'In', uniform: uniforms.input0 }],
    hasOutput: true,
    params: [{ key: 'amount', label: 'Amount', type: 'float', min: 0, max: 8, step: 0.1, default: 1.5 }],
    fragmentSource: BLUR_FRAGMENT_SHADER,
  },
  kaleidoscope: {
    key: 'kaleidoscope',
    label: 'Kaleidoscope',
    category: 'effect',
    inputs: [{ id: 'in', label: 'In', uniform: uniforms.input0 }],
    hasOutput: true,
    params: [{ key: 'segments', label: 'Segments', type: 'float', min: 2, max: 24, step: 1, default: 6 }],
    fragmentSource: KALEIDOSCOPE_FRAGMENT_SHADER,
  },
  threshold: {
    key: 'threshold',
    label: 'Threshold / Posterize',
    category: 'effect',
    inputs: [{ id: 'in', label: 'In', uniform: uniforms.input0 }],
    hasOutput: true,
    params: [
      { key: 'threshold', label: 'Threshold', type: 'float', min: 0, max: 1, step: 0.01, default: 0.5 },
      { key: 'levels', label: 'Levels', type: 'float', min: 2, max: 16, step: 1, default: 2 },
    ],
    fragmentSource: THRESHOLD_FRAGMENT_SHADER,
  },
  invert: {
    key: 'invert',
    label: 'Invert',
    category: 'effect',
    inputs: [{ id: 'in', label: 'In', uniform: uniforms.input0 }],
    hasOutput: true,
    params: [{ key: 'amount', label: 'Amount', type: 'float', min: 0, max: 1, step: 0.01, default: 1 }],
    fragmentSource: INVERT_FRAGMENT_SHADER,
  },
  pixelate: {
    key: 'pixelate',
    label: 'Pixelate',
    category: 'effect',
    inputs: [{ id: 'in', label: 'In', uniform: uniforms.input0 }],
    hasOutput: true,
    params: [{ key: 'pixelSize', label: 'Size', type: 'float', min: 1, max: 64, step: 1, default: 8 }],
    fragmentSource: PIXELATE_FRAGMENT_SHADER,
  },
  chromaticAberration: {
    key: 'chromaticAberration',
    label: 'Chromatic Aberration',
    category: 'effect',
    inputs: [{ id: 'in', label: 'In', uniform: uniforms.input0 }],
    hasOutput: true,
    params: [
      { key: 'amount', label: 'Amount', type: 'float', min: 0, max: 20, step: 0.1, default: 4 },
      { key: 'angle', label: 'Angle', type: 'float', min: 0, max: 360, step: 1, default: 0 },
    ],
    fragmentSource: CHROMATIC_ABERRATION_FRAGMENT_SHADER,
  },
  vignette: {
    key: 'vignette',
    label: 'Vignette',
    category: 'effect',
    inputs: [{ id: 'in', label: 'In', uniform: uniforms.input0 }],
    hasOutput: true,
    params: [
      { key: 'radius', label: 'Radius', type: 'float', min: 0, max: 1.2, step: 0.01, default: 0.5 },
      { key: 'softness', label: 'Softness', type: 'float', min: 0.01, max: 1, step: 0.01, default: 0.4 },
      { key: 'intensity', label: 'Intensity', type: 'float', min: 0, max: 1, step: 0.01, default: 0.8 },
    ],
    fragmentSource: VIGNETTE_FRAGMENT_SHADER,
  },
  mirror: {
    key: 'mirror',
    label: 'Mirror',
    category: 'effect',
    inputs: [{ id: 'in', label: 'In', uniform: uniforms.input0 }],
    hasOutput: true,
    params: [
      {
        key: 'axis',
        label: 'Axis',
        type: 'select',
        default: 'horizontal',
        options: [
          { label: 'Horizontal', value: 'horizontal' },
          { label: 'Vertical', value: 'vertical' },
          { label: 'Both', value: 'both' },
        ],
      },
    ],
    fragmentSource: MIRROR_FRAGMENT_SHADER,
  },
  edgeDetect: {
    key: 'edgeDetect',
    label: 'Edge Detect',
    category: 'effect',
    inputs: [{ id: 'in', label: 'In', uniform: uniforms.input0 }],
    hasOutput: true,
    params: [{ key: 'strength', label: 'Strength', type: 'float', min: 0, max: 10, step: 0.1, default: 3 }],
    fragmentSource: EDGE_DETECT_FRAGMENT_SHADER,
  },
  glitch: {
    key: 'glitch',
    label: 'Glitch',
    category: 'effect',
    inputs: [{ id: 'in', label: 'In', uniform: uniforms.input0 }],
    hasOutput: true,
    params: [
      { key: 'amount', label: 'Amount', type: 'float', min: 0, max: 1, step: 0.01, default: 0.3 },
      { key: 'blockSize', label: 'Block Size', type: 'float', min: 4, max: 120, step: 1, default: 24 },
      { key: 'speed', label: 'Speed', type: 'float', min: 0.5, max: 30, step: 0.5, default: 8 },
    ],
    fragmentSource: GLITCH_FRAGMENT_SHADER,
  },
  blend: {
    key: 'blend',
    label: 'Blend',
    category: 'blend',
    inputs: [
      { id: 'a', label: 'A', uniform: uniforms.input0 },
      { id: 'b', label: 'B', uniform: uniforms.input1 },
    ],
    hasOutput: true,
    params: [
      {
        key: 'blendMode',
        label: 'Mode',
        type: 'select',
        default: 'add',
        options: BLEND_MODES.map((mode) => ({ label: mode[0].toUpperCase() + mode.slice(1), value: mode })),
      },
      { key: 'mixAmount', label: 'Mix', type: 'float', min: 0, max: 1, step: 0.01, default: 1 },
    ],
    fragmentSource: BLEND_FRAGMENT_SHADER,
  },
  mask: {
    key: 'mask',
    label: 'Mask',
    category: 'blend',
    inputs: [
      { id: 'a', label: 'A', uniform: uniforms.input0 },
      { id: 'b', label: 'B (mask)', uniform: uniforms.input1 },
    ],
    hasOutput: true,
    params: [
      {
        key: 'invert',
        label: 'Invert',
        type: 'select',
        default: 'normal',
        options: [
          { label: 'Normal', value: 'normal' },
          { label: 'Inverted', value: 'inverted' },
        ],
      },
      { key: 'softness', label: 'Softness', type: 'float', min: 0.05, max: 4, step: 0.05, default: 1 },
      { key: 'amount', label: 'Amount', type: 'float', min: 0, max: 1, step: 0.01, default: 1 },
    ],
    fragmentSource: MASK_FRAGMENT_SHADER,
  },
  output: {
    key: 'output',
    label: 'Output',
    category: 'output',
    inputs: [{ id: 'in', label: 'In', uniform: uniforms.input0 }],
    hasOutput: false,
    params: [],
    fragmentSource: OUTPUT_FRAGMENT_SHADER,
  },
};

export type RegistryKey = keyof typeof NODE_REGISTRY;

export const REGISTRY_KEYS = Object.keys(NODE_REGISTRY) as RegistryKey[];

export function getNodeDef(key: string): NodeDef {
  const def = NODE_REGISTRY[key];
  if (!def) throw new Error(`Unknown node registry key: ${key}`);
  return def;
}

export function defaultParamsForDef(def: NodeDef): Record<string, number | string> {
  const params: Record<string, number | string> = {};
  for (const param of def.params) params[param.key] = param.default;
  return params;
}

/** All uniform names a registry entry's program needs looked up (params + declared inputs + universal). */
export function uniformNamesForDef(def: NodeDef): string[] {
  const names = new Set<string>(['u_resolution', 'u_time']);
  for (const input of def.inputs) names.add(input.uniform);
  for (const param of def.params) names.add(`u_${param.key}`);
  if (def.sourceKind === 'image' || def.sourceKind === 'webcam' || def.sourceKind === 'video') {
    names.add('u_source');
    names.add('u_sourceResolution');
    names.add('u_mirrorX');
  }
  if (def.sourceKind === 'generative') {
    names.add('u_pattern');
  }
  if (def.isFeedback) {
    names.add('u_feedbackPrev');
  }
  return Array.from(names);
}
