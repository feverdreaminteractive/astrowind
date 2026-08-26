// Thin FBO allocator, deliberately NOT a size-bucketed free-list pool: every
// pass in this app renders at one global internal resolution at a time (set
// by the 0.5x/1x/2x selector), and node count/churn is small. All FBOs share
// the same CLAMP_TO_EDGE + LINEAR texture settings, which is what makes
// WebGL2 NPOT sources "just work" and keeps feedback's zoom<1 from wrapping
// garbage in at the edges.

export interface Fbo {
  framebuffer: WebGLFramebuffer;
  texture: WebGLTexture;
  width: number;
  height: number;
}

export class FramebufferPool {
  private gl: WebGL2RenderingContext;
  private owned = new Set<Fbo>();

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
  }

  createFbo(width: number, height: number): Fbo {
    const gl = this.gl;
    const texture = gl.createTexture();
    if (!texture) throw new Error('Failed to create FBO texture.');
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    const framebuffer = gl.createFramebuffer();
    if (!framebuffer) throw new Error('Failed to create framebuffer.');
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

    // Clear to black so a feedback node's initial accumulated frame doesn't
    // start from undefined GPU memory.
    gl.viewport(0, 0, width, height);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, null);

    const fbo: Fbo = { framebuffer, texture, width, height };
    this.owned.add(fbo);
    return fbo;
  }

  clearFbo(fbo: Fbo) {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo.framebuffer);
    gl.viewport(0, 0, fbo.width, fbo.height);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  destroyFbo(fbo: Fbo) {
    const gl = this.gl;
    gl.deleteFramebuffer(fbo.framebuffer);
    gl.deleteTexture(fbo.texture);
    this.owned.delete(fbo);
  }

  /** Reallocates every FBO this pool currently owns at a new size, preserving identity (the Fbo object) so callers holding a reference don't need to be told about the swap. */
  resizeAll(width: number, height: number) {
    const gl = this.gl;
    for (const fbo of this.owned) {
      gl.bindTexture(gl.TEXTURE_2D, fbo.texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo.framebuffer);
      gl.viewport(0, 0, width, height);
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      fbo.width = width;
      fbo.height = height;
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, null);
  }

  dispose() {
    for (const fbo of Array.from(this.owned)) {
      this.destroyFbo(fbo);
    }
  }
}
