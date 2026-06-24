## File 3: main.js
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { VolumetricShader } from './shaders.js';

const scene = new THREE.Scene();
const atmosColor = new THREE.Color(0xb5651d);
scene.background = atmosColor;
scene.fog = new THREE.FogExp2(atmosColor, 0.0025);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 4000);
camera.position.set(0, 55000, 0);

const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// Post-Processing Pipeline
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
bloomPass.threshold = 0.2;
bloomPass.strength = 1.2; 
bloomPass.radius = 0.5;
composer.addPass(bloomPass);

// Lighting
const ambient = new THREE.AmbientLight(0xffeedd, 0.8);
scene.add(ambient);
const sunLight = new THREE.DirectionalLight(0xffaa00, 5.0);
sunLight.position.set(1000, 56000, -2000);
scene.add(sunLight);

// Instanced Mesh for High-Density H2SO4 Clouds
const cloudCount = 50000;
const cloudGeo = new THREE.PlaneGeometry(300, 300);
const cloudMat = new THREE.ShaderMaterial({
    uniforms: {
        fogColor: { value: atmosColor },
        time: { value: 0.0 }
    },
    vertexShader: VolumetricShader.vertex,
    fragmentShader: VolumetricShader.fragment,
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending
});

const cloudMesh = new THREE.InstancedMesh(cloudGeo, cloudMat, cloudCount);
const dummy = new THREE.Object3D();

for (let i = 0; i < cloudCount; i++) {
    dummy.position.set(
        (Math.random() - 0.5) * 8000,
        53000 + Math.random() * 4000,
        (Math.random() - 0.5) * 8000
    );
    dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
    dummy.updateMatrix();
    cloudMesh.setMatrixAt(i, dummy.matrix);
}
scene.add(cloudMesh);

// Flight Dynamics
let pitch = 0, yaw = 0, targetPitch = 0, targetYaw = 0, velocity = 6.0;
window.addEventListener('mousemove', (e) => {
    targetYaw = -((e.clientX / window.innerWidth) * 2 - 1) * 1.2;
    targetPitch = ((e.clientY / window.innerHeight) * 2 - 1) * 1.2;
});

// Telemetry
const hudAlt = document.getElementById('alt');
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    cloudMat.uniforms.time.value += delta;

    pitch += (targetPitch - pitch) * 0.08;
    yaw += (targetYaw - yaw) * 0.08;

    camera.rotation.x = pitch;
    camera.rotation.y = yaw;
    camera.rotation.z = -yaw * 0.6; // Heavy banking

    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyQuaternion(camera.quaternion);
    direction.multiplyScalar(velocity);
    camera.position.add(direction);

    // Grid Repositioning Matrix Update
    const camZ = camera.position.z;
    const camX = camera.position.x;
    for (let i = 0; i < cloudCount; i++) {
        cloudMesh.getMatrixAt(i, dummy.matrix);
        dummy.position.setFromMatrixPosition(dummy.matrix);
        
        if (dummy.position.z > camZ + 1000) dummy.position.z -= 8000;
        if (dummy.position.z < camZ - 7000) dummy.position.z += 8000;
        if (dummy.position.x > camX + 4000) dummy.position.x -= 8000;
        if (dummy.position.x < camX - 4000) dummy.position.x += 8000;
        
        dummy.updateMatrix();
        cloudMesh.setMatrixAt(i, dummy.matrix);
    }
    cloudMesh.instanceMatrix.needsUpdate = true;

    hudAlt.innerText = (camera.position.y / 1000).toFixed(2);
    composer.render();
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
});

animate();


