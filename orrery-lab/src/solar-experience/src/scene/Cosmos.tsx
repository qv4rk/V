import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, Line, OrbitControls, Stars } from "@react-three/drei";
import * as THREE from "three";
import * as Astronomy from "astronomy-engine";
import { MOON, ORRERY, livePos } from "@/sim/bodies";
import {
  CN_ANIMALS,
  CN_GLYPH,
  EURO_GLYPH,
  EURO_SIGNS,
  OBLIQUITY,
  chineseIndex,
  civilYear,
  ecefUnit,
  euroSignIndex,
  geoSceneAU,
  helioDisplay,
  logCompress,
  moonShadow,
  oumuamuaScene,
  planetNineScene,
  sunEclipticLon,
} from "@/sim/astro";
import { buildChart, eclipticHorizon, enu, skyDir } from "@/sim/chart";
import { clock, useCosmos, view } from "@/sim/store";
import { useSimTime } from "@/sim/useSimTime";
import {
  EARTH_FRAG,
  EARTH_VERT,
  WELL_FRAG,
  WELL_VERT,
  makeBandTexture,
  makeEarthTexture,
  makeRockyTexture,
} from "@/scene/textures";

const PLUS_X = new THREE.Vector3(1, 0, 0);
const Y_UP = new THREE.Vector3(0, 1, 0);

function ClockDriver() {
  useFrame((_, dt) => {
    const s = useCosmos.getState();
    if (!s.playing) return;
    clock.t += s.daysPerSecond * 86400000 * Math.min(dt, 0.05);
  });
  return null;
}

function useTextures() {
  return useMemo(() => {
    const earth = makeEarthTexture();
    const mercury = makeRockyTexture(2, [70, 68, 64], [180, 174, 166]);
    const venus = makeBandTexture(
      [
        [196, 164, 110],
        [232, 206, 150],
        [210, 176, 120],
      ],
      3,
    );
    const mars = makeRockyTexture(4, [120, 52, 32], [196, 110, 70]);
    const jupiter = makeBandTexture(
      [
        [150, 120, 86],
        [232, 214, 180],
        [176, 110, 72],
        [236, 220, 190],
        [160, 112, 74],
      ],
      5,
    );
    const saturn = makeBandTexture(
      [
        [186, 160, 112],
        [232, 214, 170],
        [206, 180, 130],
        [236, 220, 186],
      ],
      6,
    );
    const uranus = makeBandTexture(
      [
        [150, 210, 214],
        [186, 232, 234],
        [160, 214, 218],
      ],
      7,
    );
    const neptune = makeBandTexture(
      [
        [36, 58, 150],
        [64, 96, 196],
        [44, 70, 170],
      ],
      8,
    );
    const pluto = makeRockyTexture(9, [110, 86, 70], [220, 206, 190]);
    const moon = makeRockyTexture(1, [90, 88, 84], [200, 196, 188]);
    const map: Record<string, THREE.Texture> = {
      mercury,
      venus,
      mars,
      jupiter,
      saturn,
      uranus,
      neptune,
      pluto,
      moon,
      earth,
    };
    return map;
  }, []);
}

function OrbitLines() {
  const show = useCosmos((s) => s.showOrbits);
  const lines = useMemo(
    () =>
      ORRERY.filter((b) => b.body && b.id !== "sun").map((b) => ({
        id: b.id,
        color: b.color,
        points: orbitOf(b.body as Astronomy.Body, b.periodDays),
      })),
    [],
  );
  if (!show) return null;
  return (
    <group>
      {lines.map((l) => (
        <Line key={l.id} points={l.points} color={l.color} transparent opacity={0.35} />
      ))}
    </group>
  );
}

function orbitOf(body: Astronomy.Body, periodDays: number) {
  const start = Date.UTC(2000, 0, 1, 12);
  const pts: [number, number, number][] = [];
  const n = body === Astronomy.Body.Pluto ? 120 : 140;
  for (let i = 0; i <= n; i++) {
    const date = new Date(start + (i / n) * periodDays * 86400000);
    const p = helioDisplay(body, date);
    pts.push([p.x, p.y, p.z]);
  }
  return pts;
}

