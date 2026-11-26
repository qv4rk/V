import assert from 'node:assert/strict';
import {Astronomy,EVENTS,ephemeris,shadowCenter,shadowBoundary,observer,atPoint,diskOverlap,EARTH_A,EARTH_B} from './physics.mjs';
const rad=Math.PI/180;
const distance=(a,b)=>{
 const p=a.lat*rad,q=b.lat*rad,d=(b.lon-a.lon)*rad;
 return 6371*2*Math.asin(Math.sqrt(Math.sin((q-p)/2)**2+Math.cos(p)*Math.cos(q)*Math.sin(d/2)**2));
};
// Independent published center-line samples, NASA RP1398 Table 3.
const nasa=[['10:00',50+7/60,-(14+59.3/60)],['10:30',49+7.3/60,6+45.3/60],
 ['11:00',45+32.6/60,22+50.6/60],['11:30',40+18.1/60,36+15.1/60],['12:00',33+27.3/60,49+39.6/60]];
let worst=0;
for(const [utc,lat,lon]of nasa){
 const state=ephemeris(new Date(`1999-08-11T${utc}:00Z`)),center=shadowCenter(state);
 assert(center);const error=distance(center,{lat,lon});worst=Math.max(worst,error);
 assert(error<8,`NASA ground track at ${utc}: ${error} km`);
 console.log(`NASA ${utc}: ${error.toFixed(3)} km center-line difference`);
 const p=center.position;assert(Math.abs((p[0]**2+p[1]**2)/EARTH_A**2+p[2]**2/EARTH_B**2-1)<1e-9);
 assert.equal(atPoint(state,p).kind,'Total');assert.equal(atPoint(state,p).obscuration,1);
}
assert.equal(diskOverlap(1,2,0),1);assert.equal(diskOverlap(2,1,0),.25);
assert.equal(diskOverlap(1,1,2),0);assert(Number.isFinite(diskOverlap(1,1,0)));
assert(Math.abs(diskOverlap(1,1,1)-(2/3-Math.sqrt(3)/(2*Math.PI)))<1e-10);
for(const e of EVENTS){const s=ephemeris(e.eclipse.peak),c=shadowCenter(s),local=atPoint(s,observer(s,c.lat,c.lon));
 assert.equal(local.kind,e.id==='2023'?'Annular':'Total');
 assert(shadowBoundary(s,'umbra').filter(Boolean).length>150);
 assert.equal(atPoint(s,observer(s,-c.lat,c.lon+180)).kind,'Sun below horizon');
}
const s=ephemeris(EVENTS[0].eclipse.peak),later=ephemeris(new Date(+s.date+3600000));
assert(Math.abs((later.gast-s.gast+360)%360-15.0411)<.002);
assert.equal(shadowCenter(ephemeris(new Date('1999-08-18T11:03:00Z'))),null);
function footprintRatio(date){
 const s=ephemeris(date),c=shadowCenter(s),p=c.position;
 const theta=Math.atan2(p[1],p[0]),east=[-Math.sin(theta),Math.cos(theta),0];
 const lat=c.lat*rad,north=[-Math.sin(lat)*Math.cos(theta),-Math.sin(lat)*Math.sin(theta),Math.cos(lat)];
 const a=shadowBoundary(s,'umbra').filter(Boolean).map(q=>{
   const d=q.map((v,i)=>v-p[i]);return [d.reduce((v,x,i)=>v+x*east[i],0),d.reduce((v,x,i)=>v+x*north[i],0)];});
 const xx=a.reduce((v,q)=>v+q[0]**2,0)/a.length,yy=a.reduce((v,q)=>v+q[1]**2,0)/a.length,xy=a.reduce((v,q)=>v+q[0]*q[1],0)/a.length;
 const delta=Math.sqrt((xx-yy)**2+4*xy*xy);
 return Math.sqrt((xx+yy+delta)/(xx+yy-delta));
}
const low=footprintRatio(new Date('1999-08-11T09:35:00Z')),high=footprintRatio(EVENTS[0].eclipse.peak);
assert(low>3);assert(high>1.1&&high<1.3);
console.log(`Ellipsoidal footprint axis ratio: ${low.toFixed(2)} at low Sun, ${high.toFixed(2)} near greatest eclipse.`);
console.log(`PASS: physical eclipse branches, WGS84 intersection, Earth rotation, four events; worst NASA difference ${worst.toFixed(3)} km.`);
