// GLSL ports of the Fever Dream Screens catalog — each mirrors the exact
// math shipped in its macOS screen saver's Metal shader (see
// ~/Developer/AudioMoire/ScreenSaverTemplate/products/<slug>/fragment.metal),
// which were themselves ported from the original Quartz Composer patches in
// ~/Downloads/aim/. As with fever-dream-shader.ts: no mic on the web, so
// `mouse` tracks the real cursor and `colorMagnitude` (loudness in the
// screen saver) is a slow synthetic breathing value computed locally.
const HSV2RGB = `vec3 hsv2rgb(vec3 c) {
    vec4 k = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + k.xyz) * 6.0 - k.www);
    return c.z * mix(k.xxx, clamp(p - k.xxx, 0.0, 1.0), c.y);
}`;

const HEADER = `#ifdef GL_ES
precision highp float;
#endif

uniform float time;
uniform vec2 resolution;
uniform vec2 mouse;`;

// Ported from ~/Downloads/aim/moire2.qtz.
export const GRID_SHADER = `${HEADER}

${HSV2RGB}

void main(void) {
    float colorMagnitude = 0.5 + 0.5 * sin(time * 0.3);

    vec2 uv = gl_FragCoord.xy / resolution;
    uv += (uv - 0.5) * (1.0 - 1.0 / length(uv - 0.5));

    vec2 position = uv * vec2(resolution.x / resolution.y, 1.0);

    float n = 40.0 + mouse.x * 20.0;
    float x = fract(position.x * n) - 0.5;
    float y = fract(position.y * n) - 0.5;

    vec2 s = vec2(x * x, y * y);
    float c = s.x * s.y * (200.0 + 500.0 * ((1.0 + sin(time * 1.5)) * 0.5) + 0.75);
    c = clamp(c, 0.0, 1.0);
    c *= sin(position.y * 16.0 + time * (2.5 + mouse.y * 2.0)) * cos(position.x * 16.0 + time);

    vec3 gray = vec3(c);
    vec3 hueColor = hsv2rgb(vec3(fract(time * 0.05 + colorMagnitude * 0.6), 0.85, clamp(c, 0.0, 1.0)));
    vec3 color = mix(gray, hueColor, clamp(colorMagnitude, 0.0, 1.0));

    color *= 0.5;
    gl_FragColor = vec4(color, 1.0);
}`;

// Ported from ~/Downloads/aim/spiral.qtz.
export const SPIRAL_SHADER = `${HEADER}

${HSV2RGB}

void main(void) {
    float colorMagnitude = 0.5 + 0.5 * sin(time * 0.3);

    vec2 position = (2.0 * gl_FragCoord.xy - resolution) / resolution.x;

    float r = length(position);
    float a = atan(position.y, position.x) + mouse.x * 3.14159265;

    vec3 baseColor = vec3(3.0, 0.0, 1.0);
    float t = 0.5 * (1.0 + cos(a + 40.0 * r * (1.0 + sin(a * 20.0) * 0.1) - time * (3.0 + mouse.y * 2.0)) * (5.0 / (r + 7.5)));
    t = t < 0.8 ? 0.0 : 1.0;

    vec3 gray = baseColor * t;
    vec3 hueColor = hsv2rgb(vec3(fract(time * 0.05 + colorMagnitude * 0.6), 0.85, t));
    vec3 color = mix(gray, hueColor, clamp(colorMagnitude, 0.0, 1.0));

    color *= 0.5;
    gl_FragColor = vec4(color, 1.0);
}`;

// Ported from ~/Downloads/aim/hypnosquare.qtz.
export const HYPNO_SHADER = `${HEADER}

${HSV2RGB}

void main(void) {
    float colorMagnitude = 0.5 + 0.5 * sin(time * 0.3);

    vec2 p = 2.0 * (gl_FragCoord.xy / resolution) - 1.0;
    p.x *= resolution.x / resolution.y;

    float ang = 100.25 * 3.14159265 + mouse.x * 3.14159265;
    mat2 rot = mat2(cos(ang), -sin(ang), sin(ang), cos(ang));
    p = rot * p;

    float d = -time * (1.5 + mouse.y * 1.5) + abs(p.x) + abs(p.y);
    d = mod(d + 10.10, 0.2) - 0.1;

    // Multiplicative mask (not an additive mix) — a mix() here would
    // brighten the black background itself as colorMagnitude rises, since
    // it's mostly zero; masking keeps it black and only tints the lines.
    float onLine = abs(d) < 0.05 ? 1.0 : 0.0;
    vec3 hueColor = hsv2rgb(vec3(fract(time * 0.05 + colorMagnitude * 0.6), 0.85, 1.0));
    vec3 tinted = mix(vec3(10.0), hueColor * 10.0, clamp(colorMagnitude, 0.0, 1.0));
    vec3 color = onLine * tinted;

    color *= 0.5;
    gl_FragColor = vec4(color, 1.0);
}`;

