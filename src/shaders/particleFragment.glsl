varying vec2 vUv;
varying float vIntensity;

void main() {
    float dist = length(vUv - vec2(0.5));
    if (dist > 0.5) discard;

    float alphaMask = smoothstep(0.5, 0.2, dist);

    vec3 coreWhite = vec3(1.0, 1.0, 1.0);
    vec3 amberGlow = vec3(1.0, 0.7, 0.1);
    vec3 deepCopper = vec3(0.9, 0.3, 0.0);

    vec3 finalColor = mix(deepCopper, amberGlow, vIntensity);
    if (vIntensity > 0.8) {
        finalColor = mix(finalColor, coreWhite, (vIntensity - 0.8) * 5.0);
    }

    gl_FragColor = vec4(finalColor * (vIntensity * 2.5), alphaMask);
}