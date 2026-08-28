import { fragmentShader, HSV_HELPERS } from './common';

export const HUE_COLOR_FRAGMENT_SHADER = fragmentShader(
  `
uniform sampler2D u_input0;
uniform float u_hue;        // degrees
uniform float u_saturation; // multiplier, default 1
uniform float u_brightness; // additive, default 0
uniform float u_contrast;   // multiplier around 0.5, default 1
${HSV_HELPERS}
`,
  `
void main() {
  vec4 src = texture(u_input0, v_uv);
  vec3 hsv = rgb2hsv(src.rgb);
  hsv.x = fract(hsv.x + u_hue / 360.0);
  hsv.y = clamp(hsv.y * u_saturation, 0.0, 1.0);
  vec3 color = hsv2rgb(hsv);
  color = (color - 0.5) * u_contrast + 0.5 + u_brightness;
  outColor = vec4(clamp(color, 0.0, 1.0), src.a);
}
`
);

// Cheap single-pass approximation, not a true two-pass separable gaussian --
// this node renders exactly one pass per frame like every other node, so a
// small fixed-tap kernel (radius scaled by u_amount) stands in for it.
export const BLUR_FRAGMENT_SHADER = fragmentShader(
  `
uniform sampler2D u_input0;
uniform float u_amount; // pixel radius
`,
  `
void main() {
  vec2 texel = u_amount / u_resolution;
  vec4 sum = vec4(0.0);
  float total = 0.0;
  for (int x = -2; x <= 2; x++) {
    for (int y = -2; y <= 2; y++) {
      float w = exp(-float(x * x + y * y) / 4.0);
      sum += texture(u_input0, v_uv + vec2(float(x), float(y)) * texel) * w;
      total += w;
    }
  }
  outColor = sum / total;
}
`
);

export const DISPLACE_FRAGMENT_SHADER = fragmentShader(
  `
uniform sampler2D u_input0;
uniform float u_amplitude;
uniform float u_frequency;
uniform float u_speed;
`,
  `
void main() {
  vec2 uv = v_uv;
  uv.x += sin(uv.y * u_frequency + u_time * u_speed) * u_amplitude;
  uv.y += sin(uv.x * u_frequency + u_time * u_speed * 1.3) * u_amplitude;
  outColor = texture(u_input0, uv);
}
`
);

export const KALEIDOSCOPE_FRAGMENT_SHADER = fragmentShader(
  `
uniform sampler2D u_input0;
uniform float u_segments;
`,
  `
#define PI 3.14159265359
void main() {
  vec2 c = v_uv - 0.5;
  float radius = length(c);
  float angle = atan(c.y, c.x);

  float segmentAngle = (2.0 * PI) / max(u_segments, 1.0);
  angle = mod(angle, segmentAngle);
  angle = abs(angle - segmentAngle * 0.5);

  vec2 uv = vec2(cos(angle), sin(angle)) * radius + 0.5;
  outColor = texture(u_input0, uv);
}
`
);

export const THRESHOLD_FRAGMENT_SHADER = fragmentShader(
  `
uniform sampler2D u_input0;
uniform float u_threshold;
uniform float u_levels; // posterize levels, 2 = hard black/white threshold
`,
  `
void main() {
  vec4 src = texture(u_input0, v_uv);
  float luma = dot(src.rgb, vec3(0.299, 0.587, 0.114));
  vec3 color;
  if (u_levels <= 2.0) {
    color = vec3(step(u_threshold, luma));
  } else {
    color = floor(src.rgb * u_levels + 0.5) / u_levels;
  }
  outColor = vec4(color, src.a);
}
`
);

export const INVERT_FRAGMENT_SHADER = fragmentShader(
  `
uniform sampler2D u_input0;
uniform float u_amount; // 0 = passthrough, 1 = fully inverted
`,
  `
void main() {
  vec4 src = texture(u_input0, v_uv);
  vec3 inverted = 1.0 - src.rgb;
  outColor = vec4(mix(src.rgb, inverted, clamp(u_amount, 0.0, 1.0)), src.a);
}
`
);

export const PIXELATE_FRAGMENT_SHADER = fragmentShader(
  `
uniform sampler2D u_input0;
uniform float u_pixelSize; // cell size in pixels
`,
  `
void main() {
  vec2 cell = max(u_pixelSize, 1.0) / u_resolution;
  vec2 uv = (floor(v_uv / cell) + 0.5) * cell;
  outColor = texture(u_input0, uv);
}
`
);

export const CHROMATIC_ABERRATION_FRAGMENT_SHADER = fragmentShader(
  `
uniform sampler2D u_input0;
uniform float u_amount; // channel split, in pixels
uniform float u_angle;  // split direction, degrees
`,
  `
void main() {
  float a = radians(u_angle);
  vec2 dir = vec2(cos(a), sin(a));
  vec2 offset = dir * (u_amount / u_resolution);
  float r = texture(u_input0, v_uv + offset).r;
  float g = texture(u_input0, v_uv).g;
  float b = texture(u_input0, v_uv - offset).b;
  float alpha = texture(u_input0, v_uv).a;
  outColor = vec4(r, g, b, alpha);
}
`
);