// Ported from ~/Downloads/aim/chevrons.qtz.
export const CHEVRONS_SHADER = `${HEADER}

${HSV2RGB}

void main(void) {
    vec3 orange = vec3(4.0, 1.5, 0.0);
    vec3 pink = vec3(4.0, 0.4, 2.2);
    vec3 color = orange;
    float width = 200.0;

    float x = gl_FragCoord.x - resolution.x / 2.5;
    float y = gl_FragCoord.y - resolution.y / 2.5;

    float rotAngle = mouse.x * 2.0 * 3.14159265;
    float xr = x * cos(rotAngle) - y * sin(rotAngle);
    float yr = x * sin(rotAngle) + y * cos(rotAngle);

    float s = yr < 0.0 ? 1.0 : -1.0;
    float angle = 3.14159265 / 4.0;
    float xp = xr * cos(angle * s) - yr * sin(angle * s) - time * (550.0 + mouse.y * 300.0);

    if (mod(xp, width) - width / 2.0 > 0.0) {
        color = pink;
    }

    color *= 0.5;
    gl_FragColor = vec4(color, 1.0);
}`;

// Ported from ~/Downloads/aim/sunburst.qtz.
export const SUNBURST_SHADER = `${HEADER}

${HSV2RGB}

float fract2(float x) {
    return (fract(gl_FragCoord.x / 2.0) < 0.5) ? fract(x) : 1.0 - fract(gl_FragCoord.x);
}

float rand3d(vec3 a) {
    return fract2(a.z + cos(a.x * a.y * 1424.0) * 12345.2);
}

vec3 p3(float a, float r, float g, float b, float rp, float gp, float bp) {
    return vec3(pow(a, rp) * r, pow(a, gp) * g, pow(a, bp) * b);
}

void main(void) {
    float colorMagnitude = 0.5 + 0.5 * sin(time * 0.3);

    vec2 position = gl_FragCoord.xy - resolution / 2.0;
    float rotAngle = 3.14159265 / 4.0 + mouse.x * 1.0;
    mat2 rot = mat2(cos(rotAngle), sin(rotAngle), -sin(rotAngle), cos(rotAngle));
    position = rot * position;

    vec2 atanPart = atan(position / 600.0) / (position * 3.14159265);
    float thirdComponent = cos(time * (1.0 + mouse.y * 0.5) / 3.14159265) / (length(floor(position / 7.0)) * 0.023);
    float colorVal = rand3d(vec3(atanPart, thirdComponent));

    vec3 baseColor = p3(colorVal, 2.0, 1.5, 1.0, length(position) * 0.002, 2.5, length(position) * 0.01);

    vec3 hueColor = hsv2rgb(vec3(fract(time * 0.05 + colorMagnitude * 0.6), 0.85, clamp(colorVal, 0.0, 1.0)));
    vec3 color = mix(baseColor, hueColor, clamp(colorMagnitude, 0.0, 1.0) * 0.7);

    color *= 0.5;
    gl_FragColor = vec4(color, 1.0);
}`;

// Ported from ~/Downloads/aim/PsychCir2.qtz's second shader (its first is a
// duplicate of spiral.qtz, skipped). GLSL's normalize() accepts a scalar
// (returns its sign) — kept as-is here since GLSL (unlike Metal) supports
// that directly.
export const BLOOM_SHADER = `${HEADER}

${HSV2RGB}

vec3 hueBloom(float hue) {
    vec3 rgb = fract(hue + vec3(0.0, 2.0 / 3.0, 1.0 / 3.0));
    rgb = abs(rgb * 2.0 - 1.0);
    return clamp(rgb * 3.0 - 1.0, 0.0, 1.0);
}

void main(void) {
    float colorMagnitude = 0.5 + 0.5 * sin(time * 0.3);

    vec2 p = (gl_FragCoord.xy * 2.0 - resolution) / min(resolution.x, resolution.y);
    float t = time * (1.0 + mouse.y * 0.5);

    vec2 warp = vec2(p.x + sin(t) + mouse.x * 0.3, p.y + sin(t * 0.25));
    float len = length(warp);

    vec3 destColor = vec3(0.0);
    destColor += sign(sin(0.1 / len * 1.0 + t * 10.0));
    destColor *= hueBloom(sin(t)) * vec3(abs(sin(t * 50.0)));

    destColor += sign(sin(0.1 / len * 125.0 + t * 10.0));
    destColor += sign(sin(0.01 / len * 125.0 + t * 10.0));
    destColor -= (0.25 / len);

    destColor *= hueBloom(sin(t)) * vec3(abs(sin(t * 25.0)));

    vec3 hueOverlay = hsv2rgb(vec3(fract(time * 0.05 + colorMagnitude * 0.6), 0.85, 1.0));
    destColor = mix(destColor, destColor * hueOverlay * 2.0, clamp(colorMagnitude, 0.0, 1.0) * 0.5);

    float scanline = mod(gl_FragCoord.y, 2.0);
    destColor *= scanline;

    destColor *= 0.5;
    gl_FragColor = vec4(destColor, 1.0);
}`;

export const CATALOG_SHADERS: Record<string, string> = {
  grid: GRID_SHADER,
  spiral: SPIRAL_SHADER,
  hypno: HYPNO_SHADER,
  chevrons: CHEVRONS_SHADER,
  bloom: BLOOM_SHADER,
};
