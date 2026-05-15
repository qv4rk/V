index.html
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>3D Virtual Sketch Toolkit</title>
    <link rel="stylesheet" href="css/style.css">
    
    <script src="lib/three.min.js"></script>
    <script src="lib/STLExporter.js"></script>
    <script src="lib/mannequin.min.js"></script>
</head>
<body>
    <div id="status">INIT</div>
    
    <div id="ui-container">
        <div class="panel">
            <label>GRAPHITE HARDNESS</label>
            <select id="pencil-select">
                <option value="0.4,0.1,0x999999">8H (Hard / Fine / Light)</option>
                <option value="0.6,0.3,0x777777">4H (Firm / Medium-Light)</option>
                <option value="1.0,0.6,0x444444" selected>HB (Standard Sketch)</option>
                <option value="1.5,0.85,0x222222">4B (Soft / Broad / Dark)</option>
                <option value="2.5,1.0,0x050505">8B (Very Soft / Thick)</option>
                <option value="1.0,1.0,0x00d9ff">Neon Ink (Stylus)</option>
            </select>

            <label>3D BASE MODEL</label>
            <select id="model-select">
                <option value="male">Mannequin (Male)</option>
                <option value="female">Mannequin (Female)</option>
                <option value="child">Mannequin (Child)</option>
                <option value="canvas">Flat Canvas</option>
                <option value="tunnel">Shardoscope Tunnel</option>
            </select>
        </div>

        <div class="panel">
            <button id="btn-clear">Clear Sketch</button>
            <button id="btn-png">Export 4K PNG (Alpha)</button>
            <button id="btn-stl">Export STL</button>
        </div>
    </div>

    <div id="compass-container">
        <div id="compass-label">BRUSH ANGLE</div>
        <div id="compass-needle"></div>
    </div>

    <script type="module" src="js/main.js"></script>
</body>
</html>

```
css/style.css
```css
body { margin: 0; overflow: hidden; background: #000; touch-action: none; font-family: monospace; }
canvas { display: block; touch-action: none; }

#ui-container { position: absolute; top: 10px; right: 10px; z-index: 100; text-align: right; width: 220px; }
.panel { background: rgba(0, 0, 0, 0.7); border: 1px solid #00d9ff; padding: 10px; margin-bottom: 10px; pointer-events: auto; }

button, select { 
    background: #222; color: #00d9ff; border: 1px solid #00d9ff; 
    padding: 8px; margin-bottom: 8px; cursor: pointer; font-family: monospace; width: 100%; box-sizing: border-box;
}
button:hover, select:hover { background: #00d9ff; color: #000; }
label { color: #fff; font-size: 12px; display: block; margin-bottom: 4px; text-align: left; }

#compass-container {
    position: absolute; bottom: 20px; right: 20px; width: 100px; height: 100px;
    border-radius: 50%; border: 2px solid #00d9ff; background: rgba(0, 0, 0, 0.5);
    z-index: 100; cursor: pointer; pointer-events: auto;
}
#compass-needle {
    position: absolute; top: 50%; left: 50%; width: 4px; height: 40px;
    background: #ffaa00; transform-origin: bottom center;
    transform: translate(-50%, -100%) rotate(0deg);
}
#compass-label {
    position: absolute; top: -20px; left: 0; width: 100px; text-align: center; color: #ffaa00; font-size: 10px;
}

#status {
    position: absolute; top: 10px; left: 10px; color: #00d9ff; z-index: 100; pointer-events: none; white-space: pre-line;
    background: rgba(0,0,0,0.5); padding: 10px; border: 1px solid #00d9ff;
}

```
js/state.js
```javascript
export const state = {
    brushAngle: 0,
    currentPencil: { size: 1.0, opacity: 0.6, color: 0x444444 },
    prevTouches: [],
    compassDragging: false
};

export const domElements = {
    status: document.getElementById('status'),
    needle: document.getElementById('compass-needle'),
    compass: document.getElementById('compass-container'),
    pencilSelect: document.getElementById('pencil-select'),
    modelSelect: document.getElementById('model-select')
};

