// Local horizon for the natal / observer point: true azimuths, the
// Ascendant, and labelled Zenith / Nadir / ASC / N-E-S-W markers, both in the
// observer view and as a ring on the globe at the beacon.
// Additive: extends CosmogramScene from scene-b.js without editing it.
import * as THREE from 'three';
import { CosmogramScene } from './scene-b.js';
import { getGeoCoordinates, altitudeAboveHorizon } from './ephemeris.js';
import { latLonToVector3 } from './globeNodes.js';

const DEG = Math.PI / 180, EPS = 23.4393 * DEG;
const wrap = x => ((x % 360) + 360) % 360;

function lstDeg(jd, lon) {
  return wrap(280.46061837 + 360.98564736629 * (jd - 2451545.0) + lon);
}
function eqFromEcl(x, y, z) {
  const ye = y * Math.cos(EPS) - z * Math.sin(EPS), ze = y * Math.sin(EPS) + z * Math.cos(EPS);
  return { ra: Math.atan2(ye, x), dec: Math.atan2(ze, Math.hypot(x, ye)) };
}
// Altitude/azimuth (degrees; azimuth from north through east)
function altAz(ra, dec, jd, lat, lon) {
  const H = lstDeg(jd, lon) * DEG - ra, phi = lat * DEG;
  const alt = Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H));
  const az = Math.atan2(-Math.sin(H), Math.tan(dec) * Math.cos(phi) - Math.sin(phi) * Math.cos(H));
  return { alt: alt / DEG, az: wrap(az / DEG) };
}
export function bodyAltAz(name, jd, lat, lon) {
  const g = getGeoCoordinates(name, jd), e = eqFromEcl(g.x, g.y, g.z);
  return altAz(e.ra, e.dec, jd, lat, lon);
}
// Ascendant: the ecliptic degree rising on the eastern horizon
export function ascendant(jd, lat, lon) {
  const ramc = lstDeg(jd, lon) * DEG, phi = lat * DEG;
  const lam = Math.atan2(Math.cos(ramc), -(Math.sin(ramc) * Math.cos(EPS) + Math.tan(phi) * Math.sin(EPS)));
  const ra = Math.atan2(Math.sin(lam) * Math.cos(EPS), Math.cos(lam)), dec = Math.asin(Math.sin(lam) * Math.sin(EPS));
  const SIGNS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
  const L = wrap(lam / DEG);
  return { longitude: L, sign: SIGNS[Math.floor(L / 30)], degree: L % 30, azimuth: altAz(ra, dec, jd, lat, lon).az };
}

// Observer frame: y = zenith, -z = north, +x = east
const azAltToVec = (az, alt, R) => new THREE.Vector3(
  R * Math.cos(alt * DEG) * Math.sin(az * DEG), R * Math.sin(alt * DEG), -R * Math.cos(alt * DEG) * Math.cos(az * DEG));

function textSprite(text, color, size = 0.22) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 64;
  const g = c.getContext('2d');
  g.font = '600 30px ui-monospace, Menlo, monospace';
  g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowColor = '#000'; g.shadowBlur = 6;
  g.fillText(text, 128, 32);
  const t = new THREE.CanvasTexture(c);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: false }));
  s.scale.set(size * 4, size, 1);
  s.renderOrder = 10;
  return s;
}