export const VIGNETTE_FRAGMENT_SHADER = fragmentShader(
  `
uniform sampler2D u_input0;
uniform float u_radius;    // distance from center where falloff begins
uniform float u_softness;  // falloff width
uniform float u_intensity; // 0 = no darkening, 1 = fully black at the edge
`,
  `
void main() {
  vec4 src = texture(u_input0, v_uv);
  vec2 c = v_uv - 0.5;
  float dist = length(c) * 1.4142135; // normalize so the corner is ~1.0
  float falloff = smoothstep(u_radius, u_radius + max(u_softness, 0.001), dist);
  float vig = 1.0 - falloff * clamp(u_intensity, 0.0, 1.0);
  outColor = vec4(src.rgb * vig, src.a);
}
`
);

export const MIRROR_FRAGMENT_SHADER = fragmentShader(
  `
uniform sampler2D u_input0;
uniform int u_axis; // 0 = horizontal fold, 1 = vertical fold, 2 = both (quad)
`,
  `
void main() {
  vec2 uv = v_uv;
  if (u_axis == 0) {
    uv.x = uv.x < 0.5 ? uv.x : 1.0 - uv.x;
  } else if (u_axis == 1) {
    uv.y = uv.y < 0.5 ? uv.y : 1.0 - uv.y;
  } else {
    uv.x = uv.x < 0.5 ? uv.x : 1.0 - uv.x;
    uv.y = uv.y < 0.5 ? uv.y : 1.0 - uv.y;
  }
  outColor = texture(u_input0, uv);
}
`
);

// Deterministic per-frame reroll (band index + a coarse time slice) rather
// than a persistent random-state buffer -- keeps this a plain single-pass
// node like everything else in the registry, no extra FBO needed.
export const GLITCH_FRAGMENT_SHADER = fragmentShader(
  `
uniform sampler2D u_input0;
uniform float u_amount;    // 0-1 overall intensity
uniform float u_blockSize; // horizontal band height, in pixels
uniform float u_speed;     // how often bands reroll, in rerolls/sec
`,
  `
float hash(float n) {
  return fract(sin(n) * 43758.5453123);
}

void main() {
  vec2 uv = v_uv;
  float bandHeight = max(u_blockSize, 1.0) / u_resolution.y;
  float band = floor(uv.y / bandHeight);
  float slice = floor(u_time * max(u_speed, 0.001));

  float jitter = (hash(band * 37.1 + slice * 91.7) - 0.5) * 0.4 * u_amount;
  float jump = step(0.92, hash(band * 13.3 + slice * 7.7))
    * (hash(band * 5.1 + slice * 3.3) - 0.5) * u_amount;
  float shiftedX = uv.x + jitter + jump;

  float split = u_amount * 6.0 / u_resolution.x;
  float r = texture(u_input0, vec2(shiftedX + split, uv.y)).r;
  float g = texture(u_input0, vec2(shiftedX, uv.y)).g;
  float b = texture(u_input0, vec2(shiftedX - split, uv.y)).b;
  float a = texture(u_input0, vec2(shiftedX, uv.y)).a;

  outColor = vec4(r, g, b, a);
}
`
);

export const EDGE_DETECT_FRAGMENT_SHADER = fragmentShader(
  `
uniform sampler2D u_input0;
uniform float u_strength;
`,
  `
float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

void main() {
  vec2 texel = 1.0 / u_resolution;
  float tl = luma(texture(u_input0, v_uv + texel * vec2(-1.0,  1.0)).rgb);
  float t  = luma(texture(u_input0, v_uv + texel * vec2( 0.0,  1.0)).rgb);
  float tr = luma(texture(u_input0, v_uv + texel * vec2( 1.0,  1.0)).rgb);
  float l  = luma(texture(u_input0, v_uv + texel * vec2(-1.0,  0.0)).rgb);
  float r  = luma(texture(u_input0, v_uv + texel * vec2( 1.0,  0.0)).rgb);
  float bl = luma(texture(u_input0, v_uv + texel * vec2(-1.0, -1.0)).rgb);
  float b  = luma(texture(u_input0, v_uv + texel * vec2( 0.0, -1.0)).rgb);
  float br = luma(texture(u_input0, v_uv + texel * vec2( 1.0, -1.0)).rgb);

  float gx = -tl - 2.0 * l - bl + tr + 2.0 * r + br;
  float gy = -tl - 2.0 * t - tr + bl + 2.0 * b + br;
  float edge = clamp(length(vec2(gx, gy)) * u_strength, 0.0, 1.0);

  outColor = vec4(vec3(edge), 1.0);
}
`
);
