import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
getAllBodies,
getGeoCoordinates,
altitudeAboveHorizon,
PLANET_COLORS
} from './ephemeris.js';
import { ArticleNodeManager, latLonToVector3 } from './globeNodes.js';
const EARTH_R = 1;
const ORBIT_SCALE = 0.55;
export class CosmogramScene {
constructor(canvas) {
this.canvas = canvas;
this.mode = 'planetary';
this.jd = 2451545.0;
this.observer = { lat: 40.7, lon: -74.0 };
this.natal = null;
this.renderer = new THREE.WebGLRenderer({
canvas,
antialias: true,
alpha: false
});
this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
this.renderer.setSize(window.innerWidth, window.innerHeight);
this.renderer.setClearColor(0x050810, 1);
this.scene = new THREE.Scene();
this.planetaryCam = new THREE.PerspectiveCamera(
45,
window.innerWidth / window.innerHeight,
0.05,
500
);
this.planetaryCam.position.set(0, 2.2, 5.5);
this.observerCam = new THREE.PerspectiveCamera(
70,
window.innerWidth / window.innerHeight,
0.01,
200
);
this.camera = this.planetaryCam;
this.controls = new OrbitControls(this.planetaryCam, canvas);
this.controls.enableDamping = true;
this.controls.dampingFactor = 0.06;
this.controls.minDistance = 1.4;
this.controls.maxDistance = 40;
this.controls.target.set(0, 0, 0);
this._buildLights();
this._buildEarth();
this._buildEclipticGrid();
this._buildPlanets();
this._buildObserverFrame();
this._buildStars();
this.nodes = new ArticleNodeManager(this.scene, EARTH_R);
this.raycaster = new THREE.Raycaster();
this.pointer = new THREE.Vector2();
this._onClick = this._onClick.bind(this);
canvas.addEventListener('pointerdown', this._onClick);
this._natalGroup = new THREE.Group();
this._natalGroup.name = 'natal';
this.scene.add(this._natalGroup);
this.onNodeClick = null;
this._clock = new THREE.Clock();
window.addEventListener('resize', () => this._onResize());
}
_buildLights() {
const amb = new THREE.AmbientLight(0x334455, 0.55);
this.scene.add(amb);
this.sunLight = new THREE.DirectionalLight(0xfff0dd, 1.35);
this.sunLight.position.set(5, 2, 3);
this.scene.add(this.sunLight);
}
_buildEarth() {
const geo = new THREE.SphereGeometry(EARTH_R, 64, 48);
const loader = new THREE.TextureLoader();
loader.crossOrigin = 'anonymous';
const mat = new THREE.MeshPhongMaterial({
color: 0x1a4a7a,
emissive: 0x021018,
specular: 0x335566,
shininess: 12,
flatShading: false
});
this.earth = new THREE.Mesh(geo, mat);
this.earth.name = 'earth';
this.scene.add(this.earth);
const atm = new THREE.Mesh(
new THREE.SphereGeometry(EARTH_R * 1.025, 48, 32),
new THREE.MeshBasicMaterial({
color: 0x4a9eff,
transparent: true,
opacity: 0.08,
side: THREE.BackSide
})
);
this.scene.add(atm);
const urls = [
'https://unpkg.com/three-globe@2.31.0/example/img/earth-blue-marble.jpg',
'https://cdn.jsdelivr.net/npm/three-globe@2.31.0/example/img/earth-blue-marble.jpg'
];
let i = 0;
const tryLoad = () => {
if (i >= urls.length) {
mat.color.set(0x1a5530);
mat.emissive.set(0x0a2040);
return;
}
loader.load(
urls[i++],
(tex) => {
tex.colorSpace = THREE.SRGBColorSpace;
mat.map = tex;
mat.color.set(0xffffff);
mat.needsUpdate = true;
},
undefined,
() => tryLoad()
);
};
tryLoad();
}
_buildEclipticGrid() {
this.eclipticGroup = new THREE.Group();
this.eclipticGroup.name = 'ecliptic';
const r = 8;
const pts = [];
for (let a = 0; a <= 64; a++) {
const t = (a / 64) * Math.PI * 2;
pts.push(new THREE.Vector3(Math.cos(t) * r, 0, Math.sin(t) * r));
}
const curve = new THREE.BufferGeometry().setFromPoints(pts);
const line = new THREE.Line(
curve,
new THREE.LineBasicMaterial({ color: 0x3a5a6a, transparent: true, opacity: 0.45 })
);
this.eclipticGroup.add(line);
for (const au of [0.4, 0.7, 1.0, 1.5, 5.2]) {
const ringPts = [];
const rr = au * ORBIT_SCALE * 4;
for (let a = 0; a <= 72; a++) {
const t = (a / 72) * Math.PI * 2;
ringPts.push(new THREE.Vector3(Math.cos(t) * rr, 0, Math.sin(t) * rr));
}
const g = new THREE.BufferGeometry().setFromPoints(ringPts);
this.eclipticGroup.add(
new THREE.Line(
g,
new THREE.LineBasicMaterial({ color: 0x1e3040, transparent: true, opacity: 0.25 })
)
);
}
this.scene.add(this.eclipticGroup);
}
_buildPlanets() {
this.planetMeshes = {};
this.planetGroup = new THREE.Group();
this.planetGroup.name = 'planets';
const bodies = ['sun', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'];
for (const name of bodies) {
const size = name === 'sun' ? 0.12 : name === 'jupiter' ? 0.08 : name === 'saturn' ? 0.07 : 0.04;
const mesh = new THREE.Mesh(
new THREE.SphereGeometry(size, 16, 16),
new THREE.MeshBasicMaterial({
color: PLANET_COLORS[name] || 0xffffff,
transparent: true,
opacity: 0.95
})
);
mesh.userData = { type: 'planet', name };
this.planetMeshes[name] = mesh;
this.planetGroup.add(mesh);
if (name === 'sun') {
const glow = new THREE.PointLight(0xffeeaa, 1.2, 30);
mesh.add(glow);
}
}
this.scene.add(this.planetGroup);
}
_buildObserverFrame() {
this.observerFrame = new THREE.Group();
this.observerFrame.name = 'observerFrame';
this.observerFrame.visible = false;
const hPts = [];
for (let a = 0; a <= 64; a++) {
const t = (a / 64) * Math.PI * 2;
hPts.push(new THREE.Vector3(Math.cos(t) * 2.5, 0, Math.sin(t) * 2.5));
}
this.observerFrame.add(
new THREE.Line(
new THREE.BufferGeometry().setFromPoints(hPts),
new THREE.LineBasicMaterial({ color: 0x88aacc, transparent: true, opacity: 0.7 })
)
);
const zGeo = new THREE.SphereGeometry(0.05, 8, 8);
const zenith = new THREE.Mesh(zGeo, new THREE.MeshBasicMaterial({ color: 0x00e5ff }));
zenith.position.set(0, 2.2, 0);
zenith.userData.label = 'zenith';
this.observerFrame.add(zenith);
const nadir = new THREE.Mesh(zGeo, new THREE.MeshBasicMaterial({ color: 0x6644aa }));
nadir.position.set(0, -2.2, 0);
nadir.userData.label = 'nadir';
this.observerFrame.add(nadir);
const rising = new THREE.Mesh(
new THREE.ConeGeometry(0.06, 0.18, 8),
new THREE.MeshBasicMaterial({ color: 0xc9a84c })
);
rising.position.set(2.4, 0.05, 0);
rising.rotation.z = -Math.PI / 2;
rising.userData.label = 'rising';
this.observerFrame.add(rising);
const ground = new THREE.Mesh(
new THREE.CircleGeometry(2.5, 48),
new THREE.MeshBasicMaterial({
color: 0x0a1520,
transparent: true,
opacity: 0.55,
side: THREE.DoubleSide
})
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.01;
this.observerFrame.add(ground);
this.scene.add(this.observerFrame);
}
_buildStars() {
const count = 1200;
const positions = new Float32Array(count * 3);
for (let i = 0; i < count; i++) {
const r = 40 + Math.random() * 60;
const theta = Math.random() * Math.PI * 2;
const phi = Math.acos(2 * Math.random() - 1);
positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
positions[i * 3 + 1] = r * Math.cos(phi);
positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
}
const geo = new THREE.BufferGeometry();
geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
this.scene.add(
new THREE.Points(
geo,
new THREE.PointsMaterial({ color: 0xaabbcc, size: 0.04, sizeAttenuation: true, transparent: true, opacity: 0.7 })
)
);
}
setJulianDay(jd) {
this.jd = jd;
this._updatePlanetPositions();
}
setObserver(lat, lon) {
this.observer.lat = lat;
this.observer.lon = lon;
this._placeObserverCamera();
}
_updatePlanetPositions() {
const bodies = ['sun', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'];
for (const name of bodies) {
const g = getGeoCoordinates(name, this.jd);
const mesh = this.planetMeshes[name];
if (!mesh) continue;
const s = ORBIT_SCALE * (name === 'jupiter' || name === 'saturn' ? 1.2 : 3.5);
mesh.position.set(g.x * s, g.z * s, g.y * s);
}
const sun = this.planetMeshes.sun;
if (sun) {
this.sunLight.position.copy(sun.position).normalize().multiplyScalar(10);
}
if (this.earth) {
const cal = this.jd;
this.earth.rotation.y = ((cal % 1) * Math.PI * 2) + this.observer.lon * (Math.PI / 180);
}
}

setCameraMode(mode) { /* extended in scene-b */ }
_placeObserverCamera() {}
_updateObserverSkyBodies() {}
setNatalFreeze() { return {}; }
clearNatal() {}
updateTemporalHorizon(year) { this.nodes.updateTemporalHorizon(year); }
_onClick() {}
_onResize() {}
animate() { requestAnimationFrame(() => this.animate()); this.renderer.render(this.scene, this.camera); }
}
export default CosmogramScene;
