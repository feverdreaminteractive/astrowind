import { fragmentShader } from './common';

// Final pass: straight passthrough. The engine binds this node's input FBO
// texture and renders directly to the visible canvas (no intermediate FBO
// for the Output node itself).
export const OUTPUT_FRAGMENT_SHADER = fragmentShader(
  `
uniform sampler2D u_input0;
`,
  `
void main() {
  outColor = texture(u_input0, v_uv);
}
`
);
