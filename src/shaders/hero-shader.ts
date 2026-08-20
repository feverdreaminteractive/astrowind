// Homepage hero background shaders. Cycle order matters here — see the
// click handler in HeroShaderBackground.tsx (a quiet, undocumented
// interaction rather than a visible control): purple smoke on load, then
// the grid quadrant warp, then the black/white XOR moiré, then the rainbow
// kaleidoscope, the op-art neon, and the RGB ring moiré.
import { DEFAULT_SHADER as RAINBOW_SHADER } from './default-shader';

// Default: domain-warped fBM noise ("Base Warp fBM" by Inigo Quilez,
// iquilezles.org/articles/warp), recolored from the original fiery colormap
// to a black-to-purple wash matching the site's accent palette.
const NEBULA_SHADER = `#ifdef GL_ES
precision highp float;
#endif

uniform float time;
uniform vec2 resolution;
uniform vec2 mouse;

vec4 colormap(float x) {
    vec3 black = vec3(0.0, 0.0, 0.0);
    vec3 deepPurple = vec3(0.29, 0.0, 0.51);
    vec3 brightPurple = vec3(0.545, 0.361, 0.965);
    vec3 col = mix(black, deepPurple, smoothstep(0.0, 0.5, x));
    col = mix(col, brightPurple, smoothstep(0.5, 1.0, x));
    return vec4(col, 1.0);
}

float rand(vec2 n) {
    return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
}

float noise(vec2 p){
    vec2 ip = floor(p);
    vec2 u = fract(p);
    u = u*u*(3.0-2.0*u);

    float res = mix(
        mix(rand(ip),rand(ip+vec2(1.0,0.0)),u.x),
        mix(rand(ip+vec2(0.0,1.0)),rand(ip+vec2(1.0,1.0)),u.x),u.y);
    return res*res;
}

const mat2 mtx = mat2( 0.80,  0.60, -0.60,  0.80 );

float fbm( vec2 p )
{
    float f = 0.0;

    f += 0.500000*noise( p + time  ); p = mtx*p*2.02;
    f += 0.031250*noise( p ); p = mtx*p*2.01;
    f += 0.250000*noise( p ); p = mtx*p*2.03;
    f += 0.125000*noise( p ); p = mtx*p*2.01;
    f += 0.062500*noise( p ); p = mtx*p*2.04;
    f += 0.015625*noise( p + sin(time) );

    return f/0.96875;
}

float pattern( in vec2 p )
{
    return fbm( p + fbm( p + fbm( p ) ) );
}

void main(void)
{
    vec2 uv = gl_FragCoord.xy / resolution.x;
    float shade = pattern(uv);
    gl_FragColor = vec4(colormap(shade).rgb, shade);
}`;

// Op-art bioluminescence: a wave-interference isoline pattern rendered as
// additive neon glow over black, in a shifting fluorescent palette. The
// loudest of the three — the easter egg's "you found the weird one."
const NEON_SHADER = `#ifdef GL_ES
precision highp float;
#endif

uniform float time;
uniform vec2 resolution;
uniform vec2 mouse;

vec3 bioPalette(float t) {
    vec3 a = vec3(0.5, 0.5, 0.5);
    vec3 b = vec3(0.5, 0.5, 0.5);
    vec3 c = vec3(1.0, 1.0, 1.0);
    vec3 d = vec3(0.0, 0.33, 0.67);
    return a + b * cos(6.28318 * (c * t + d));
}

// round() is GLSL ES 3.00+ only — this canvas uses WebGL1 (GLSL ES 1.00)
float round(float x) { return floor(x + 0.5); }
vec2 round(vec2 x) { return floor(x + 0.5); }

void main(void) {
    vec2 fragCoord = gl_FragCoord.xy;
    vec2 uv = 2.0 * (fragCoord - 0.5 * resolution) / resolution.y;

    vec3 color = vec3(0.0);

    float unitToInt = 0.05 * min(resolution.x, resolution.y);

    float t = time * 0.5;

    float w = 1.0;

    for (int i = 0; i < 4; ++i) {

        vec2 tp = round(abs(uv) * unitToInt);

        float legDist = sqrt(abs(4.0 * sin(2.0 * tp.x) + 4.0 * sin(2.0 * tp.y) - 100.0 * cos(t)));

        float d = abs(round(legDist) - legDist);

        float glow = 0.015 / (d + 0.005);

        glow = pow(glow, 1.5);

        float spatialPhase = (tp.x != 0.0 ? tp.y / tp.x : 0.0);
        vec3 layerCol = bioPalette(length(uv) * 0.2 + t * 0.2 + float(i)*0.3);

        vec3 dotColor = 0.8 + 0.2 * cos(vec3(0.0, 2.0, 4.0) + spatialPhase * 5.0);

        vec3 finalLayerCol = layerCol * dotColor;

        color += finalLayerCol * glow * w;

        w *= 0.6;
        t -= 0.15;
    }

    color = 1.0 - exp(-color * 1.5);

    color = pow(color, vec3(1.2));

    // Dim it down for a background — the raw version is a lot for a backdrop
    color *= 0.5;

    gl_FragColor = vec4(color, 1.0);
}`;

