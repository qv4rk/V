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