function Belt() {
  const geo = useMemo(() => {
    const arr = new Float32Array(450 * 3);
    for (let i = 0; i < 450; i++) {
      const a = 2.15 + Math.random() * 1.25;
      const ang = Math.random() * Math.PI * 2;
      const y = (Math.random() - 0.5) * 0.12;
      const p = logCompress({ x: Math.cos(ang) * a, y, z: Math.sin(ang) * a });
      arr[i * 3] = p.x;
      arr[i * 3 + 1] = p.y;
      arr[i * 3 + 2] = p.z;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    return g;
  }, []);
  return (
    <points geometry={geo}>
      <pointsMaterial color="#9a907c" size={0.035} sizeAttenuation />
    </points>
  );
}

function Wells() {
  const show = useCosmos((s) => s.showWells);
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(64, 64, 128, 128);
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);
  const uniforms = useMemo(
    () => ({
      uBody: { value: Array.from({ length: 12 }, () => new THREE.Vector4()) },
    }),
    [],
  );
  useFrame(() => {
    const arr = uniforms.uBody.value;
    ORRERY.forEach((b, i) => {
      const p = livePos[b.id];
      const slot = arr[i];
      if (!p) {
        slot.set(0, 0, 0, 0);
        return;
      }
      slot.set(p.x, p.y, p.z, b.mu);
    });
    for (let i = ORRERY.length; i < 12; i++) arr[i].set(0, 0, 0, 0);
  });
  if (!show) return null;
  return (
    <mesh geometry={geo} frustumCulled={false}>
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={WELL_VERT}
        fragmentShader={WELL_FRAG}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

function Bodies({ textures }: { textures: Record<string, THREE.Texture> }) {
  const focus = useCosmos((s) => s.focus);
  const groups = useRef<Record<string, THREE.Group | null>>({});
  const earthSpin = useRef<THREE.Group>(null);
  const earthTilt = useRef<THREE.Group>(null);
  const moonG = useRef<THREE.Group>(null);

  useEffect(() => {
    const eps = (OBLIQUITY * Math.PI) / 180;
    const pole = new THREE.Vector3(0, Math.cos(eps), Math.sin(eps));
    earthTilt.current?.quaternion.setFromUnitVectors(Y_UP, pole);
  }, []);

  useFrame(() => {
    const date = new Date(clock.t);
    for (const b of ORRERY) {
      const g = groups.current[b.id];
      if (!g || !b.body) continue;
      if (b.id === "sun") {
        g.position.set(0, 0, 0);
        livePos.sun = { x: 0, y: 0, z: 0 };
        continue;
      }
      const p = helioDisplay(b.body, date);
      g.position.set(p.x, p.y, p.z);
      livePos[b.id] = p;
    }
    const gst = Astronomy.SiderealTime(date) * (Math.PI / 12);
    if (earthSpin.current) earthSpin.current.rotation.y = gst;
    if (moonG.current && livePos.earth) {
      const rel = geoSceneAU(MOON.body, date);
      const len = Math.hypot(rel.x, rel.y, rel.z) || 1;
      const s = 0.62 / len;
      moonG.current.position.set(livePos.earth.x + rel.x * s, livePos.earth.y + rel.y * s, livePos.earth.z + rel.z * s);
      livePos.moon = { x: moonG.current.position.x, y: moonG.current.position.y, z: moonG.current.position.z };
    }
  });

  return (
    <group>
      {ORRERY.map((b) => (
        <group key={b.id} ref={(n) => { groups.current[b.id] = n; }}>
          {b.id === "earth" ? (
            <group ref={earthTilt}>
              <group ref={earthSpin}>
                <mesh
                  onClick={(e) => {
                    e.stopPropagation();
                    focusBody(b.id, b.radius);
                  }}
                >
                  <sphereGeometry args={[b.radius, 48, 32]} />
                  <meshStandardMaterial map={textures.earth} roughness={0.95} metalness={0} />
                </mesh>
              </group>
            </group>
          ) : b.id === "sun" ? (
            <mesh
              onClick={(e) => {
                e.stopPropagation();
                focusBody(b.id, b.radius);
              }}
            >
              <sphereGeometry args={[b.radius, 40, 24]} />
              <meshBasicMaterial color={b.color} />
            </mesh>
          ) : (
            <mesh
              onClick={(e) => {
                e.stopPropagation();
                focusBody(b.id, b.radius);
              }}
            >
              <sphereGeometry args={[b.radius, 40, 24]} />
              <meshStandardMaterial map={textures[b.id]} roughness={0.92} metalness={0.02} />
            </mesh>
          )}
          {b.ring && (
            <mesh rotation={[0.45, 0, 0]}>
              <ringGeometry args={[b.radius * b.ring.inner, b.radius * b.ring.outer, 80]} />
              <meshBasicMaterial color={b.ring.color} side={THREE.DoubleSide} transparent opacity={0.7} />
            </mesh>
          )}
          {b.id === "sun" && (
            <mesh>
              <sphereGeometry args={[b.radius * 1.7, 24, 16]} />
              <meshBasicMaterial color="#ffbf70" transparent opacity={0.18} depthWrite={false} />
            </mesh>
          )}
          {focus === b.id && (
            <Html center distanceFactor={10} style={{ pointerEvents: "none" }}>
              <span className="cosmos-tag">{b.label}</span>
            </Html>
          )}
        </group>
      ))}
      <group ref={moonG}>
        <mesh
          onClick={(e) => {
            e.stopPropagation();
            focusBody("moon", 0.08);
          }}
        >
          <sphereGeometry args={[MOON.radius, 24, 16]} />
          <meshStandardMaterial map={textures.moon} roughness={1} />
        </mesh>
        {focus === "moon" && (
          <Html center distanceFactor={6} style={{ pointerEvents: "none" }}>
            <span className="cosmos-tag">Moon</span>
          </Html>
        )}
      </group>
    </group>
  );
}

function focusBody(id: string, radius: number) {
  useCosmos.getState().setFocus(id);
  view.autodolly = true;
  view.focusDistance = id === "sun" ? 16 : Math.max(1.15, radius * 9);
}

function Specials() {
  const showO = useCosmos((s) => s.showOumuamua);
  const showP = useCosmos((s) => s.showPlanet9);
  const ou = useRef<THREE.Mesh>(null);
  const p9 = useRef<THREE.Mesh>(null);
  const p9Orbit = useMemo(() => {
    const pts: [number, number, number][] = [];
    for (let i = 0; i <= 180; i++) {
      const date = new Date(Date.UTC(2000, 0, 1) + (i / 180) * 500 ** 1.5 * 365.25 * 86400000);
      const p = logCompress(planetNineScene(date));
      pts.push([p.x, p.y, p.z]);
    }
    return pts;
  }, []);
  const ouPath = useMemo(() => {
    const pts: [number, number, number][] = [];
    const t0 = Date.UTC(2017, 7, 1);
    for (let i = 0; i <= 80; i++) {
      const p = oumuamuaScene(new Date(t0 + i * 2 * 86400000));
      if (!p) continue;
      const d = logCompress(p);
      pts.push([d.x, d.y, d.z]);
    }
    return pts;
  }, []);
  useFrame(() => {
    const date = new Date(clock.t);
    if (ou.current) {
      const p = oumuamuaScene(date);
      if (p) {
        const d = logCompress(p);
        ou.current.position.set(d.x, d.y, d.z);
        ou.current.visible = true;
        livePos.oumuamua = d;
      } else ou.current.visible = false;
    }
    if (p9.current) {
      const d = logCompress(planetNineScene(date));
      p9.current.position.set(d.x, d.y, d.z);
      livePos.planet9 = d;
    }
  });
  return (
    <group>
      {showO && (
        <group>
          <Line points={ouPath} color="#e8e4dc" transparent opacity={0.45} />
          <mesh
            ref={ou}
            onClick={(e) => {
              e.stopPropagation();
              focusBody("oumuamua", 0.12);
            }}
          >
            <sphereGeometry args={[0.09, 16, 12]} />
            <meshBasicMaterial color="#f2efe8" />
          </mesh>
        </group>
      )}
      {showP && (
        <group>
          <Line points={p9Orbit} color="#8d9099" transparent opacity={0.4} />
          <mesh
            ref={p9}
            onClick={(e) => {
              e.stopPropagation();
              focusBody("planet9", 0.16);
            }}
          >
            <sphereGeometry args={[0.14, 20, 14]} />
            <meshStandardMaterial color="#9bb7c9" roughness={0.7} metalness={0.05} />
          </mesh>
        </group>
      )}
    </group>
  );
}

function Zodiac() {
  const show = useCosmos((s) => s.showZodiac);
  const t = useSimTime(2);
  if (!show) return null;
  const date = new Date(t);
  const euro = euroSignIndex(date);
  const cn = chineseIndex(civilYear(t));
  const sunLon = (sunEclipticLon(date) * Math.PI) / 180;
  return (
    <group>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[23.2, 0.012, 8, 128]} />
        <meshBasicMaterial color="#c9a84c" transparent opacity={0.55} />
      </mesh>
      {EURO_SIGNS.map((name, i) => {
        const a = ((i + 0.5) * Math.PI) / 6;
        const on = i === euro;
        return (
          <Html key={name} position={[Math.cos(a) * 23.2, 0.15, Math.sin(a) * 23.2]} center style={{ pointerEvents: "none" }}>
            <span className={on ? "cosmos-sign on" : "cosmos-sign"}>{EURO_GLYPH[i]}</span>
          </Html>
        );
      })}
      <group rotation={[0.42, 0.2, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[26.4, 0.01, 8, 96]} />
          <meshBasicMaterial color="#8d9099" transparent opacity={0.4} />
        </mesh>
        {CN_ANIMALS.map((name, i) => {
          const a = ((i + 0.5) * Math.PI) / 6;
          const on = i === cn;
          return (
            <Html key={name} position={[Math.cos(a) * 26.4, 0, Math.sin(a) * 26.4]} center style={{ pointerEvents: "none" }}>
              <span className={on ? "cosmos-sign on" : "cosmos-sign"}>{CN_GLYPH[i]}</span>
            </Html>
          );
        })}
      </group>
      <mesh position={[Math.cos(sunLon) * 23.2, 0, Math.sin(sunLon) * 23.2]}>
        <sphereGeometry args={[0.08, 12, 8]} />
        <meshBasicMaterial color="#ffe1a8" />
      </mesh>
    </group>
  );
}

function Rig() {
  const mode = useCosmos((s) => s.mode);
  const focus = useCosmos((s) => s.focus);
  const controls = useRef<React.ComponentRef<typeof OrbitControls>>(null);
  const { camera } = useThree();
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const off = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    const stop = () => {
      view.autodolly = false;
    };
    c.addEventListener("start", stop);
    return () => c.removeEventListener("start", stop);
  }, [mode]);

  useFrame((_, dt) => {
    if (mode !== "system") return;
    const c = controls.current;
    if (!c) return;
    const p = livePos[focus] ?? { x: 0, y: 0, z: 0 };
    tmp.set(p.x, p.y, p.z);
    c.target.lerp(tmp, 1 - Math.exp(-4 * dt));
    if (view.autodolly) {
      off.copy(camera.position).sub(c.target);
      const dist = off.length() || 1;
      const next = THREE.MathUtils.damp(dist, view.focusDistance, 3.2, dt);
      off.setLength(next);
      camera.position.copy(c.target).add(off);
      if (Math.abs(next - view.focusDistance) < 0.08) view.autodolly = false;
    }
    c.update();
  });

  if (mode !== "system") return null;
  return (
    <OrbitControls
      ref={controls}
      enablePan
      enableDamping
      dampingFactor={0.08}
      minDistance={0.4}
      maxDistance={80}
      zoomToCursor
    />
  );
}

