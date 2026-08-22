// Fever Dream Screen's actual patterns, ported to GLSL for use as a WebGL
// page background. The moiré pattern matches the screen saver's Metal port
// (Shaders.metal in the AudioMoire repo); the OpArt pattern is ported
// straight from the original Quartz Composer patch's embedded GLSL
// (~/Downloads/aim/OpArtSeries1-5.qtz's QCGLSLShader fragmentShader) rather
// than through the Metal intermediary, so its hue math (0.4 + r * 0.8) is
// byte-for-byte the original's, not the Metal port's variant. The screen
// saver drives `mouse` from bass/treble audio magnitudes and
// `colorMagnitude` from loudness — there's no microphone here, so `mouse`
// instead tracks the real cursor (see HeroShaderBackground's mousemove
// handler) and colorMagnitude is a slow synthetic breathing value in place
// of the original patch's static A-E and looping "time" input, keeping both
// patterns alive and interactive without audio or a 5-second loop reset.
const MOIRE_SHADER = `#ifdef GL_ES
precision highp float;
#endif

uniform float time;
uniform vec2 resolution;
uniform vec2 mouse;

vec3 hsv2rgb(vec3 c) {
    vec4 k = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + k.xyz) * 6.0 - k.www);
    return c.z * mix(k.xxx, clamp(p - k.xxx, 0.0, 1.0), c.y);
}

void main(void) {
    vec2 fragCoord = gl_FragCoord.xy;
    float minDim = min(resolution.x, resolution.y);

    vec2 p = (fragCoord * 2.0 - resolution) / minDim;
    vec2 m = vec2((mouse.x * 2.0 - 1.0) * (resolution.x / resolution.y), mouse.y * 2.0 - 1.0);

    float colorMagnitude = 0.5 + 0.5 * sin(time * 0.3);

    float t = sin(length(m - p) * 30.0 + time * 5.0);
    t += sin(length(p) * 30.0 + time * 5.0);
    t *= 0.5;

    vec3 gray = vec3(clamp(t * 0.5 + 0.5, 0.0, 1.0));
    float hue = fract(time * 0.05 + colorMagnitude * 0.6);
    vec3 hueColor = hsv2rgb(vec3(hue, 0.85, clamp(abs(t) * (0.6 + colorMagnitude), 0.0, 1.0)));

    vec3 color = mix(gray, hueColor, clamp(colorMagnitude, 0.0, 1.0));

    // Dimmed for background use — full strength is too loud behind text.
    color *= 0.5;

    gl_FragColor = vec4(color, 1.0);
}`;

const OP_ART_SHADER = `#ifdef GL_ES
precision highp float;
#endif

uniform float time;
uniform vec2 resolution;
uniform vec2 mouse;

vec3 opArtHsv(float h, float s, float v) {
    vec3 k = vec3(3.0, 2.0, 1.0) / 3.0;
    vec3 p = abs(fract(h + k) * 6.0 - 3.0) - 1.0;
    return mix(vec3(1.0), clamp(p, 0.0, 1.0), s) * v;
}

void main(void) {
    vec2 fragCoord = gl_FragCoord.xy;
    float colorMagnitude = 0.5 + 0.5 * sin(time * 0.3);

    float A = time * 0.30 + mouse.x * 6.0;
    float B = time * 0.21 + mouse.y * 6.0;
    float C = time * 0.17 + mouse.x * 3.0;
    float D = time * 0.13 + mouse.y * 3.0;
    float E = time * 0.11 + colorMagnitude * 4.0;

    vec2 uv = 2.0 * fragCoord / resolution - 1.0;
    uv.x *= 1.18;
    uv.y *= 1.05;

    uv *= length(uv * 0.23);
    uv += cos(uv.x * 24.0 + A) * sin(time + uv.y * 32.0 + B);
    uv += cos(time + uv.x * 16.0 + C) * sin(time + uv.x * 4.0 + D);
    uv *= sin(length(uv) * 2.0 + E);

    float r = length(uv);

    vec3 color = (1.0 - vec3(exp(r) - 1.1)) * opArtHsv(0.4 + r * 0.8, 1.0, 1.0);

    // Dimmed for background use — full strength is too loud behind text.
    color *= 0.5;

    gl_FragColor = vec4(color, 1.0);
}`;

export const FEVER_DREAM_SHADERS = [MOIRE_SHADER, OP_ART_SHADER];
