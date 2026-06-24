## File 2: shaders.js
export const VolumetricShader = {
    vertex: `
        varying vec3 vWorldPosition;
        varying vec2 vUv;
        void main() {
            vUv = uv;
            vec4 worldPosition = instanceMatrix * vec4(position, 1.0);
            vWorldPosition = worldPosition.xyz;
            gl_Position = projectionMatrix * viewMatrix * worldPosition;
        }
    `,
    fragment: `
        uniform vec3 fogColor;
        uniform float time;
        varying vec3 vWorldPosition;
        varying vec2 vUv;
        
        // Simplex noise function placeholder for performance
        float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
        
        void main() {
            float dist = length(cameraPosition - vWorldPosition);
            float alpha = smoothstep(500.0, 100.0, dist) * 0.4;
            
            // Core haze mixing
            vec2 st = vUv * 3.0;
            float noise = hash(floor(st + time * 0.1));
            
            vec3 finalColor = mix(fogColor, vec3(1.0, 0.7, 0.2), noise * 0.2);
            gl_FragColor = vec4(finalColor, alpha);
        }
    `
};
