import { fragmentShader } from './common';

// Image, Webcam, and Video all work the same way at the shader level: the
// engine uploads an external texture (an <img>/ImageBitmap or a <video>
// frame) to `u_source` every frame, and this shader fits it into the node's
// own aspect ratio -- either "cover" (crop to fill, the default; keeps black
// bars from ever getting sucked into a downstream feedback loop) or
// "contain" (letterbox/pillarbox so the whole source is always visible, at
// the cost of black bars that a Feedback node downstream WILL accumulate).
// Contain reuses the existing out-of-[0,1] -> black fallback below by simply
// pushing the opposite axis out of range instead of narrowing the same one.
export const SOURCE_FIT_FRAGMENT_SHADER = fragmentShader(
  `
uniform sampler2D u_source;
uniform vec2 u_sourceResolution;
uniform float u_mirrorX; // 1.0 for webcam (natural "looking in a mirror" feel), 0.0 otherwise
uniform int u_fit;       // 0 = cover, 1 = contain
`,
  `
void main() {
  float srcAspect = u_sourceResolution.x / max(u_sourceResolution.y, 1.0);
  float dstAspect = u_resolution.x / max(u_resolution.y, 1.0);

  vec2 uv = v_uv;
  uv.x = mix(uv.x, 1.0 - uv.x, u_mirrorX);

  if (u_fit == 1) {
    if (srcAspect > dstAspect) {
      float scale = srcAspect / dstAspect;
      uv.y = (uv.y - 0.5) * scale + 0.5;
    } else {
      float scale = dstAspect / srcAspect;
      uv.x = (uv.x - 0.5) * scale + 0.5;
    }
  } else {
    if (srcAspect > dstAspect) {
      float scale = dstAspect / srcAspect;
      uv.x = (uv.x - 0.5) * scale + 0.5;
    } else {
      float scale = srcAspect / dstAspect;
      uv.y = (uv.y - 0.5) * scale + 0.5;
    }
  }

  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    outColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }

  outColor = texture(u_source, uv);
}
`
);

// A few built-in generative patterns so the tool works with zero input
// connected. One program, branching on u_pattern -- keeps "one program per
// registry key" intact rather than compiling three variants.
export const GENERATIVE_FRAGMENT_SHADER = fragmentShader(
  `
uniform int u_pattern; // 0 = noise, 1 = plasma, 2 = gradient
uniform float u_speed;
`,
  `
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

vec3 patternNoise(vec2 uv, float t) {
  float n = noise(uv * 6.0 + t);
  n += 0.5 * noise(uv * 12.0 - t * 1.3);
  return vec3(n);
}

vec3 patternPlasma(vec2 uv, float t) {
  float v = sin(uv.x * 10.0 + t);
  v += sin(uv.y * 10.0 + t * 1.3);
  v += sin((uv.x + uv.y) * 10.0 + t * 0.7);
  v += sin(length(uv - 0.5) * 20.0 - t * 2.0);
  v *= 0.25;
  return 0.5 + 0.5 * vec3(sin(v * 3.14159), sin(v * 3.14159 + 2.094), sin(v * 3.14159 + 4.188));
}

vec3 patternGradient(vec2 uv, float t) {
  float a = t * 0.15;
  vec2 dir = vec2(cos(a), sin(a));
  float d = dot(uv - 0.5, dir) + 0.5;
  vec3 colorA = vec3(0.85, 0.2, 0.9);
  vec3 colorB = vec3(0.1, 0.6, 0.95);
  return mix(colorA, colorB, clamp(d, 0.0, 1.0));
}

void main() {
  float t = u_time * u_speed;
  vec3 color;
  if (u_pattern == 1) {
    color = patternPlasma(v_uv, t);
  } else if (u_pattern == 2) {
    color = patternGradient(v_uv, t);
  } else {
    color = patternNoise(v_uv, t);
  }
  outColor = vec4(color, 1.0);
}
`
);

// Flat solid-color fill -- no color-picker param type exists yet, so RGB is
// exposed as three plain 0-1 float sliders like everything else. Handy as a
// blend operand or a matte background under transparent-ish chains.
export const COLOR_FRAGMENT_SHADER = fragmentShader(
  `
uniform float u_r;
uniform float u_g;
uniform float u_b;
`,
  `
void main() {
  outColor = vec4(clamp(u_r, 0.0, 1.0), clamp(u_g, 0.0, 1.0), clamp(u_b, 0.0, 1.0), 1.0);
}
`
);
