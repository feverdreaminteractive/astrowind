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
