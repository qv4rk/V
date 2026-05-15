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
