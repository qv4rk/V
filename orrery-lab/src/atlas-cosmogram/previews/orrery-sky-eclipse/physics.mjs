import * as engine from './vendor/astronomy.js';
export const Astronomy = globalThis.Astronomy || engine.default;
export const AU = 149597870.7;
export const EARTH_A = 6378.137;
export const EARTH_B = 6356.752314245;
export const SUN_RADIUS = 695700;
export const MOON_RADIUS = 1737.4;
const rad = Math.PI / 180;
export const add = (a,b) => a.map((v,i) => v+b[i]);
export const sub = (a,b) => a.map((v,i) => v-b[i]);
export const mul = (a,k) => a.map(v => v*k);
export const dot = (a,b) => a.reduce((v,x,i) => v+x*b[i],0);
export const norm = a => Math.hypot(...a);
export const unit = a => mul(a,1/norm(a));
export const cross = (a,b) => [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const clamp = (x,a=-1,b=1) => Math.max(a,Math.min(b,x));
export const sceneVector = v => [v[0]/EARTH_A,v[2]/EARTH_A,-v[1]/EARTH_A];
export function ephemeris(date) {
  const time = Astronomy.MakeTime(date);
  const rotation = Astronomy.Rotation_EQJ_EQD(time);
  const convert = vector => {
    const v = Astronomy.RotateVector(rotation,vector);
    return [v.x*AU,v.y*AU,v.z*AU];
  };
  return {time,date:time.date,jd:time.ut+2451545,rotation,
    sun:convert(Astronomy.GeoVector('Sun',time,true)),
    moon:convert(Astronomy.GeoMoon(time)),
    gast:Astronomy.SiderealTime(time)*15};
}
export function observer(state,lat,lon,height=0) {
  const v = Astronomy.ObserverVector(state.time,new Astronomy.Observer(lat,lon,height),true);
  return [v.x*AU,v.y*AU,v.z*AU];
}
export function geographical(position,state) {
  const f = EARTH_B/EARTH_A;
  const lon = ((Math.atan2(position[1],position[0])/rad-state.gast+540)%360)-180;
  const lat = Math.atan2(position[2],Math.hypot(position[0],position[1])*f*f)/rad;
  return {lat,lon};
}
export function rayEllipsoid(origin,direction) {
  const r=[EARTH_A,EARTH_A,EARTH_B];
  const a=direction.reduce((s,v,i)=>s+(v/r[i])**2,0);
  const b=2*origin.reduce((s,v,i)=>s+v*direction[i]/r[i]**2,0);
  const c=origin.reduce((s,v,i)=>s+(v/r[i])**2,0)-1;
  const d=b*b-4*a*c;
  if(d<0) return null;
  const roots=[(-b-Math.sqrt(d))/(2*a),(-b+Math.sqrt(d))/(2*a)].filter(t=>t>=0);
  if(!roots.length) return null;
  return add(origin,mul(direction,Math.min(...roots)));
}
export function shadowCenter(state) {
  const p=rayEllipsoid(state.moon,unit(sub(state.moon,state.sun)));
  return p ? {position:p,...geographical(p,state)} : null;
}
export function diskOverlap(sunRadius,moonRadius,separation) {
  const a=sunRadius,b=moonRadius,d=Math.max(0,separation);
  if(d>=a+b) return 0;
  if(d<=Math.abs(a-b)) return b>=a ? 1 : (b/a)**2;
  const alpha=Math.acos(clamp((d*d+a*a-b*b)/(2*d*a)));
  const beta=Math.acos(clamp((d*d+b*b-a*a)/(2*d*b)));
  const area=a*a*(alpha-Math.sin(alpha)*Math.cos(alpha))+b*b*(beta-Math.sin(beta)*Math.cos(beta));
  return clamp(area/(Math.PI*a*a),0,1);
}
export function atPoint(state,position) {
  const s=sub(state.sun,position),m=sub(state.moon,position);
  const solarRadius=Math.asin(SUN_RADIUS/norm(s));
  const lunarRadius=Math.asin(MOON_RADIUS/norm(m));
  const separation=Math.atan2(norm(cross(s,m)),dot(s,m));
  const normal=unit([position[0]/EARTH_A**2,position[1]/EARTH_A**2,position[2]/EARTH_B**2]);
  const altitude=Math.asin(clamp(dot(unit(s),normal)))/rad;
  const obscuration=altitude>0 ? diskOverlap(solarRadius,lunarRadius,separation) : 0;
  const kind=altitude<=0?'Sun below horizon':separation>=solarRadius+lunarRadius?'No eclipse':
    separation<=Math.abs(lunarRadius-solarRadius)?(lunarRadius>=solarRadius?'Total':'Annular'):'Partial';
  return {solarRadius,lunarRadius,separation,altitude,obscuration,kind};
}
export function cone(state,kind) {
  const direction=unit(sub(state.moon,state.sun));
  const distance=norm(sub(state.moon,state.sun));
  const angle=Math.asin((SUN_RADIUS+(kind==='penumbra'?MOON_RADIUS:-MOON_RADIUS))/distance);
  const vertexDistance=MOON_RADIUS/Math.sin(angle);
  const sign=kind==='penumbra'?-1:1;
  const vertex=add(state.moon,mul(direction,sign*vertexDistance));
  const tangentRadius=MOON_RADIUS/Math.cos(angle);
  return {direction,angle,vertexDistance,vertex,tangentRadius};
}
export function shadowBoundary(state,kind,segments=160) {
  const c=cone(state,kind);
  const side=unit(cross(c.direction,Math.abs(c.direction[2])>.9?[1,0,0]:[0,0,1]));
  const up=unit(cross(c.direction,side));
  const result=[];
  // Common tangent rays are traced from the Moon plane toward Earth.
  for(let i=0;i<=segments;i++) {
    const a=i/segments*2*Math.PI;
    const rim=add(mul(side,Math.cos(a)),mul(up,Math.sin(a)));
    const start=add(state.moon,mul(rim,c.tangentRadius));
    const direction=unit(add(c.direction,mul(rim,(kind==='penumbra'?1:-1)*Math.tan(c.angle))));
    result.push(rayEllipsoid(start,direction));
  }
  return result;
}
export const EVENTS = [
  {id:'1999',name:'Europe · 11 Aug 1999',start:'1999-08-01T00:00:00Z',source:'https://eclipse.gsfc.nasa.gov/SEmono/TSE1999/TSE1999.html'},
  {id:'2017',name:'North America · 21 Aug 2017',start:'2017-08-01T00:00:00Z',source:'https://eclipse.gsfc.nasa.gov/SEsearch/SEdata.php?Ecl=+20170821'},
  {id:'2023',name:'Annular · 14 Oct 2023',start:'2023-10-01T00:00:00Z',source:'https://eclipse.gsfc.nasa.gov/SEsearch/SEdata.php?Ecl=+20231014'},
  {id:'2024',name:'North America · 8 Apr 2024',start:'2024-04-01T00:00:00Z',source:'https://eclipse.gsfc.nasa.gov/SEsearch/SEdata.php?Ecl=+20240408'}
].map(e=>({...e,eclipse:Astronomy.SearchGlobalSolarEclipse(new Date(e.start))}));
