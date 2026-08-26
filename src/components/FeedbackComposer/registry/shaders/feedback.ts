import { fragmentShader, SANITIZE_HELPER } from './common';

// The centerpiece. u_feedbackPrev is bound directly by the engine from this
// node's own ping-pong buffer -- it is NOT a graph edge (u_input1 is never
// used here), which is what keeps the internal self-reference out of the
// topo-sort entirely.
export const FEEDBACK_FRAGMENT_SHADER = fragmentShader(
  `
uniform sampler2D u_input0;       // external input (1x1 black if unconnected)
uniform sampler2D u_feedbackPrev; // this node's own previous frame
uniform float u_decay;
uniform float u_zoom;
uniform float u_rotate;
uniform float u_offsetX;
uniform float u_offsetY;
uniform float u_mix;
${SANITIZE_HELPER}
`,
  `
void main() {
  vec2 c = v_uv - 0.5;
  float a = radians(u_rotate);
  mat2 rot = mat2(cos(a), -sin(a), sin(a), cos(a));

  vec2 sampleUV = rot * (c / max(u_zoom, 0.0001));
  sampleUV += vec2(u_offsetX, u_offsetY);
  sampleUV += 0.5;

  vec4 prevRaw = texture(u_feedbackPrev, sampleUV);
  vec3 prev = sanitize3(prevRaw.rgb);

  vec3 decayed = prev * clamp(u_decay, 0.0, 1.0);
  vec3 newInput = texture(u_input0, v_uv).rgb;
  vec3 fed = mix(decayed, newInput, clamp(u_mix, 0.0, 1.0));

  outColor = vec4(clamp(fed, 0.0, 1.0), 1.0);
}
`
);

export const FEEDBACK_DEFAULTS = {
  decay: 0.95,
  zoom: 1.01,
  rotate: 0.2,
  offsetX: 0,
  offsetY: 0,
  mix: 0.5,
};
