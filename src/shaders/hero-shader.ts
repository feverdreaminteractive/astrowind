// Homepage hero background — same kaleidoscope motion as the Shader Lab's
// default shader, but recolored to the site's purple/blue accent palette and
// dimmed for a subtle backdrop rather than a foreground effect.
export const HERO_SHADER = `#ifdef GL_ES
precision mediump float;
#endif

uniform float time;
uniform vec2 resolution;
uniform vec2 mouse;

void main(void) {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    vec2 center = vec2(0.5, 0.5);
    vec2 p = uv - center;

    float dist = length(p);
    float angle = atan(p.y, p.x);

    float mouseInfluence = length(mouse - uv) * 0.5;
    float t = time * 0.3 + mouseInfluence;

    float kaleidoscope = abs(sin(angle * 6.0 + t));
    kaleidoscope = mix(kaleidoscope, abs(cos(angle * 8.0 - t * 1.3)), 0.5);

    float gooey = sin(dist * 8.0 - t) * cos(angle * 4.0 + t * 0.7);
    gooey += sin(dist * 5.0 + t * 1.5) * 0.5;
    gooey = smoothstep(-1.0, 1.0, gooey);

    float pattern = kaleidoscope * gooey;
    pattern = mix(pattern, 1.0 - pattern, sin(time * 2.0) * 0.5 + 0.5);

    // Two theme colors — purple and blue, matching the site's accent palette
    vec3 purple = vec3(0.545, 0.361, 0.965); // Tailwind purple-500
    vec3 blue = vec3(0.231, 0.510, 0.965);   // Tailwind blue-500

    vec3 color = mix(purple, blue, pattern);

    float vignette = smoothstep(1.0, 0.3, dist);
    color *= vignette + 0.3;

    // Dim the whole effect — this is a backdrop, not the focal point
    color *= 0.28;

    gl_FragColor = vec4(color, 1.0);
}`;
