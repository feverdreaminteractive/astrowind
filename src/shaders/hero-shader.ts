// Homepage hero background — domain-warped fBM noise ("Base Warp fBM" by
// Inigo Quilez, iquilezles.org/articles/warp), recolored from the original
// fiery colormap to a black-to-purple wash matching the site's accent
// palette. Adapted from Shadertoy conventions (mainImage/iTime/iResolution)
// to this project's plain GLSL fragment shader format (main/time/resolution).
export const HERO_SHADER = `#ifdef GL_ES
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
