import * as THREE from 'three';
import { moonOfDate, sunOfDate } from 'https://qv4rk.github.io/GrokBotPlayground/atlas-cosmogram/proposals/scale-orrery/moon.js';
import { MAPS } from 'https://qv4rk.github.io/GrokBotPlayground/atlas-cosmogram/js/textures.js';
import {
  ECLIPSE_1999, nasa1999Body, equatorialVector, topocentric,
  localDirection, precessJ2000, eclipticJ2000ToEquatorial,
  vectorToRaDec, angularSeparation
} from './sky-math.js';

const DEG = Math.PI / 180;
const AU_KM = 149597870.7;
const DATA = 'https://cdn.jsdelivr.net/gh/ofrohn/d3-celestial@7e720a3de062059d4c5400a379146a601d9010e0/data/';
const PLANETS = ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
const COLORS = { mercury:0xc5c5bb, venus:0xffe6aa, mars:0xe08360,
  jupiter:0xe1c99e, saturn:0xd7c99a, uranus:0x95e0db, neptune:0x739fee };

function eclipticOfDate(lon, lat, distance, jd) {
  const l = lon * DEG, b = lat * DEG;
  const p = { x:distance * Math.cos(b) * Math.cos(l),
    y:distance * Math.cos(b) * Math.sin(l), z:distance * Math.sin(b) };
  const e = (23.439291 - 0.0130042 * ((jd - 2451545) / 36525)) * DEG;
  return vectorToRaDec({ x:p.x, y:p.y*Math.cos(e)-p.z*Math.sin(e),
    z:p.y*Math.sin(e)+p.z*Math.cos(e) });
}

function vectorAt(body, jd, lat, lon) {
  const p = topocentric(body.ra, body.dec, body.distance, jd, lat, lon);
  return { vector:p, local:localDirection(p, jd, lat, lon),
    radius:body.radius * body.distance / Math.hypot(p.x, p.y, p.z) };
}

