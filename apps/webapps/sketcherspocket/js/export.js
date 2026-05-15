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