function DragLook({ distance, look }: { distance: number; look: [number, number, number] }) {
  const ang = useRef({ th: 0.55, ph: 1.05 });
  const dist = useRef(distance);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const { camera, gl } = useThree();

  useEffect(() => {
    dist.current = distance;
  }, [distance]);

  useEffect(() => {
    const el = gl.domElement;
    const down = (e: PointerEvent) => {
      if ((e.target as HTMLElement).closest?.(".dock")) return;
      drag.current = { x: e.clientX, y: e.clientY };
    };
    const move = (e: PointerEvent) => {
      if (!drag.current) return;
      const dx = e.clientX - drag.current.x;
      const dy = e.clientY - drag.current.y;
      drag.current = { x: e.clientX, y: e.clientY };
      ang.current.th -= dx * 0.005;
      ang.current.ph = Math.max(0.25, Math.min(Math.PI - 0.25, ang.current.ph + dy * 0.005));
    };
    const up = () => {
      drag.current = null;
    };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      dist.current = Math.max(2.2, Math.min(140, dist.current * (e.deltaY > 0 ? 1.08 : 0.92)));
    };
    el.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    el.addEventListener("wheel", wheel, { passive: false });
    return () => {
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      el.removeEventListener("wheel", wheel);
    };
  }, [gl]);

  useFrame(() => {
    const { th, ph } = ang.current;
    const r = dist.current;
    camera.position.set(
      look[0] + r * Math.sin(ph) * Math.sin(th),
      look[1] + r * Math.cos(ph),
      look[2] + r * Math.sin(ph) * Math.cos(th),
    );
    camera.lookAt(look[0], look[1], look[2]);
  });
  return null;
}