```
js/scene.js
```javascript
export const scene = new THREE.Scene();
export const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 2000);
export const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });

export const masterGroup = new THREE.Group();
export const baseMeshGroup = new THREE.Group();
export const inkGroup = new THREE.Group();

export function initScene() {
    camera.position.set(0, 0, 130);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(window.devicePixelRatio);
    document.body.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
    dirLight.position.set(1, 2, 3);
    scene.add(dirLight);

    masterGroup.add(baseMeshGroup);
    masterGroup.add(inkGroup);
    scene.add(masterGroup);
}

```
js/models.js
```javascript
import { baseMeshGroup, inkGroup, masterGroup } from './scene.js';
import { domElements } from './state.js';

export function clearInk() {
    while(inkGroup.children.length > 0) { 
        inkGroup.remove(inkGroup.children[0]); 
    }
}

export function loadModel() {
    const type = domElements.modelSelect.value;
    
    while(baseMeshGroup.children.length > 0) { 
        baseMeshGroup.remove(baseMeshGroup.children[0]); 
    }
    clearInk();
    masterGroup.rotation.set(0, 0, 0);

    if (type === 'male') {
        const man = new Male();
        man.scale.setScalar(25);
        man.position.y = -22;
        man.torso.turn = -25;
        man.r_arm.raise = 60;
        man.r_elbow.bend = 80;
        man.l_arm.straddle = 20;
        man.l_elbow.bend = 30;
        man.l_leg.raise = 25;
        man.l_knee.bend = 30;
        man.head.turn = 25;
        man.head.tilt = -10;
        baseMeshGroup.add(man);
    } else if (type === 'female') {
        const woman = new Female();
        woman.scale.setScalar(25);
        woman.position.y = -22;
        woman.torso.bend = 15;
        woman.r_arm.raise = 130;
        woman.r_elbow.bend = 120;
        woman.l_arm.straddle = -15;
        woman.r_leg.raise = 10;
        woman.l_leg.straddle = 15;
        woman.head.turn = -20;
        baseMeshGroup.add(woman);
    } else if (type === 'child') {
        const kid = new Child();
        kid.scale.setScalar(25);
        kid.position.y = -15;
        kid.r_arm.raise = 150;
        kid.l_arm.raise = 150;
        kid.r_elbow.bend = 20;
        kid.l_elbow.bend = 20;
        kid.head.tilt = -20;
        baseMeshGroup.add(kid);
    } else if (type === 'canvas') {
        const mat = new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.8 });
        const geo = new THREE.BoxGeometry(80, 100, 2);
        const mesh = new THREE.Mesh(geo, mat);
        baseMeshGroup.add(mesh);
    } else if (type === 'tunnel') {
        const cylMat = new THREE.MeshStandardMaterial({ color: 0x00d9ff, wireframe: true, side: THREE.DoubleSide });
        const geo = new THREE.CylinderGeometry(10, 12, 2, 6, 1, true);
        for (let i = 0; i < 150; i++) {
            const mesh = new THREE.Mesh(geo, cylMat);
            mesh.position.z = -i * 4;
            mesh.rotation.z = i * 0.15;
            mesh.rotation.x = Math.sin(i * 0.05) * 0.2; 
            mesh.rotation.y = Math.cos(i * 0.05) * 0.2;
            const scaleModifier = 1 + (i * 0.015);
            mesh.scale.set(scaleModifier, scaleModifier, 1);
            baseMeshGroup.add(mesh);
        }
    }
}

```
js/interaction.js
```javascript
import { scene, camera, baseMeshGroup, inkGroup, masterGroup, renderer } from './scene.js';
import { state, domElements } from './state.js';

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

export function updatePencil() {
    const val = domElements.pencilSelect.value.split(',');
    state.currentPencil = {
        size: parseFloat(val[0]),
        opacity: parseFloat(val[1]),
        color: parseInt(val[2], 16)
    };
}

