import * as THREE from './vendor/three.module.js';
const D=Math.PI/180;
export function chapterDate(e){const d=new Date(0);d.setUTCFullYear(e.date.year,(e.date.month||1)-1,e.date.day||1);d.setUTCHours(12,0,0,0);return d;}
const placePoint=(lat,lon)=>{const a=lat*D,b=lon*D,f=6356.752314245/6378.137,n=1/Math.sqrt(1-(1-f*f)*Math.sin(a)**2);return new THREE.Vector3(n*Math.cos(a)*Math.cos(b),n*f*f*Math.sin(a),-n*Math.cos(a)*Math.sin(b)).multiplyScalar(1.013);};
export async function makeBook(earthFrame,solarEarth,onSelect){
 const [events,locations]=await Promise.all(['book-events.json','book-locations.json'].map(async f=>{const r=await fetch(new URL('./data/'+f,import.meta.url));if(!r.ok)throw Error('Book data unavailable');return r.json();}));
 const byId=new Map(events.map(e=>[e.id,e])),groups=[new THREE.Group(),new THREE.Group()],pins=[];
 earthFrame.add(groups[0]);solarEarth.add(groups[1]);groups.forEach(g=>g.visible=false);
 const specs=locations.vertices.filter(v=>v.associated_chapters?.some(id=>byId.has(id))).map(v=>({lat:v.lat,lon:v.lon,name:v.name,ids:v.associated_chapters.filter(id=>byId.has(id))}));
 for(const e of events)if(!specs.some(s=>s.ids.includes(e.id)))specs.push({lat:e.location.lat,lon:e.location.lon,name:e.location.name,ids:[e.id]});
 for(const [which,g]of groups.entries())for(const s of specs){
  const pin=new THREE.Mesh(new THREE.SphereGeometry(.013,12,8),new THREE.MeshBasicMaterial({color:0x6fffe0,transparent:true,opacity:1}));pin.position.copy(placePoint(s.lat,s.lon));pin.name=s.name;pin.userData={...s,which};g.add(pin);pins.push(pin);
 }
 let enabled=false,all=false,selected='';const reader=document.getElementById('book-reader'),select=document.getElementById('chapter');
 for(const e of events){const o=document.createElement('option');o.value=e.id;o.textContent=e.id.toUpperCase()+' · '+e.title;select.appendChild(o);}
 function open(id,site=null,jump=false){const e=byId.get(id);if(!e)return;selected=id;select.value=id;reader.hidden=false;document.getElementById('book-title').textContent=e.title;
  document.getElementById('book-meta').textContent=`${e.date.year<1?(1-e.date.year)+' BCE':e.date.year+' CE'} · ${site?.name||e.location.name}`;
  document.getElementById('book-content').textContent=e.content||e.excerpt||'';const link=document.getElementById('book-source');link.href='https://feisttech.com/articles/'+encodeURIComponent(e.id)+'.html';
  onSelect(e,site||{lat:e.location.lat,lon:e.location.lon,name:e.location.name},jump);
 }
 select.onchange=()=>open(select.value,null,true);
 document.getElementById('chapter-jump').onclick=()=>open(select.value,null,true);
 document.getElementById('book-close').onclick=()=>reader.hidden=true;
 document.getElementById('book-date').onclick=()=>open(selected,null,true);
 document.getElementById('book-next').onclick=()=>{const i=events.findIndex(e=>e.id===selected);open(events[(i+1)%events.length].id,null,true);};
 document.getElementById('book-prev').onclick=()=>{const i=events.findIndex(e=>e.id===selected);open(events[(i-1+events.length)%events.length].id,null,true);};
 function update(year){for(const p of pins){const delta=Math.min(...p.userData.ids.map(id=>Math.abs(year-byId.get(id).date.year)));p.visible=all||delta<=50;p.material.opacity=all?0.8:Math.max(.18,1/(1+delta*delta/25));}}
 function setEnabled(v){enabled=v;groups.forEach(g=>g.visible=v);document.getElementById('book-tools').hidden=!v;if(!v)reader.hidden=true;}
 function pick(x,y,camera,view){if(!enabled||view==='sky')return false;const group=groups[view==='orrery'?1:0],center=group.getWorldPosition(new THREE.Vector3());let best=null,dist=22;
  for(const p of pins)if(p.parent===group&&p.visible){const world=p.getWorldPosition(new THREE.Vector3()),normal=world.clone().sub(center);if(normal.dot(camera.position.clone().sub(world))<=0)continue;const q=world.clone().project(camera);if(q.z<-1||q.z>1)continue;const d=Math.hypot((q.x+1)*innerWidth/2-x,(1-q.y)*innerHeight/2-y);if(d<dist){dist=d;best=p;}}
  if(!best)return false;open(best.userData.ids[0],best.userData,false);return true;
 }
 document.getElementById('book-all').onchange=e=>all=e.target.checked;
 return {events,pins,open,update,pick,setEnabled,get enabled(){return enabled;},get selected(){return selected;}};
}