function EclipseStage({ textures }: { textures: Record<string, THREE.Texture> }) {
  const wide = useCosmos((s) => s.eclipseWide);
  const earth = useRef<THREE.Group>(null);
  const moon = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.ShaderMaterial>(null);
  const axis = useMemo(() => new THREE.Vector3(), []);
  const uniforms = useMemo(
    () => ({
      uMap: { value: textures.earth },
      uUmbra: { value: new THREE.Vector3(1, 0, 0) },
      uSun: { value: new THREE.Vector3(1, 0, 0) },
      uUmbraAng: { value: 0.02 },
      uPenAng: { value: 0.4 },
      uCore: { value: 1 },
    }),
    [textures.earth],
  );

  const axisGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(6), 3));
    return g;
  }, []);
  const axisMat = useMemo(() => new THREE.LineBasicMaterial({ color: "#c9a84c", transparent: true, opacity: 0.75 }), []);
  const axisLine = useMemo(() => new THREE.Line(axisGeo, axisMat), [axisGeo, axisMat]);

  useFrame(() => {
    const sh = moonShadow(new Date(clock.t));
    const u = ecefUnit(sh.lat, sh.lon);
    axis.set(u.x, u.y, u.z);
    earth.current?.quaternion.setFromUnitVectors(axis, PLUS_X);
    if (moon.current) moon.current.position.set(sh.moonRe, 0, 0);
    const uAng = Math.max(0.003, Math.abs(sh.umbraKm) / 6371);
    const pAng = Math.min(1.15, Math.max(uAng + 0.02, sh.penumbraKm / 6371));
    uniforms.uUmbra.value.copy(axis);
    uniforms.uSun.value.copy(axis);
    uniforms.uUmbraAng.value = sh.kind === "total" ? uAng : Math.max(0.01, uAng);
    uniforms.uPenAng.value = sh.kind === "none" ? 0.001 : pAng;
    uniforms.uCore.value = sh.kind === "total" ? 1 : 0;
    const pos = axisGeo.attributes.position as THREE.BufferAttribute;
    pos.setXYZ(0, 1.02, 0, 0);
    pos.setXYZ(1, sh.moonRe, 0, 0);
    pos.needsUpdate = true;
  });

  return (
    <group>
      <DragLook distance={wide ? 92 : 3.8} look={wide ? [22, 0, 0] : [0, 0, 0]} />
      <ambientLight intensity={0.08} />
      <directionalLight position={[80, 6, 4]} intensity={2.4} />
      <group ref={earth}>
        <mesh>
          <sphereGeometry args={[1, 96, 64]} />
          <shaderMaterial ref={mat} uniforms={uniforms} vertexShader={EARTH_VERT} fragmentShader={EARTH_FRAG} />
        </mesh>
        <mesh>
          <sphereGeometry args={[1.03, 48, 32]} />
          <meshBasicMaterial color="#8eb7e8" transparent opacity={0.12} depthWrite={false} side={THREE.BackSide} />
        </mesh>
      </group>
      <mesh ref={moon}>
        <sphereGeometry args={[1737.4 / 6371, 32, 24]} />
        <meshStandardMaterial map={textures.moon} roughness={1} />
      </mesh>
      <mesh position={[240, 0, 0]}>
        <sphereGeometry args={[1.15, 24, 16]} />
        <meshBasicMaterial color="#ffd38a" />
      </mesh>
      <primitive object={axisLine} />
    </group>
  );
}

