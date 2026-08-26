import { FramebufferPool, type Fbo } from './FramebufferPool';
import { createProgram, drawFullscreenTriangle, createBlackFallbackTexture, type CompiledProgram } from './shaderUtils';
import { getNodeDef, defaultParamsForDef, uniformNamesForDef, type NodeDef, type SourceKind } from '../registry/nodeRegistry';
import type { RenderGraph, RenderGraphEdge, RenderGraphNode, ResolutionScale } from './types';

// Matches the node card's thumbnail box aspect (w-64 / h-32 = 2:1) so the
// blit doesn't squish-then-stretch -- that double distortion was the main
// source of visible pixelation, worse on image/webcam content than on
// generative patterns since real footage has much more fine detail.
const THUMB_WIDTH = 200;
const THUMB_HEIGHT = 100;
const DEFAULT_TARGET_FPS = 30; // capped low deliberately -- see plan's "Frame rate target" note. This is a web page on arbitrary hardware, not a controlled native app.

interface BaseRuntime {
  id: string;
  registryKey: string;
  params: Record<string, number | string>;
}
interface EffectRuntime extends BaseRuntime {
  kind: 'effect';
  fbo: Fbo;
}
interface SourceRuntime extends BaseRuntime {
  kind: 'source';
  fbo: Fbo;
  sourceKind: SourceKind;
  sourceTexture: WebGLTexture | null;
  sourceWidth: number;
  sourceHeight: number;
  videoEl?: HTMLVideoElement;
  stream?: MediaStream;
  imageBitmap?: ImageBitmap;
}
interface FeedbackRuntime extends BaseRuntime {
  kind: 'feedback';
  buffers: [Fbo, Fbo];
  activeIndex: 0 | 1;
}
interface OutputRuntime extends BaseRuntime {
  kind: 'output';
}
type NodeRuntime = EffectRuntime | SourceRuntime | FeedbackRuntime | OutputRuntime;

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Owns the WebGL2 context and runs its own requestAnimationFrame loop,
 * completely decoupled from React's render cycle. `update(graph)` is fed a
 * plain-data snapshot whenever the graph's *shape* changes (see
 * useCompositorGraph's signature memo) -- React Flow's positions/selection
 * never reach this class. Feedback accumulation must keep advancing every
 * frame regardless of whether update() was ever called, which is why the
 * render loop is independent of it.
 */
export class CompositorEngine {
  private canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext;
  private fboPool: FramebufferPool;
  private blackTexture: WebGLTexture;
  private thumbFbo: Fbo;

  private programs = new Map<string, CompiledProgram>();
  private nodeRuntimes = new Map<string, NodeRuntime>();
  private currentEdges: RenderGraphEdge[] = [];
  private topoOrder: string[] = [];

  private internalWidth = 1;
  private internalHeight = 1;
  private resolutionScale: ResolutionScale = 1;

  private targetFps = DEFAULT_TARGET_FPS;
  private startTime = performance.now();
  private lastFrameTime = 0;
  private time = 0;
  private rafId = 0;

