// ScaleOrrery: a Three.js group with the Sun, eight planets, their orbits,
// the Moon, Jupiter's four large moons and a visible/true scale toggle. It owns no clock, camera or renderer; the host
// calls setJulianDay() from its own time dial (the atlas TimeDial, or the demo
// page here). Planets do not spin: per-planet spin is GROK's open item.

import * as THREE from 'three';
import { PLANETS, heliocentric, orbitPath, eclipticToScene, poleToEcliptic, inValidRange } from './elements.js';
import {
  UNITS_PER_AU, RADIUS_KM, SATURN_RING_KM, SATURN_POLE, MODES, radiusUnits,
  moonOffsetUnits, moonRadiusUnits
} from './scale.js';
import { moonGeocentric, earthFromSun, MOON_MASS_FRACTION } from './moon.js';
import { galileanPosition } from './galilean.js';
import { mapFor, saturnRingMap } from './maps.js';
import { PLANET_COLORS } from '../../js/ephemeris.js';

const ORBIT_REFRESH_DAYS = 3652.5; // orbits drift slowly; redraw once a decade

// Moon name -> parent planet.
export const MOONS = { moon: 'earth', io: 'jupiter', europa: 'jupiter', ganymede: 'jupiter', callisto: 'jupiter' };

export class ScaleOrrery {
  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'scaleOrrery';
    this.mode = 'visible';
    this.jd = null;
    this._orbitJd = null;
    this.bodies = {};
    const loader = new THREE.TextureLoader();

    const sunMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    sunMat.map = mapFor('sun', sunMat, loader);
    this._addBody('sun', sunMat);
    // decay 0: light reaches Neptune undimmed (the source had falloff at 500 units).
    this.group.add(new THREE.PointLight(0xffffff, 2.2, 0, 0));
    this.group.add(new THREE.AmbientLight(0xffffff, 0.06));

    for (const name of PLANETS) {
      const mat = new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0 });
      mat.map = mapFor(name, mat, loader);
      const body = this._addBody(name, mat);
      body.orbit = new THREE.Line(
        new THREE.BufferGeometry(),
        new THREE.LineBasicMaterial({ color: PLANET_COLORS[name], transparent: true, opacity: 0.35 })
      );
      this.group.add(body.orbit);
    }
    for (const name of Object.keys(MOONS)) {
      const mat = new THREE.MeshStandardMaterial({ roughness: 0.95, metalness: 0 });
      mat.map = mapFor(name, mat, loader);
      this._addBody(name, mat).moonOf = MOONS[name];
    }
    this._addSaturnRing();
    this.setScaleMode('visible');
  }

  _addBody(name, material) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 32), material);
    mesh.name = name;
    mesh.userData = { type: 'planet', name };
    // A fixed-size dot so a body can still be found when it is sub-pixel.
    const marker = new THREE.Points(
      new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0], 3)),
      new THREE.PointsMaterial({ color: PLANET_COLORS[name] ?? 0xffffff, size: 5, sizeAttenuation: false })
    );
    const holder = new THREE.Group();
    holder.add(mesh, marker);
    this.group.add(holder);
    const body = { holder, mesh, marker };
    this.bodies[name] = body;
    return body;
  }

  _addSaturnRing() {
    const R = RADIUS_KM.saturn;
    const inner = SATURN_RING_KM.inner / R;
    const outer = SATURN_RING_KM.outer / R;
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(inner, outer, 128, 1),
      new THREE.MeshBasicMaterial({
        map: saturnRingMap(inner / outer),
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false
      })
    );
    // RingGeometry's normal is +Z; turn it to Saturn's pole in scene space.
    const pole = eclipticToScene(poleToEcliptic(SATURN_POLE.ra, SATURN_POLE.dec));
    ring.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(pole.x, pole.y, pole.z).normalize()
    );
    this.bodies.saturn.mesh.add(ring); // scales with Saturn
  }

  setScaleMode(mode) {
    this.mode = MODES[mode] ? mode : 'visible';
    for (const [name, body] of Object.entries(this.bodies)) {
      body.mesh.scale.setScalar(body.moonOf ? moonRadiusUnits(name, this.mode) : radiusUnits(name, this.mode));
      body.marker.visible = this.mode === 'true';
    }
    if (this.jd !== null) this.setJulianDay(this.jd); // moon spacing depends on mode
    return MODES[this.mode].label;
  }

  setJulianDay(jd) {
    this.jd = jd;
    // Table 1 gives the Earth-Moon barycentre; Earth's centre sits
    // 1/82.3 of the Moon's distance on the far side of it.
    const moonVec = moonGeocentric(jd);
    for (const name of PLANETS) {
      let h = heliocentric(name, jd);
      if (name === 'earth' && !inValidRange(jd)) {
        h = earthFromSun(jd); // already Earth's centre
      } else if (name === 'earth') {
        h.x -= MOON_MASS_FRACTION * moonVec.x;
        h.y -= MOON_MASS_FRACTION * moonVec.y;
        h.z -= MOON_MASS_FRACTION * moonVec.z;
      }
      const p = eclipticToScene(h, UNITS_PER_AU);
      this.bodies[name].holder.position.set(p.x, p.y, p.z);
    }
    for (const [name, parent] of Object.entries(MOONS)) {
      const v = name === 'moon' ? moonVec : galileanPosition(name, jd);
      const off = eclipticToScene(moonOffsetUnits(v, parent, this.mode));
      this.bodies[name].holder.position.copy(this.bodies[parent].holder.position).add(new THREE.Vector3(off.x, off.y, off.z));
    }
    if (this._orbitJd === null || Math.abs(jd - this._orbitJd) > ORBIT_REFRESH_DAYS) {
      this._drawOrbits(jd);
    }
  }

  _drawOrbits(jd) {
    this._orbitJd = jd;
    for (const name of PLANETS) {
      const pts = orbitPath(name, jd, 360).map((q) => {
        const s = eclipticToScene(q, UNITS_PER_AU);
        return new THREE.Vector3(s.x, s.y, s.z);
      });
      this.bodies[name].orbit.geometry.setFromPoints(pts);
    }
  }

  bodyPosition(name, target = new THREE.Vector3()) {
    return target.copy(this.bodies[name].holder.position);
  }

  bodyRadius(name) {
    return this.bodies[name].mesh.scale.x;
  }
}

export default ScaleOrrery;
