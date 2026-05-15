uniform float u_time;
uniform float u_inverion_alpha;
uniform float u_boltzmann_temp;
uniform float u_boltzmann_noise;

attribute float instancePhase;
attribute vec3 instanceVelocity;

varying float v_alpha;
varying vec3 v_color;

void main() {
    vec3 pos = position;
    vec3 iPos = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;

    float decayThreshold = 0.15;
    float alpha = u_inverion_alpha;

    if (alpha < decayThreshold) {
        float drift = (1.0 - alpha) * u_time * (u_boltzmann_noise + 0.1);
        vec3 escapeDir = normalize(instanceVelocity + vec3(instancePhase * 0.1));
        iPos += escapeDir * drift;
    } else {
        float theta = u_time * u_boltzmann_temp * instancePhase;
        float R_inner = 0.5 + alpha * 2.0;
        iPos.x += cos(theta) * R_inner;
        iPos.y += sin(theta) * R_inner;
    }

    v_alpha = 0.3 + alpha * 0.7;
    v_color = mix(vec3(1.0, 0.3, 0.1), vec3(1.0, 0.8, 0.2), alpha);

    vec4 mvPosition = viewMatrix * modelMatrix * vec4(iPos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
}