// Concentric-ring RGB moiré: two sets of rings — one static and centered,
// one orbiting — gate each other on and off as they drift in and out of
// phase, producing the interference pattern.
const MOIRE_SHADER = `#ifdef GL_ES
precision highp float;
#endif

uniform float time;
uniform vec2 resolution;
uniform vec2 mouse;

void main(void)
{
    vec2 u = gl_FragCoord.xy;
    vec2 uv = (2.0 * u - resolution) / resolution.y;

    float r1 = length(uv);
    float b1 = floor(r1 * 64.0);
    float m1 = mod(b1, 3.0);

    vec3 rgb = m1 < 1.0 ? vec3(1.0, 0.0, 0.0)
             : m1 < 2.0 ? vec3(0.0, 1.0, 0.0)
                        : vec3(0.0, 0.0, 1.0);

    float t = time * 0.5;
    vec2 o = 0.5 * vec2(1.0 + cos(t), sin(t));
    float r2 = length(uv - o);
    float msk = mod(floor(r2 * 64.0), 3.0);

    vec3 color = rgb * msk * 0.55;

    gl_FragColor = vec4(color, 1.0);
}`;

// Grid quadrant warp: four differently-combined coordinate grids (sum,
// single-axis, product), each rendered as glowing lines via a divide-by-sine
// blowup at integer boundaries, one grid per screen quadrant.
const GRID_SHADER = `#ifdef GL_ES
precision highp float;
#endif

uniform float time;
uniform vec2 resolution;
uniform vec2 mouse;

#define SCALE 20.0
#define PI radians(180.0)
#define G(c,v,t) mix(vec3(0), c, 1.0/sin(fract(v-t)*PI)*2.0);

void main(void) {
    vec2 fragCoord = gl_FragCoord.xy;
    vec2 uv = (fragCoord-0.5*resolution)/resolution.y*SCALE;

    uv *= abs(uv); // square the screen space (which roots the grids)
    float xp = sign(uv.x); // x polarity
    float yp = sign(uv.y); // y polarity
    vec2 u = abs(uv); // abs(uv) is used often enough to define it
    float t = time;
    vec3 rgb = vec3(0.01, 0.05, 0.1);

    // form grids
    vec3 xg = G(rgb, u.x, t); // x grid
    vec3 yg = G(rgb, u.y, t); // y grid
    vec3 sg = G(rgb, u.x+u.y, t); // sum grid
    vec3 mg = G(rgb, xp*yp*sqrt(u.x*u.y), t); // multiply grid

    vec3 col = vec3(0.0);
    if (xp > 0.0 && yp > 0.0) col = sg; // top right
    else if (xp < 0.0 && yp > 0.0) col = yg; // top left
    else if (xp < 0.0 && yp < 0.0) col = mg; // bottom left
    else if (xp > 0.0 && yp < 0.0) col = xg; // bottom right

    // Dimmed for background use — full strength blows out the hero text.
    gl_FragColor = vec4(col * 0.45, 1.0);
}`;

// Black-and-white moiré from two orbiting foci, XOR'd together. GLSL ES 1.00
// (WebGL1, what this canvas uses) has no bitwise operators at all, so the
// integer XOR is emulated bit-by-bit via mod/floor.
const XOR_MOIRE_SHADER = `#ifdef GL_ES
precision highp float;
#endif

uniform float time;
uniform vec2 resolution;
uniform vec2 mouse;

float xorInt(float a, float b) {
    float result = 0.0;
    float scale = 1.0;
    for (int i = 0; i < 12; i++) {
        float ab = mod(a, 2.0);
        float bb = mod(b, 2.0);
        result += mod(ab + bb, 2.0) * scale;
        a = floor(a / 2.0);
        b = floor(b / 2.0);
        scale *= 2.0;
    }
    return result;
}

vec4 moire(vec2 p) {
    float t = time;
    float ringwidth = 4.0;
    float a = 0.6;
    float b = 0.5;
    vec2 focus1 = vec2(a*cos(t/2.0)+b, a*sin(t/4.0)+b);
    vec2 focus2 = vec2(a*cos(t/3.0)+b, a*sin(t)+b);

    float d1 = floor(100.0 * distance(p, focus1));
    float d2 = floor(100.0 * distance(p, focus2));
    float interf = xorInt(d1, d2);
    interf = floor(interf / ringwidth);
    interf = mod(interf, 2.0);

    if (interf < 0.5) return vec4(vec3(0.0), 1.0);
    return vec4(vec3(0.4), 1.0); // dimmed for background use — full white is too loud
}

void main(void) {
    vec2 p = 2.0 * gl_FragCoord.xy / resolution.xy - 0.5;
    gl_FragColor = moire(p);
}`;

export const HERO_SHADERS = [NEBULA_SHADER, GRID_SHADER, XOR_MOIRE_SHADER, RAINBOW_SHADER, NEON_SHADER, MOIRE_SHADER];

// Kept for compatibility with anything importing the single default directly.
export const HERO_SHADER = NEBULA_SHADER;
