// The real sky as a backdrop: the same star catalogue and constellation
// figures the Globe & sky page uses, placed on a huge sphere that travels
// with the camera. From anywhere in the solar system, Scorpius is where it
// really is, and "up" is the north pole of the planets' plane (the ecliptic).
import * as THREE from 'three';

const EPS = 23.4392911 * Math.PI / 180;           // J2000 obliquity
const DEG = Math.PI / 180;

// RA/Dec (J2000, degrees) -> unit vector in the scene (ecliptic, y up)
export function raDecToScene(ra, dec) {
  const cd = Math.cos(dec * DEG);
  const x = cd * Math.cos(ra * DEG), y = cd * Math.sin(ra * DEG), z = Math.sin(dec * DEG);
  const ye = y * Math.cos(EPS) + z * Math.sin(EPS);
  const ze = -y * Math.sin(EPS) + z * Math.cos(EPS);
  return new THREE.Vector3(x, ze, -ye);
}

export async function makeCosmos(radius) {
  const group = new THREE.Group();
  const [stars, west, cn, names] = await Promise.all([
    '/vendor/d3-celestial/stars.6.json',
    '/vendor/d3-celestial/constellations.lines.json',
    '/vendor/d3-celestial/constellations.lines.cn.json',
    '/vendor/d3-celestial/constellations.json',
  ].map(u => fetch(u).then(r => r.json()).catch(() => ({ features: [] }))));

  // Stars: brightness and colour from magnitude and B-V index
  const pos = [], col = [];
  const c = new THREE.Color();
  stars.features.forEach(f => {
    const [ra, dec] = f.geometry.coordinates, mag = f.properties.mag, bv = f.properties.bv || 0.6;
    const v = raDecToScene(ra, dec).multiplyScalar(radius);
    pos.push(v.x, v.y, v.z);
    const b = Math.max(0.15, Math.min(1, (6.5 - mag) / 6));
    c.setHSL(bv < 0.4 ? 0.6 : bv < 1 ? 0.13 : 0.06, bv < 0.4 ? 0.5 : 0.35, 0.35 + 0.6 * b);
    col.push(c.r * b * 1.4, c.g * b * 1.4, c.b * b * 1.4);
  });
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  sg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  group.add(new THREE.Points(sg, new THREE.PointsMaterial({ size: 2.2, sizeAttenuation: false, vertexColors: true, depthWrite: false })));

  const linesOf = (fc, color, opacity) => {
    const p = [];
    fc.features.forEach(f => (f.geometry.coordinates || []).forEach(line => {
      for (let k = 1; k < line.length; k++) {
        const a = raDecToScene(...line[k - 1]).multiplyScalar(radius * 0.995);
        const b = raDecToScene(...line[k]).multiplyScalar(radius * 0.995);
        p.push(a.x, a.y, a.z, b.x, b.y, b.z);
      }
    }));
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    return new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false }));
  };
  const western = linesOf(west, 0x7f9cc0, 0.35);
  const chinese = linesOf(cn, 0xe0664f, 0.35);
  chinese.visible = false;
  group.add(western, chinese);

  // Constellation centres, for "what's ahead / below" readouts and labels
  const centres = names.features.map(f => ({
    name: f.properties.name,
    dir: raDecToScene(f.geometry.coordinates[0], f.geometry.coordinates[1]),
  }));

  // The ecliptic, drawn faintly: the planets' plane, where the zodiac lives
  const ecl = [];
  for (let k = 0; k <= 256; k++) {
    const a = k / 256 * Math.PI * 2;
    ecl.push(new THREE.Vector3(Math.cos(a) * radius * 0.99, 0, Math.sin(a) * radius * 0.99));
  }
  group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(ecl),
    new THREE.LineBasicMaterial({ color: 0xc9a84c, transparent: true, opacity: 0.18, depthWrite: false })));

  group.renderOrder = -1;
  return {
    group, centres,
    setCulture(which) {
      western.visible = which !== 'chinese';
      chinese.visible = which !== 'western';
    },
    nearest(dir) {
      let best = null, bd = -2;
      for (const c of centres) {
        const d = c.dir.dot(dir);
        if (d > bd) { bd = d; best = c; }
      }
      return best ? best.name : '—';
    },
  };
}
