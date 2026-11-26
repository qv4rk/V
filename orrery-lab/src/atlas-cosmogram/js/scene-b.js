import { CosmogramScene } from './scene-a.js';
import * as THREE from 'three';
import {
  getGeoCoordinates,
  altitudeAboveHorizon,
  horizontalCoordinates,
  PLANET_COLORS
} from './ephemeris.js';
import { latLonToVector3 } from './globeNodes.js';

const EARTH_R = 1;

Object.assign(CosmogramScene.prototype, {
setCameraMode(mode) {
this.mode = mode;
if (mode === 'planetary') {
this.camera = this.planetaryCam;
this.controls.enabled = true;
this.observerFrame.visible = false;
this.earth.visible = true;
this.eclipticGroup.visible = true;
this.nodes.group.visible = true;
this.planetGroup.visible = true;
if (this._natalGroup) this._natalGroup.visible = true;
} else {
this.camera = this.observerCam;
this.controls.enabled = false;
this.observerFrame.visible = true;
this.earth.visible = false;
this.eclipticGroup.visible = false;
this.nodes.group.visible = false;
if (this._natalGroup) this._natalGroup.visible = false;
this._placeObserverCamera();
this._updateObserverSkyBodies();
}
},
_placeObserverCamera() {
this.observerCam.position.set(-0.2, 0.35, 0);
this.observerCam.up.set(0, 1, 0);
this.observerCam.lookAt(2, 0.2, 0);
},
_updateObserverSkyBodies() {
const bodies = ['sun', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'];
for (const name of bodies) {
const alt = altitudeAboveHorizon(name, this.jd, this.observer.lat, this.observer.lon);
const mesh = this.planetMeshes[name];
if (!mesh) continue;
const g = getGeoCoordinates(name, this.jd);
const az = Math.atan2(g.y, g.x);
const altRad = alt * (Math.PI / 180);
const R = 2.2;
const cosAlt = Math.cos(altRad);
mesh.position.set(
R * cosAlt * Math.cos(az),
R * Math.sin(altRad),
R * cosAlt * Math.sin(az)
);
mesh.visible = true;
}
this.planetGroup.visible = true;
},
setNatalFreeze(jd, lat, lon, horizonIn) {
this._clearNatalMeshes();
this.natal = { jd, lat, lon };
const pos = latLonToVector3(lat, lon, EARTH_R * 1.03);
// Emissive coordinate beacon (natal site on Earth)
const beaconMat = new THREE.MeshStandardMaterial({
color: 0xff88bb,
emissive: 0xff3399,
emissiveIntensity: 2.2,
metalness: 0.1,
roughness: 0.35,
transparent: true,
opacity: 1
});
const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.045, 20, 20), beaconMat);
beacon.position.copy(pos);
beacon.userData = { type: 'natal-beacon' };
this._natalGroup.add(beacon);
const halo = new THREE.Mesh(
new THREE.SphereGeometry(0.09, 16, 16),
new THREE.MeshBasicMaterial({
color: 0xff66aa,
transparent: true,
opacity: 0.28,
depthWrite: false
})
);
halo.position.copy(pos);
halo.userData = { type: 'natal-beacon-halo' };
this._natalGroup.add(halo);
const pillar = new THREE.Mesh(
new THREE.CylinderGeometry(0.01, 0.01, 0.4, 8),
new THREE.MeshStandardMaterial({
color: 0xff66aa,
emissive: 0xff2288,
emissiveIntensity: 1.4,
transparent: true,
opacity: 0.85
})
);
pillar.position.copy(pos).normalize().multiplyScalar(EARTH_R * 1.2);
pillar.lookAt(0, 0, 0);
pillar.rotateX(Math.PI / 2);
pillar.userData = { type: 'natal-pillar' };
this._natalGroup.add(pillar);
const bodies = ['sun', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
const horizon = horizonIn ? { ...horizonIn } : {};
const prevJd = this.jd;
this.jd = jd;
this._updatePlanetPositions();
const ORBIT_SCALE = 0.55;
for (const name of bodies) {
if (!horizon[name]) {
const hc = horizontalCoordinates(name, jd, lat, lon);
horizon[name] = { altitude: hc.altitude, azimuth: hc.azimuth, above: hc.altitude > 0 };
}
let end = null;
const mesh = this.planetMeshes && this.planetMeshes[name];
if (mesh) {
end = mesh.position.clone();
} else {
// Celestial direction from geocentric coords when mesh not present (U/N)
const g = getGeoCoordinates(name, jd);
const raw = new THREE.Vector3(g.x, g.z, g.y);
if (raw.lengthSq() < 1e-12) continue;
const s = ORBIT_SCALE * (name === 'uranus' || name === 'neptune' ? 0.55 : 3.5);
end = raw.multiplyScalar(s);
if (end.length() < 1.5) end.setLength(2.4);
if (end.length() > 12) end.setLength(8);
}
const points = [pos.clone(), end];
const geo = new THREE.BufferGeometry().setFromPoints(points);
const color = horizon[name].above
? (PLANET_COLORS[name] || 0x66ffaa)
: 0x445566;
const line = new THREE.Line(
geo,
new THREE.LineBasicMaterial({ color, transparent: true, opacity: horizon[name].above ? 0.85 : 0.45 })
);
line.userData = { type: 'natal-ray', planet: name, above: horizon[name].above };
this._natalGroup.add(line);
}
this.jd = prevJd;
this._updatePlanetPositions();
this.natal.horizon = horizon;
this._natalGroup.visible = this.mode === 'planetary';
return horizon;
},
_clearNatalMeshes() {
while (this._natalGroup.children.length) {
const c = this._natalGroup.children[0];
this._natalGroup.remove(c);
if (c.geometry) c.geometry.dispose();
if (c.material) {
if (Array.isArray(c.material)) c.material.forEach((m) => m.dispose());
else c.material.dispose();
}
}
},
clearNatal() {
this._clearNatalMeshes();
this.natal = null;
},
updateTemporalHorizon(year) {
this.nodes.updateTemporalHorizon(year);
},
_onClick(event) {
if (this.mode !== 'planetary') return;
const rect = this.canvas.getBoundingClientRect();
this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
this.raycaster.setFromCamera(this.pointer, this.camera);
const hits = this.raycaster.intersectObjects(this.nodes.getClickables(), false);
if (hits.length && this.onNodeClick) {
this.onNodeClick(hits[0].object.userData);
}
},
_onResize() {
const w = window.innerWidth;
const h = window.innerHeight;
this.planetaryCam.aspect = w / h;
this.planetaryCam.updateProjectionMatrix();
this.observerCam.aspect = w / h;
this.observerCam.updateProjectionMatrix();
this.renderer.setSize(w, h);
},
animate() {
requestAnimationFrame(() => this.animate());
if (this.mode === 'planetary') {
this.controls.update();
} else {
this._updateObserverSkyBodies();
}
if (this.mode === 'planetary' && this.earth) {
this.earth.rotation.y += 0.0004;
}
this.renderer.render(this.scene, this.camera);
}
});

export { CosmogramScene };
export default CosmogramScene;
