// The Shader Lab's default kaleidoscope shader. Shared so the homepage hero
// background can stay visually identical to it rather than drifting apart.
export const DEFAULT_SHADER = `#ifdef GL_ES
precision mediump float;
#endif

uniform float time;
uniform vec2 resolution;
uniform vec2 mouse;

float hash(float n) {
    return fract(sin(n) * 43758.5453123);
}

float noise(float x) {
    float i = floor(x);
    float f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(hash(i), hash(i + 1.0), f);
}

vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void main(void) {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    vec2 center = vec2(0.5, 0.5);
    vec2 p = uv - center;

    float dist = length(p);
    float angle = atan(p.y, p.x);

    float mouseInfluence = length(mouse - uv) * 0.5;
    float t = time * 0.5 + mouseInfluence;

    float kaleidoscope = abs(sin(angle * 6.0 + t));
    kaleidoscope = mix(kaleidoscope, abs(cos(angle * 8.0 - t * 1.3)), 0.5);

    float gooey = sin(dist * 8.0 - t) * cos(angle * 4.0 + t * 0.7);
    gooey += sin(dist * 5.0 + t * 1.5) * 0.5;
    gooey = smoothstep(-1.0, 1.0, gooey);

    float feedback = sin(time * 3.5) * 0.5 + 0.5;
    float strobe = step(0.5, mod(time * 4.0, 1.0));
    feedback = mix(feedback, strobe, 0.3);

    float pattern = kaleidoscope * gooey;
    pattern = mix(pattern, 1.0 - pattern, sin(time * 2.0) * 0.5 + 0.5);

    float hue = mod(angle / 6.28318 + dist * 2.0 - t * 0.8, 1.0);
    hue += sin(pattern * 3.14159 + t) * 0.2;

    float saturation = 0.7 + 0.3 * sin(t + dist * 5.0);
    float value = 0.5 + 0.4 * pattern + 0.1 * feedback;

    vec3 color = hsv2rgb(vec3(hue, saturation, value));

    float distortion = sin(dist * 10.0 - t * 2.0) * 0.1;
    color += vec3(distortion) * feedback;

    float vignette = smoothstep(1.0, 0.3, dist);
    color *= vignette + 0.3;

    float pulse = sin(time * 6.0) * 0.5 + 0.5;
    color = mix(color, vec3(1.0), pulse * 0.15 * strobe);

    gl_FragColor = vec4(color, 1.0);
}`;
