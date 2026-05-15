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
