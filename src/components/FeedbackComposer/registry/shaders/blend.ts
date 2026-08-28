import { fragmentShader } from './common';

// Single program, runtime int branch on u_blendMode -- keeps "one program
// per registry key" intact rather than compiling four variants. This is the
// first node that genuinely needs two cables.
export const BLEND_FRAGMENT_SHADER = fragmentShader(
  `
uniform sampler2D u_input0; // A
uniform sampler2D u_input1; // B
uniform int u_blendMode;    // 0 add, 1 multiply, 2 screen, 3 difference
uniform float u_mixAmount;
`,
  `
void main() {
  vec3 a = texture(u_input0, v_uv).rgb;
  vec3 b = texture(u_input1, v_uv).rgb;

  vec3 blended;
  if (u_blendMode == 1) {
    blended = a * b;
  } else if (u_blendMode == 2) {
    blended = 1.0 - (1.0 - a) * (1.0 - b);
  } else if (u_blendMode == 3) {
    blended = abs(a - b);
  } else {
    blended = a + b;
  }

  vec3 color = mix(a, clamp(blended, 0.0, 1.0), clamp(u_mixAmount, 0.0, 1.0));
  outColor = vec4(color, 1.0);
}
`
);

export const BLEND_MODES = ['add', 'multiply', 'screen', 'difference'] as const;

// Second two-cable node. B's luminance drives how much of A shows through,
// composited over black (this pipeline doesn't carry alpha reliably end to
// end -- Blend above ignores it too -- so masking is done in RGB space).
export const MASK_FRAGMENT_SHADER = fragmentShader(
  `
uniform sampler2D u_input0; // A: image to mask
uniform sampler2D u_input1; // B: mask source, luminance used as the matte
uniform int u_invert;       // 0 normal, 1 inverted
uniform float u_softness;   // gamma on the matte; 1 = linear, <1 harder edge, >1 softer
uniform float u_amount;     // 0 = passthrough A, 1 = fully masked
`,
  `
void main() {
  vec3 a = texture(u_input0, v_uv).rgb;
  vec3 b = texture(u_input1, v_uv).rgb;

  float m = dot(b, vec3(0.299, 0.587, 0.114));
  if (u_invert == 1) m = 1.0 - m;
  m = pow(clamp(m, 0.0, 1.0), 1.0 / max(u_softness, 0.01));

  vec3 masked = a * m;
  vec3 color = mix(a, masked, clamp(u_amount, 0.0, 1.0));
  outColor = vec4(color, 1.0);
}
`
);