export function setCompassAngle(x, y) {
    const rect = domElements.compass.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    state.brushAngle = Math.atan2(y - cy, x - cx) + Math.PI / 2;
    const deg = THREE.MathUtils.radToDeg(state.brushAngle);
    domElements.needle.style.transform = `translate(-50%, -100%) rotate(${deg}deg)`;
}

function getPinchDist(touches) {
    return Math.hypot(touches[0].pageX - touches[1].pageX, touches[0].pageY - touches[1].pageY);
}

function getCentroid(touches) {
    let x = 0, y = 0;
    for (let i = 0; i < touches.length; i++) {
        x += touches[i].pageX;
        y += touches[i].pageY;
    }
    return { x: x / touches.length, y: y / touches.length };
}

function drawInk(clientX, clientY) {
    mouse.x = (clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    
    const intersects = raycaster.intersectObjects(baseMeshGroup.children, true);
    if (intersects.length > 0) {
        const hit = intersects[0];
        const inkGeo = new THREE.SphereGeometry(state.currentPencil.size, 8, 8);
        inkGeo.scale(1, 0.15, 0.15); 
        
        const inkMat = new THREE.MeshBasicMaterial({ 
            color: state.currentPencil.color,
            transparent: true,
            opacity: state.currentPencil.opacity,
            depthWrite: false 
        });
        
        const inkMesh = new THREE.Mesh(inkGeo, inkMat);
        inkMesh.position.copy(hit.point);
        
        const normalMatrix = new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld);
        const worldNormal = hit.face.normal.clone().applyMatrix3(normalMatrix).normalize();
        const lookTarget = hit.point.clone().add(worldNormal);
        
        inkMesh.lookAt(lookTarget);
        inkMesh.rotateZ(state.brushAngle);
        inkMesh.position.add(worldNormal.multiplyScalar(0.1));
        
        scene.add(inkMesh);
        inkGroup.attach(inkMesh);
    }
}

export function handleTouch(e) {
    if(e.target.tagName === 'CANVAS') e.preventDefault();
    
    const touches = e.touches;
    const count = touches.length;
    let statusText = `${count} FINGER(S)\n`;

    if (count === 1) {
        statusText += "ACTION: SKETCHING";
        drawInk(touches[0].clientX, touches[0].clientY);
    } else if (count === 2) {
        statusText += "ACTION: PINCH ZOOM";
        const dist = getPinchDist(touches);
        if (state.prevTouches.length === 2) {
            const prevDist = getPinchDist(state.prevTouches);
            const delta = dist - prevDist;
            camera.position.z -= delta * 0.5;
        }
    } else if (count === 3) {
        statusText += "ACTION: 3D GIMBAL (WORLD)";
        const centroid = getCentroid(touches);
        if (state.prevTouches.length === 3) {
            const prevCentroid = getCentroid(state.prevTouches);
            const dx = centroid.x - prevCentroid.x;
            const dy = centroid.y - prevCentroid.y;
            masterGroup.rotation.y += dx * 0.01;
            masterGroup.rotation.x += dy * 0.01;
        }
    } else if (count === 4) {
        statusText += "ACTION: DRAG PAN";
        const centroid = getCentroid(touches);
        if (state.prevTouches.length === 4) {
            const prevCentroid = getCentroid(state.prevTouches);
            const dx = centroid.x - prevCentroid.x;
            const dy = centroid.y - prevCentroid.y;
            const vFOV = THREE.MathUtils.degToRad(camera.fov);
            const height = 2 * Math.tan(vFOV / 2) * camera.position.z;
            const width = height * camera.aspect;
            camera.position.x -= (dx / window.innerWidth) * width;
            camera.position.y += (dy / window.innerHeight) * height;
        }
    }

    domElements.status.innerText = statusText;
    state.prevTouches = Array.from(touches).map(t => ({ pageX: t.pageX, pageY: t.pageY }));
}