function ChartStage({ textures }: { textures: Record<string, THREE.Texture> }) {
  const lat = useCosmos((s) => s.lat);
  const lon = useCosmos((s) => s.lon);
  const on = useCosmos((s) => s.chartOn);
  const t = useSimTime(3);
  const chart = useMemo(() => (on ? buildChart(new Date(t), lat, lon) : null), [on, t, lat, lon]);
  const birth = useMemo(() => {
    const up = enu(lat, lon).up;
    return [up.x * 1.02, up.y * 1.02, up.z * 1.02] as [number, number, number];
  }, [lat, lon]);

  const placed = useMemo(() => {
    if (!chart) return [];
    return chart.bodies.map((b) => {
      const dir = skyDir(lat, lon, b.altitude, b.azimuth);
      return {
        ...b,
        at: [dir.x * 6.4, dir.y * 6.4, dir.z * 6.4] as [number, number, number],
      };
    });
  }, [chart, lat, lon]);

  const byId = useMemo(() => Object.fromEntries(placed.map((p) => [p.id, p])), [placed]);

  const arcs = useMemo(() => {
    const pts: [number, number, number][] = [];
    for (let i = 0; i <= 72; i++) {
      const hor = eclipticHorizon(new Date(t), lat, lon, (i / 72) * 360);
      const dir = skyDir(lat, lon, hor.altitude, hor.azimuth);
      pts.push([dir.x * 6.2, dir.y * 6.2, dir.z * 6.2]);
    }
    return [pts];
  }, [t, lat, lon]);

  return (
    <group>
      <DragLook distance={11} look={[0, 0, 0]} />
      <ambientLight intensity={0.25} />
      <directionalLight position={[4, 2, 3]} intensity={1.4} />
      <mesh>
        <sphereGeometry args={[1, 64, 48]} />
        <meshStandardMaterial map={textures.earth} roughness={1} />
      </mesh>
      <mesh position={birth}>
        <sphereGeometry args={[0.035, 16, 12]} />
        <meshBasicMaterial color="#c9a84c" />
      </mesh>
      {on &&
        placed.map((p) => (
          <group key={p.id}>
            <Line points={[birth, p.at]} color={p.altitude >= 0 ? "#e4e2dc" : "#5c5f68"} transparent opacity={p.altitude >= 0 ? 0.85 : 0.35} />
            <mesh position={p.at}>
              <sphereGeometry args={[0.045, 12, 10]} />
              <meshBasicMaterial color={p.altitude >= 0 ? "#f3efe4" : "#8d9099"} />
            </mesh>
            <Html position={p.at} center style={{ pointerEvents: "none" }}>
              <span className="cosmos-tag">{p.label}</span>
            </Html>
          </group>
        ))}
      {on &&
        chart?.aspects.map((a) => {
          const A = byId[a.a];
          const B = byId[a.b];
          if (!A || !B) return null;
          return <Line key={`${a.a}-${a.b}-${a.name}`} points={[A.at, B.at]} color={a.color} transparent opacity={0.9} />;
        })}
      {on && arcs.map((pts, i) => <Line key={i} points={pts} color="#c9a84c" transparent opacity={0.4} />)}
    </group>
  );
}

function Stage() {
  const mode = useCosmos((s) => s.mode);
  const textures = useTextures();
  return (
    <>
      <color attach="background" args={["#07080c"]} />
      <ClockDriver />
      <Stars radius={90} depth={40} count={2800} factor={2.2} fade speed={0.15} saturation={0} />
      {mode === "system" && (
        <>
          <ambientLight intensity={0.22} />
          <pointLight position={[0, 0, 0]} intensity={80} distance={40} decay={2} color="#ffe0b0" />
          <OrbitLines />
          <Belt />
          <Wells />
          <Bodies textures={textures} />
          <Specials />
          <Zodiac />
        </>
      )}
      {mode === "eclipse" && <EclipseStage textures={textures} />}
      {mode === "chart" && <ChartStage textures={textures} />}
      <Rig />
    </>
  );
}

export function Cosmos() {
  return (
    <Canvas
      camera={{ position: [8, 12, 24], fov: 42, near: 0.05, far: 400 }}
      dpr={[1, 1.6]}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      style={{ touchAction: "none" }}
    >
      <Stage />
    </Canvas>
  );
}
