// Shared GLSL fragment-shader header every registry shader body is templated
// onto, plus a couple of small helper functions reused by more than one
// effect. WebGL2 / GLSL ES 3.00 throughout -- `in`/`out`, not `varying`.

export const FRAGMENT_HEADER = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 outColor;
uniform vec2 u_resolution;
uniform float u_time;
`;

/** Builds a full fragment shader from a header + body, so registry entries only write the interesting part. */
export function fragmentShader(uniforms: string, body: string): string {
  return `${FRAGMENT_HEADER}${uniforms}\n${body}`;
}

export const HSV_HELPERS = `
vec3 rgb2hsv(vec3 c) {
  vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
  float d = q.x - min(q.w, q.y);
  float e = 1.0e-10;
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}
`;

/** Standard NaN/Inf guard used anywhere accumulated state (feedback) is sampled back in. */
export const SANITIZE_HELPER = `
float sanitize(float v) { return (isnan(v) || isinf(v)) ? 0.0 : v; }
vec3 sanitize3(vec3 v) { return vec3(sanitize(v.r), sanitize(v.g), sanitize(v.b)); }
`;