Object.assign(CosmogramScene.prototype, {
  _ensureHorizonMarkers() {
    if (this._hz) return this._hz;
    const f = this.observerFrame;
    // Remove the placeholder rising cone; the real Ascendant replaces it
    f.children.filter(o => o.userData && o.userData.label === 'rising').forEach(o => f.remove(o));
    const hz = { ascMarker: new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.2, 12), new THREE.MeshBasicMaterial({ color: 0xc9a84c })) };
    hz.ascLabel = textSprite('ASC', '#c9a84c');
    f.add(hz.ascMarker, hz.ascLabel);
    const zl = textSprite('ZENITH', '#00e5ff'); zl.position.set(0, 2.45, 0); f.add(zl);
    const nl = textSprite('NADIR', '#8a70d0'); nl.position.set(0, -2.45, 0); f.add(nl);
    [['N', 0], ['E', 90], ['S', 180], ['W', 270]].forEach(([t, az]) => {
      const s = textSprite(t, '#88aacc', 0.18);
      s.position.copy(azAltToVec(az, 2, 2.75));
      f.add(s);
    });
    hz.bodyLabels = {};
    return (this._hz = hz);
  },

  _placeObserverCamera() {
    this._ensureHorizonMarkers();
    const cam = this.observerCam;
    cam.position.set(0, 0.35, 0);
    cam.up.set(0, 1, 0);
    const a = this.observer && this.jd ? ascendant(this.jd, this.observer.lat, this.observer.lon) : { azimuth: 90 };
    cam.lookAt(azAltToVec(a.azimuth, 12, 2.5));   // face the rising point, a little above the horizon
  },

  // True azimuths (the scene-b version used ecliptic x/y as azimuth)
  _updateObserverSkyBodies() {
    const hz = this._ensureHorizonMarkers(), { lat, lon } = this.observer;
    for (const name of ['sun', 'mercury', 'venus', 'mars', 'jupiter', 'saturn']) {
      const mesh = this.planetMeshes[name];
      if (!mesh) continue;
      const { alt, az } = bodyAltAz(name, this.jd, lat, lon);
      mesh.position.copy(azAltToVec(az, alt, 2.2));
      mesh.visible = true;
      if (!hz.bodyLabels[name]) { hz.bodyLabels[name] = textSprite(name.toUpperCase(), '#d8dde6', 0.14); this.scene.add(hz.bodyLabels[name]); }
      hz.bodyLabels[name].position.copy(mesh.position).add(new THREE.Vector3(0, 0.14, 0));
      hz.bodyLabels[name].visible = this.mode !== 'planetary';
    }
    const a = ascendant(this.jd, lat, lon);
    hz.ascMarker.position.copy(azAltToVec(a.azimuth, 0, 2.4));
    hz.ascMarker.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), azAltToVec(a.azimuth, 0, 1));
    hz.ascLabel.position.copy(azAltToVec(a.azimuth, 6, 2.55));
    this.ascendantInfo = a;
    this.planetGroup.visible = true;
  },
});

// On the globe: a horizon ring around the natal beacon, zenith and nadir
// lines, and an arrow toward the Ascendant along the ground.
const _setNatal = CosmogramScene.prototype.setNatalFreeze;
CosmogramScene.prototype.setNatalFreeze = function (jd, lat, lon, horizonIn) {
  const horizon = _setNatal.call(this, jd, lat, lon, horizonIn) || {};
  this.observer = { lat, lon };
  const R = 1.03, p = latLonToVector3(lat, lon, R), up = p.clone().normalize();
  const north = latLonToVector3(lat + 0.01, lon, R).sub(p).normalize();
  const east = latLonToVector3(lat, lon + 0.01, R).sub(p).normalize();
  const onGround = (az, r) => p.clone().addScaledVector(north, r * Math.cos(az * DEG)).addScaledVector(east, r * Math.sin(az * DEG));

  const ring = [];
  for (let k = 0; k <= 72; k++) ring.push(onGround(k * 5, 0.28));
  this._natalGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(ring),
    new THREE.LineBasicMaterial({ color: 0x88aacc, transparent: true, opacity: 0.9 })));
  const seg = (a, b, color) => this._natalGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([a, b]),
    new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.85 })));
  seg(p, p.clone().addScaledVector(up, 0.55), 0x00e5ff);                    // zenith
  seg(p, p.clone().addScaledVector(up, -2.06), 0x8a70d0);                   // nadir, through Earth
  const a = ascendant(jd, lat, lon);
  seg(p, onGround(a.azimuth, 0.42), 0xc9a84c);                              // toward the Ascendant
  const put = (text, color, at) => { const s = textSprite(text, color, 0.07); s.position.copy(at); this._natalGroup.add(s); };
  put('ZENITH', '#00e5ff', p.clone().addScaledVector(up, 0.62));
  put('ASC ' + a.sign.slice(0, 3).toUpperCase(), '#c9a84c', onGround(a.azimuth, 0.52));
  put('N', '#88aacc', onGround(0, 0.34));
  Object.defineProperty(horizon, 'ascendant', { value: a, enumerable: false });   // keeps formatHorizon's loop unchanged
  return horizon;
};

export { CosmogramScene };
export default CosmogramScene;