export function handleTouchEnd(e) {
    if(e.target.tagName === 'CANVAS') e.preventDefault();
    domElements.status.innerText = "STANDBY\nWAITING FOR INPUT";
    state.prevTouches = Array.from(e.touches).map(t => ({ pageX: t.pageX, pageY: t.pageY }));
}

```
js/export.js
```javascript
import { scene, camera, renderer, masterGroup } from './scene.js';

export function export4KPNG() {
    const targetWidth = 3840;
    const targetHeight = 2160;
    const originalWidth = window.innerWidth;
    const originalHeight = window.innerHeight;

    camera.aspect = targetWidth / targetHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(targetWidth, targetHeight);
    
    renderer.render(scene, camera);
    const dataURL = renderer.domElement.toDataURL('image/png');
    
    camera.aspect = originalWidth / originalHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(originalWidth, originalHeight);
    renderer.render(scene, camera);

    const link = document.createElement('a');
    link.download = '3d_sketch_4k.png';
    link.href = dataURL;
    link.click();
}

export function exportNormalizedSTL() {
    const originalPosition = masterGroup.position.clone();
    const originalScale = masterGroup.scale.clone();
    const originalRotation = masterGroup.rotation.clone();

    masterGroup.rotation.set(0, 0, 0);
    masterGroup.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(masterGroup);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    const maxDim = Math.max(size.x, size.y, size.z);
    const normalizationFactor = 1.0 / maxDim;

    masterGroup.scale.setScalar(normalizationFactor);
    masterGroup.position.sub(center.multiplyScalar(normalizationFactor));
    masterGroup.updateMatrixWorld(true);

    const exporter = new THREE.STLExporter();
    const stlString = exporter.parse(masterGroup);

    masterGroup.position.copy(originalPosition);
    masterGroup.scale.copy(originalScale);
    masterGroup.rotation.copy(originalRotation);
    masterGroup.updateMatrixWorld(true);

    const blob = new Blob([stlString], { type: 'text/plain' });
    const link = document.createElement('a');
    link.style.display = 'none';
    link.href = URL.createObjectURL(blob);
    link.download = '3d_sketch_normalized.stl';
    link.click();
}

```
js/main.js
```javascript
import { initScene, scene, camera, renderer, masterGroup } from './scene.js';
import { loadModel, clearInk } from './models.js';
import { handleTouch, handleTouchEnd, updatePencil, setCompassAngle } from './interaction.js';
import { export4KPNG, exportNormalizedSTL } from './export.js';
import { state, domElements } from './state.js';

function init() {
    initScene();
    loadModel();
    updatePencil();

    window.addEventListener('resize', onResize);
    
    const dom = renderer.domElement;
    dom.addEventListener('touchstart', handleTouch, { passive: false });
    dom.addEventListener('touchmove', handleTouch, { passive: false });
    dom.addEventListener('touchend', handleTouchEnd, { passive: false });
    dom.addEventListener('touchcancel', handleTouchEnd, { passive: false });

    domElements.compass.addEventListener('mousedown', () => state.compassDragging = true);
    window.addEventListener('mouseup', () => state.compassDragging = false);
    window.addEventListener('mousemove', (e) => {
        if (state.compassDragging) setCompassAngle(e.clientX, e.clientY);
    });
    
    domElements.compass.addEventListener('touchstart', (e) => {
        state.compassDragging = true;
        setCompassAngle(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: false });
    
    window.addEventListener('touchmove', (e) => {
        if (state.compassDragging) setCompassAngle(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: false });

    domElements.pencilSelect.addEventListener('change', updatePencil);
    domElements.modelSelect.addEventListener('change', loadModel);
    
    document.getElementById('btn-clear').addEventListener('click', clearInk);
    document.getElementById('btn-png').addEventListener('click', export4KPNG);
    document.getElementById('btn-stl').addEventListener('click', exportNormalizedSTL);

    animate();
}

function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    if(domElements.modelSelect.value === 'tunnel') {
        masterGroup.rotation.z -= 0.002;
    }
    renderer.render(scene, camera);
}

init();

```
