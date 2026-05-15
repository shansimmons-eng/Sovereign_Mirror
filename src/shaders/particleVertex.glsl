uniform float u_time;
uniform float u_boltzmann_temp;
uniform float u_boltzmann_noise;
uniform float u_inverion_alpha;

varying vec2 vUv;
varying float vIntensity;

float hash(vec3 p) {
    p = fract(p * 0.3183099 + .1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

void main() {
    vUv = uv;
    vec3 transformed = position;

    float instanceID = float(gl_InstanceID);
    float phase = hash(vec3(instanceID, instanceID * 1.3, instanceID * 2.7));

    float theta = u_time * (u_boltzmann_temp * 0.1) + (phase * 6.28318);
    float baseRadius = 2.0 * (1.0 - u_inverion_alpha);
    float fissionWave = sin(theta * 2.0) * (u_boltzmann_noise * 0.35);
    float calculatedRadius = baseRadius + fissionWave;
    float radius = clamp(calculatedRadius, 0.1, 2.0);

    vec3 orbitPos = vec3(cos(theta) * radius, sin(theta) * radius, sin(theta * phase) * 0.15);

    float noiseFactor = hash(orbitPos + vec3(u_time * 0.05));
    vec3 dispersalVector = vec3(cos(phase * 6.28), sin(phase * 6.28), phase * 0.1);

    if (u_inverion_alpha < 0.20) {
        float drift = (1.0 - u_inverion_alpha) * (u_boltzmann_noise * 0.5);
        transformed += orbitPos + (dispersalVector * noiseFactor * drift);
        vIntensity = u_inverion_alpha;
    } else {
        transformed += orbitPos + (dispersalVector * noiseFactor * u_boltzmann_noise * 0.2);
        vIntensity = 1.0;
    }

    vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
    gl_Position = projectionMatrix * mvPosition;
}