  private performMode = false;
  private thumbnailCanvases = new Map<string, HTMLCanvasElement>();
  private thumbnailCursor = 0;

  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const gl = canvas.getContext('webgl2', { alpha: false, preserveDrawingBuffer: true, antialias: false });
    if (!gl) throw new Error('WebGL2 is not supported in this browser.');
    this.gl = gl;
    // Video/image sources upload with row 0 = top of frame, but GL samples
    // texture v=0 as the bottom -- without this every Image/Webcam source
    // renders upside down. Only affects texImage2D calls with an actual
    // pixel source (video/canvas/image), so it's safe to set once globally.
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    this.fboPool = new FramebufferPool(gl);
    this.blackTexture = createBlackFallbackTexture(gl);
    this.thumbFbo = this.fboPool.createFbo(THUMB_WIDTH, THUMB_HEIGHT);
    this.rafId = requestAnimationFrame(this.frame);
  }

  // ---- graph <-> engine boundary -----------------------------------------

  update(graph: RenderGraph) {
    const newIds = new Set(graph.nodes.map((n) => n.id));
    for (const id of Array.from(this.nodeRuntimes.keys())) {
      if (!newIds.has(id)) this.removeNode(id);
    }
    for (const node of graph.nodes) {
      const existing = this.nodeRuntimes.get(node.id);
      if (!existing) {
        this.addNode(node);
      } else {
        existing.params = node.params;
      }
    }
    this.currentEdges = graph.edges;
    this.recomputeTopoOrder(graph.nodes, graph.edges);
  }

  private ensureProgram(key: string, def: NodeDef) {
    if (this.programs.has(key)) return;
    const compiled = createProgram(this.gl, def.fragmentSource, uniformNamesForDef(def));
    this.programs.set(key, compiled);
  }

  private addNode(node: RenderGraphNode) {
    const def = getNodeDef(node.registryKey);
    this.ensureProgram(node.registryKey, def);
    const params = { ...defaultParamsForDef(def), ...node.params };

    if (def.isFeedback) {
      const a = this.fboPool.createFbo(this.internalWidth, this.internalHeight);
      const b = this.fboPool.createFbo(this.internalWidth, this.internalHeight);
      this.nodeRuntimes.set(node.id, { id: node.id, registryKey: node.registryKey, params, kind: 'feedback', buffers: [a, b], activeIndex: 0 });
      return;
    }
    if (def.category === 'output') {
      this.nodeRuntimes.set(node.id, { id: node.id, registryKey: node.registryKey, params, kind: 'output' });
      return;
    }
    if (def.sourceKind === 'image' || def.sourceKind === 'webcam') {
      const fbo = this.fboPool.createFbo(this.internalWidth, this.internalHeight);
      const runtime: SourceRuntime = {
        id: node.id,
        registryKey: node.registryKey,
        params,
        kind: 'source',
        fbo,
        sourceKind: def.sourceKind,
        sourceTexture: null,
        sourceWidth: 1,
        sourceHeight: 1,
      };
      this.nodeRuntimes.set(node.id, runtime);
      // getUserMedia fires exactly here -- structurally impossible to reach
      // before the node exists, which is what satisfies "ask permission only
      // when the node is added, never on page load".
      if (def.sourceKind === 'webcam') void this.startWebcam(runtime);
      return;
    }

    const fbo = this.fboPool.createFbo(this.internalWidth, this.internalHeight);
    this.nodeRuntimes.set(node.id, { id: node.id, registryKey: node.registryKey, params, kind: 'effect', fbo });
  }

  private removeNode(id: string) {
    const runtime = this.nodeRuntimes.get(id);
    if (!runtime) return;
    if (runtime.kind === 'feedback') {
      runtime.buffers.forEach((fbo) => this.fboPool.destroyFbo(fbo));
    } else if (runtime.kind === 'effect') {
      this.fboPool.destroyFbo(runtime.fbo);
    } else if (runtime.kind === 'source') {
      this.fboPool.destroyFbo(runtime.fbo);
      if (runtime.sourceKind === 'webcam') this.stopWebcam(runtime);
      if (runtime.sourceTexture) this.gl.deleteTexture(runtime.sourceTexture);
      runtime.imageBitmap?.close();
    }
    this.nodeRuntimes.delete(id);
    this.thumbnailCanvases.delete(id);
  }

  private recomputeTopoOrder(nodes: RenderGraphNode[], edges: RenderGraphEdge[]) {
    const inDegree = new Map<string, number>();
    const adjacency = new Map<string, string[]>();
    for (const n of nodes) {
      inDegree.set(n.id, 0);
      adjacency.set(n.id, []);
    }
    for (const e of edges) {
      if (!adjacency.has(e.source) || !inDegree.has(e.target)) continue;
      adjacency.get(e.source)!.push(e.target);
      inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1);
    }
    const queue: string[] = [];
    for (const [id, deg] of inDegree) if (deg === 0) queue.push(id);
    const order: string[] = [];
    while (queue.length) {
      const id = queue.shift()!;
      order.push(id);
      for (const next of adjacency.get(id) ?? []) {
        inDegree.set(next, (inDegree.get(next) ?? 0) - 1);
        if (inDegree.get(next) === 0) queue.push(next);
      }
    }
    // A cycle shouldn't be reachable (the UI rejects it at connection time
    // via getOutgoers), but fall back to appending any stragglers rather
    // than silently dropping nodes from rendering if one ever sneaks through.
    if (order.length < nodes.length) {
      for (const n of nodes) if (!order.includes(n.id)) order.push(n.id);
    }
    // Deliberately render EVERY node every frame, not just the subgraph
    // reachable from Output -- live thumbnails on every node (including ones
    // still being wired up) is the brief's single most important UX detail,
    // and node count here is small enough that the extra compute is free.
    this.topoOrder = order;
  }

  // ---- per-frame rendering -------------------------------------------------

  private frame = (now: number) => {
    this.rafId = requestAnimationFrame(this.frame);
    if (typeof document !== 'undefined' && document.hidden) return;
    if (this.lastFrameTime && now - this.lastFrameTime < 1000 / this.targetFps) return;
    this.lastFrameTime = now;
    this.time = (now - this.startTime) / 1000;
    this.updateWebcamTextures();
    this.renderGraph();
    this.updateThumbnails();
  };

  private updateWebcamTextures() {
    const gl = this.gl;
    for (const runtime of this.nodeRuntimes.values()) {
      if (runtime.kind !== 'source' || runtime.sourceKind !== 'webcam') continue;
      if (!runtime.videoEl || !runtime.sourceTexture || runtime.videoEl.readyState < 2) continue;
      gl.bindTexture(gl.TEXTURE_2D, runtime.sourceTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, runtime.videoEl);
      runtime.sourceWidth = runtime.videoEl.videoWidth || 1;
      runtime.sourceHeight = runtime.videoEl.videoHeight || 1;
    }
  }

  private renderGraph() {
    for (const id of this.topoOrder) {
      const runtime = this.nodeRuntimes.get(id);
      if (runtime) this.renderNode(runtime);
    }
  }

  private getOutputTexture(runtime: NodeRuntime | undefined): WebGLTexture | null {
    if (!runtime) return null;
    if (runtime.kind === 'feedback') return runtime.buffers[runtime.activeIndex].texture;
    if (runtime.kind === 'effect' || runtime.kind === 'source') return runtime.fbo.texture;
    return null;
  }

  private getOutputFbo(runtime: NodeRuntime | undefined): Fbo | null {
    if (!runtime) return null;
    if (runtime.kind === 'feedback') return runtime.buffers[runtime.activeIndex];
    if (runtime.kind === 'effect' || runtime.kind === 'source') return runtime.fbo;
    return null;
  }

  private renderNode(runtime: NodeRuntime) {
    const gl = this.gl;
    const def = getNodeDef(runtime.registryKey);
    const compiled = this.programs.get(runtime.registryKey);
    if (!compiled) return;
    gl.useProgram(compiled.program);

    let targetWidth: number;
    let targetHeight: number;

    if (runtime.kind === 'output') {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      targetWidth = this.canvas.width;
      targetHeight = this.canvas.height;
    } else if (runtime.kind === 'feedback') {
      const writeIndex = runtime.activeIndex === 0 ? 1 : 0;
      const writeFbo = runtime.buffers[writeIndex];
      gl.bindFramebuffer(gl.FRAMEBUFFER, writeFbo.framebuffer);
      targetWidth = writeFbo.width;
      targetHeight = writeFbo.height;
    } else {
      gl.bindFramebuffer(gl.FRAMEBUFFER, runtime.fbo.framebuffer);
      targetWidth = runtime.fbo.width;
      targetHeight = runtime.fbo.height;
    }
    gl.viewport(0, 0, targetWidth, targetHeight);

    if (compiled.uniforms.u_resolution) gl.uniform2f(compiled.uniforms.u_resolution, targetWidth, targetHeight);
    if (compiled.uniforms.u_time) gl.uniform1f(compiled.uniforms.u_time, this.time);

    let unit = 0;
    if (runtime.kind === 'source') {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, runtime.sourceTexture ?? this.blackTexture);
      if (compiled.uniforms.u_source) gl.uniform1i(compiled.uniforms.u_source, unit);
      if (compiled.uniforms.u_sourceResolution) {
        gl.uniform2f(compiled.uniforms.u_sourceResolution, runtime.sourceWidth, runtime.sourceHeight);
      }
      if (compiled.uniforms.u_mirrorX) {
        gl.uniform1f(compiled.uniforms.u_mirrorX, runtime.sourceKind === 'webcam' ? 1 : 0);
      }
      unit++;
    } else {
      for (const input of def.inputs) {
        const edge = this.currentEdges.find((e) => e.target === runtime.id && e.targetHandle === input.id);
        const upstream = edge ? this.nodeRuntimes.get(edge.source) : undefined;
        const texture = edge ? this.getOutputTexture(upstream) : null;
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, texture ?? this.blackTexture);
        const loc = compiled.uniforms[input.uniform];
        if (loc) gl.uniform1i(loc, unit);
        unit++;
      }
      if (runtime.kind === 'feedback') {
        const prevFbo = runtime.buffers[runtime.activeIndex];
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, prevFbo.texture);
        if (compiled.uniforms.u_feedbackPrev) gl.uniform1i(compiled.uniforms.u_feedbackPrev, unit);
        unit++;
      }
    }

    for (const param of def.params) {
      const loc = compiled.uniforms[`u_${param.key}`];
      if (!loc) continue;
      const value = runtime.params[param.key] ?? param.default;
      if (param.type === 'select') {
        const idx = (param.options ?? []).findIndex((o) => o.value === value);
        gl.uniform1i(loc, Math.max(0, idx));
      } else {
        gl.uniform1f(loc, typeof value === 'number' ? value : parseFloat(value));
      }
    }

    drawFullscreenTriangle(gl);

    if (runtime.kind === 'feedback') {
      runtime.activeIndex = runtime.activeIndex === 0 ? 1 : 0;
    }
  }

  // ---- thumbnails ------------------------------------------------------

  registerThumbnailCanvas(id: string, canvas: HTMLCanvasElement) {
    this.thumbnailCanvases.set(id, canvas);
  }

  unregisterThumbnailCanvas(id: string) {
    this.thumbnailCanvases.delete(id);
  }

  setPerformMode(active: boolean) {
    this.performMode = active;
  }

  private updateThumbnails() {
    if (this.performMode) return;
    const ids = Array.from(this.nodeRuntimes.keys()).filter((id) => this.nodeRuntimes.get(id)?.kind !== 'output');
    if (ids.length === 0) return;
    const perTick = 2;
    for (let i = 0; i < perTick; i++) {
      if (this.thumbnailCursor >= ids.length) this.thumbnailCursor = 0;
      const id = ids[this.thumbnailCursor];
      this.thumbnailCursor++;
      this.updateOneThumbnail(id);
    }
  }

  private updateOneThumbnail(id: string) {
    const runtime = this.nodeRuntimes.get(id);
    const canvasEl = this.thumbnailCanvases.get(id);
    if (!runtime || !canvasEl) return;
    const sourceFbo = this.getOutputFbo(runtime);
    if (!sourceFbo) return;

    const gl = this.gl;
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, sourceFbo.framebuffer);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, this.thumbFbo.framebuffer);
    gl.blitFramebuffer(0, 0, sourceFbo.width, sourceFbo.height, 0, 0, THUMB_WIDTH, THUMB_HEIGHT, gl.COLOR_BUFFER_BIT, gl.LINEAR);

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.thumbFbo.framebuffer);
    const pixels = new Uint8ClampedArray(THUMB_WIDTH * THUMB_HEIGHT * 4);
    gl.readPixels(0, 0, THUMB_WIDTH, THUMB_HEIGHT, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    const ctx2d = canvasEl.getContext('2d');
    if (!ctx2d) return;
    ctx2d.putImageData(new ImageData(pixels, THUMB_WIDTH, THUMB_HEIGHT), 0, 0);
  }

  // ---- sources: image + webcam -------------------------------------------

  async loadImage(nodeId: string, file: File) {
    const runtime = this.nodeRuntimes.get(nodeId);
    if (!runtime || runtime.kind !== 'source') return;
    const bitmap = await createImageBitmap(file);
    const gl = this.gl;
    if (!runtime.sourceTexture) {
      runtime.sourceTexture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, runtime.sourceTexture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    } else {
      gl.bindTexture(gl.TEXTURE_2D, runtime.sourceTexture);
    }
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bitmap);
    runtime.imageBitmap?.close();
    runtime.imageBitmap = bitmap;
    runtime.sourceWidth = bitmap.width;
    runtime.sourceHeight = bitmap.height;
  }

  private async startWebcam(runtime: SourceRuntime) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 }, audio: false });
      const video = document.createElement('video');
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;
      await video.play();
      runtime.videoEl = video;
      runtime.stream = stream;

      const gl = this.gl;
      runtime.sourceTexture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, runtime.sourceTexture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    } catch (err) {
      console.error('Webcam setup failed:', err);
    }
  }

  private stopWebcam(runtime: SourceRuntime) {
    runtime.stream?.getTracks().forEach((track) => track.stop());
    runtime.videoEl?.pause();
  }

  // ---- feedback reset -----------------------------------------------------

  resetFeedback(nodeId?: string) {
    for (const runtime of this.nodeRuntimes.values()) {
      if (runtime.kind !== 'feedback') continue;
      if (nodeId && runtime.id !== nodeId) continue;
      runtime.buffers.forEach((fbo) => this.fboPool.clearFbo(fbo));
      runtime.activeIndex = 0;
    }
  }

  // ---- resolution / resize -------------------------------------------------

  resize(width: number, height: number, scale: ResolutionScale = this.resolutionScale) {
    this.resolutionScale = scale;
    this.canvas.width = Math.max(1, Math.round(width));
    this.canvas.height = Math.max(1, Math.round(height));
    this.internalWidth = Math.max(1, Math.round(width * scale));
    this.internalHeight = Math.max(1, Math.round(height * scale));
    this.fboPool.resizeAll(this.internalWidth, this.internalHeight);
  }

  // ---- record / screenshot -------------------------------------------------

  requestScreenshot() {
    this.canvas.toBlob((blob) => {
      if (blob) downloadBlob(blob, `feedback-${Date.now()}.png`);
    }, 'image/png');
  }

  startRecording(fps = 30) {
    if (this.mediaRecorder) return;
    const stream = this.canvas.captureStream(fps);
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    this.recordedChunks = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.recordedChunks.push(e.data);
    };
    recorder.start();
    this.mediaRecorder = recorder;
  }

  isRecording() {
    return this.mediaRecorder !== null;
  }

  stopRecording(): Promise<void> {
    return new Promise((resolve) => {
      const recorder = this.mediaRecorder;
      if (!recorder) {
        resolve();
        return;
      }
      recorder.onstop = () => {
        const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
        downloadBlob(blob, `feedback-${Date.now()}.webm`);
        this.mediaRecorder = null;
        this.recordedChunks = [];
        resolve();
      };
      recorder.stop();
    });
  }

  // ---- lifecycle ------------------------------------------------------

  dispose() {
    cancelAnimationFrame(this.rafId);
    for (const id of Array.from(this.nodeRuntimes.keys())) this.removeNode(id);
    this.fboPool.dispose();
    this.gl.deleteTexture(this.blackTexture);
    for (const compiled of this.programs.values()) this.gl.deleteProgram(compiled.program);
    this.programs.clear();
  }
}