export class ObserverSky {
  constructor(width, height) {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(70, width / height, 0.01, 300);
    this.camera.position.set(0, 0, 0);
    this.camera.up.set(0, 1, 0);
    this.jd = ECLIPSE_1999.jd;
    this.lat = ECLIPSE_1999.lat;
    this.lon = ECLIPSE_1999.lon;
    this.stars = [];
    this.lines = [];
    this.starGeometry = new THREE.BufferGeometry();
    this.starPoints = new THREE.Points(this.starGeometry,
      new THREE.PointsMaterial({ size:2, sizeAttenuation:false, vertexColors:true, transparent:true, opacity:0.9 }));
    this.scene.add(this.starPoints);
    this.lineGeometry = new THREE.BufferGeometry();
    this.lineMesh = new THREE.LineSegments(this.lineGeometry,
      new THREE.LineBasicMaterial({ color:0x81b8d7, transparent:true, opacity:0.38, depthWrite:false }));
    this.scene.add(this.lineMesh);
    const horizon = [];
    for (let i=0; i<=180; i++) {
      const a = i * Math.PI / 90;
      horizon.push(new THREE.Vector3(80*Math.cos(a), 0, 80*Math.sin(a)));
    }
    this.scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(horizon),
      new THREE.LineBasicMaterial({ color:0x7a9ba5, transparent:true, opacity:0.5 })));
    this.sun = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32),
      new THREE.MeshBasicMaterial({ color:0xffe0a0 }));
    this.moon = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32),
      new THREE.MeshBasicMaterial({ color:0xe3e0d9 }));
    const lunarMap = new THREE.TextureLoader().load(MAPS.lunarSurface);
    lunarMap.colorSpace = THREE.SRGBColorSpace;
    this.moon.material.map = lunarMap;
    this.scene.add(this.sun, this.moon);
    this.eclipseRim = new THREE.Mesh(
      new THREE.RingGeometry(1,1.35,64),
      new THREE.MeshBasicMaterial({ color:0xfff0cb, transparent:true, opacity:0.48,
        side:THREE.DoubleSide, depthWrite:false }));
    this.scene.add(this.eclipseRim);
    this.planets = new Map();
    for (const name of PLANETS) {
      const dot = new THREE.Points(
        new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([0,0,0],3)),
        new THREE.PointsMaterial({ color:COLORS[name], size:5, sizeAttenuation:false }));
      this.scene.add(dot);
      this.planets.set(name, dot);
    }
    this.ready = this.loadCatalog();
  }

  async loadCatalog() {
    try {
      const responses = await Promise.all(['stars.6.json', 'constellations.lines.json']
        .map((file) => fetch(DATA + file).then((r) => {
          if (!r.ok) throw new Error('Sky catalog unavailable');
          return r.json();
        })));
      this.stars = responses[0].features.filter((f) => f.properties.mag <= 5.5)
        .map((f) => ({ ra:f.geometry.coordinates[0], dec:f.geometry.coordinates[1],
          mag:f.properties.mag }));
      this.lines = responses[1].features.flatMap((f) =>
        f.geometry.coordinates.flatMap((line) =>
          line.slice(1).map((p,i) => [line[i], p])));
      this.update(this.jd, this.lat, this.lon, this.orrery);
    } catch (error) {
      console.warn('Constellation catalog could not load', error);
    }
  }

  update(jd, lat, lon, orrery) {
    this.jd = jd; this.lat = lat; this.lon = lon; this.orrery = orrery;
    const stars = new Float32Array(this.stars.length * 3);
    const colors = new Float32Array(this.stars.length * 3);
    this.stars.forEach((star,i) => {
      const eq = precessJ2000(star.ra, star.dec, jd);
      const d = localDirection(equatorialVector(eq.ra,eq.dec),jd,lat,lon);
      stars.set([d.x*100,d.y*100,d.z*100],i*3);
      const v = Math.max(0.35, 1 - 0.11 * (star.mag + 1));
      colors.set([v,v,v],i*3);
    });
    const starPosition = this.starGeometry.getAttribute('position');
    if (!starPosition || starPosition.array.length !== stars.length) {
      this.starGeometry.setAttribute('position',new THREE.BufferAttribute(stars,3));
      this.starGeometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
    } else {
      starPosition.array.set(stars);
      starPosition.needsUpdate = true;
    }
    const lines = new Float32Array(this.lines.length * 6);
    this.lines.forEach(([a,b],i) => {
      [a,b].forEach(([ra,dec],j) => {
        const eq = precessJ2000(ra,dec,jd);
        const d = localDirection(equatorialVector(eq.ra,eq.dec),jd,lat,lon);
        lines.set([d.x*99,d.y*99,d.z*99],i*6+j*3);
      });
    });
    const linePosition = this.lineGeometry.getAttribute('position');
    if (!linePosition || linePosition.array.length !== lines.length) {
      this.lineGeometry.setAttribute('position',new THREE.BufferAttribute(lines,3));
    } else {
      linePosition.array.set(lines);
      linePosition.needsUpdate = true;
    }

    const s = sunOfDate(jd), m = moonOfDate(jd);
    const approximate = {
      sun:{ ...eclipticOfDate(s.lon,0,s.dist,jd), radius:Math.atan2(695700,s.dist*AU_KM)/DEG },
      moon:{ ...eclipticOfDate(m.lon,m.lat,m.dist/AU_KM,jd),
        radius:Math.atan2(1737.4,m.dist)/DEG }
    };
    const bodies = {};
    for (const name of ['sun','moon']) {
      const source = nasa1999Body(name,jd) || approximate[name];
      bodies[name] = vectorAt(source,jd,lat,lon);
      const mesh = this[name], distance = name === 'sun' ? 60 : 30;
      const d = bodies[name].local;
      mesh.position.set(d.x*distance,d.y*distance,d.z*distance);
      mesh.scale.setScalar(distance*Math.tan(bodies[name].radius*DEG));
    }
    const sep = angularSeparation(bodies.sun.vector,bodies.moon.vector);
    const eclipse = sep < bodies.sun.radius + bodies.moon.radius;
    this.eclipseRim.visible = eclipse && sep < bodies.moon.radius-bodies.sun.radius;
    this.eclipseRim.position.copy(this.sun.position).multiplyScalar(0.999);
    this.eclipseRim.lookAt(0,0,0);
    this.eclipseRim.scale.setScalar(this.sun.scale.x);
    const nearNew = Math.cos((m.lon-s.lon)*DEG) > 0.9;
    this.moon.material.color.setHex(eclipse || nearNew ? 0x111923 : 0xd9d9d6);
    this.moon.material.needsUpdate = true;
    this.separation = sep;
    this.sunRadius = bodies.sun.radius;
    this.moonRadius = bodies.moon.radius;
    this.sunAltitude = bodies.sun.local.altitude;
    this.exact1999 = !!nasa1999Body('sun',jd);
    if (orrery) {
      const earth = orrery.bodyPosition('earth');
      for (const name of PLANETS) {
        const p = orrery.bodyPosition(name).sub(earth);
        // Scene coordinates are (ecliptic x, ecliptic z, -ecliptic y).
        const q = eclipticJ2000ToEquatorial({x:p.x,y:-p.z,z:p.y});
        const eq = vectorToRaDec(q);
        const dated = precessJ2000(eq.ra,eq.dec,jd);
        const d = localDirection(topocentric(dated.ra,dated.dec,eq.distance/15,jd,lat,lon),jd,lat,lon);
        this.planets.get(name).position.set(d.x*90,d.y*90,d.z*90);
      }
    }
    return { sep, sunRadius:this.sunRadius, moonRadius:this.moonRadius,
      altitude:this.sunAltitude, eclipse, total:eclipse && sep < this.moonRadius-this.sunRadius,
      exact1999:this.exact1999 };
  }

  lookAtSun(fov=8) {
    const d = this.sun.position.clone().normalize();
    this.camera.fov = fov;
    this.camera.updateProjectionMatrix();
    this.camera.lookAt(d);
  }

  lookWide() {
    this.camera.fov = 70;
    this.camera.updateProjectionMatrix();
    this.camera.lookAt(this.sun.position.clone().normalize());
  }

  rotate(dx,dy) {
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    dir.applyAxisAngle(new THREE.Vector3(0,1,0),-dx*0.005);
    const right = new THREE.Vector3().crossVectors(dir,new THREE.Vector3(0,1,0)).normalize();
    dir.applyAxisAngle(right,-dy*0.005);
    this.camera.lookAt(dir);
  }

  resize(width,height) {
    this.camera.aspect = width/height;
    this.camera.updateProjectionMatrix();
  }
}
