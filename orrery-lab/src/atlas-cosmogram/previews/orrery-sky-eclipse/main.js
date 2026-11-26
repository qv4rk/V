import * as THREE from './vendor/three.module.js';
import {OrbitControls} from './vendor/OrbitControls.js';
import {ScaleOrrery} from './orrery/orrery.js';
import {moonOffsetUnits} from './orrery/scale.js';
import {makeCosmos,raDecToScene} from './cosmos.js';
import {EclipseScene} from './eclipse-scene.js';
import {createPhenomena} from './phenomena.js';
import {bindPlaceSearch} from './place-search.js';
import {makeBook,chapterDate} from './book.js';
import {Astronomy as A,EVENTS,AU,EARTH_A,ephemeris,observer,sceneVector,atPoint,shadowCenter,rayEllipsoid} from './physics.mjs';
const $=id=>document.getElementById(id),rad=Math.PI/180;
const title=s=>s[0].toUpperCase()+s.slice(1);
let eclipseCatalog={eclipses:[]};
try { const r=await fetch(new URL('./data/eclipse-catalog.json',import.meta.url));if(r.ok)eclipseCatalog=await r.json(); }
catch(error) { console.warn('Eclipse catalog unavailable:',error); }
let renderer;
try {
  renderer=new THREE.WebGLRenderer({canvas:$('space'),antialias:true,alpha:true,logarithmicDepthBuffer:true,preserveDrawingBuffer:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  const orbitScene=new THREE.Scene();orbitScene.background=new THREE.Color(0x020306);
  const orrery=new ScaleOrrery();orbitScene.add(orrery.group);
  const phenomena=createPhenomena(orbitScene);
  const eclipse=new EclipseScene();
  orrery.bodies.earth.mesh.geometry.dispose();orrery.bodies.earth.mesh.geometry=eclipse.earth.geometry.clone();
  const shadowMark=new THREE.Group();shadowMark.name='Visible eclipse shadow marker · enlarged for clarity';
  const shadowOuter=new THREE.Mesh(new THREE.CircleGeometry(1,48),new THREE.MeshBasicMaterial({color:0x9babc1,transparent:true,opacity:.28,depthWrite:false,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2}));
  const shadowCore=new THREE.Mesh(new THREE.CircleGeometry(1,48),new THREE.MeshBasicMaterial({color:0x05070c,transparent:true,opacity:.82,depthWrite:false,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-3}));
  shadowMark.add(shadowOuter,shadowCore);orrery.bodies.earth.mesh.add(shadowMark);shadowMark.visible=false;
  const orbitCamera=new THREE.PerspectiveCamera(45,innerWidth/innerHeight,1e-7,100000);
  const earthCamera=new THREE.PerspectiveCamera(45,innerWidth/innerHeight,1e-5,100000);
  const skyCamera=new THREE.PerspectiveCamera(70,innerWidth/innerHeight,1e-7,100000);
  const orbitControls=new OrbitControls(orbitCamera,$('space'));
  const earthControls=new OrbitControls(earthCamera,$('space'));
  orbitControls.enableDamping=earthControls.enableDamping=true;
  earthControls.minDistance=.015;earthControls.maxDistance=300;
  const cosmos=await makeCosmos(8000);cosmos.setCulture('both');
  const catalogEvents=(eclipseCatalog.eclipses||[]).map(record=>{
    const date=new Date(record.greatest.ut1_model_iso),site=record.site;
    const stamp=record.greatest.ut1_model_iso.slice(0,10);
    const lon=site.longitude_deg_east,lonText=`${Math.abs(lon).toFixed(1)}°${lon<0?'W':'E'}`;
    const lat=site.latitude_deg,latText=`${Math.abs(lat).toFixed(1)}°${lat<0?'S':'N'}`;
    return {id:record.id,name:`${stamp} · ${title(record.type)} · ${latText}, ${lonText}`,source:'catalog',catalogRecord:record,
      eclipse:{peak:{date},latitude:lat,longitude:lon}};
  }).filter(e=>Number.isFinite(+e.eclipse.peak.date));
  const ALL_EVENTS=EVENTS.concat(catalogEvents);
  const eclipticToEquatorial=new THREE.Matrix4();
  let view='earth',event=EVENTS[0],date=event.eclipse.peak.date,state=ephemeris(date),playing=false;
  let mode='visible',focus='',lat=event.eclipse.latitude,lon=event.eclipse.longitude,following=true;
  let book=null,placeName='',placeTimezone='',natalURL='',placeSelected=false;
  let lastEarth=new THREE.Vector3(),lastFocus=new THREE.Vector3(),sunLock=false;
  const bodyNames={sun:'Sun',mercury:'Mercury',venus:'Venus',earth:'Earth',mars:'Mars',jupiter:'Jupiter',saturn:'Saturn',uranus:'Uranus',neptune:'Neptune',moon:'Moon',io:'Io',europa:'Europa',ganymede:'Ganymede',callisto:'Callisto'};
  for(const e of EVENTS){const o=new Option(e.name,e.id);$('event').add(o);}
  if(catalogEvents.length){const group=document.createElement('optgroup');group.label=`Uploaded eclipse catalog · ${catalogEvents.length} records`;
    for(const e of catalogEvents)group.appendChild(new Option(e.name,e.id));$('event').add(group);}
  for(const [name,label] of Object.entries(bodyNames)) $('focus').add(new Option(label,name));
  for(const [name,label] of [['oumuamua','ʻOumuamua'],['nine','Planet Nine · hypothetical'],['perseids','Perseid stream crossing'],['satellites','ISS · live satellite TLE']])$('focus').add(new Option(label,name));
  const nameNodes=cosmos.centres.map(c=>{
    const el=document.createElement('span');el.className='star-name';el.textContent=c.name;
    $('constellation-labels').appendChild(el);return {el,dir:c.dir};
  });
  $('catalog').textContent=`${cosmos.counts.stars.toLocaleString()} stars · ${cosmos.counts.western} Western figures · ${cosmos.counts.chinese} Chinese figures`;
  function eclScene(vector) {
    const v=A.RotateVector(A.Rotation_EQJ_ECL(),vector);
    return new THREE.Vector3(v.x,v.z,-v.y);
  }
  function updateShadowMark() {
    const c=eclipse.center;if(!c){shadowMark.visible=false;return;}
    const eqj=A.RotateVector(A.Rotation_EQD_EQJ(state.time),new A.Vector(c.position[0],c.position[1],c.position[2],state.time));
    const ecl=A.RotateVector(A.Rotation_EQJ_ECL(),eqj),dir=new THREE.Vector3(ecl.x,ecl.z,-ecl.y).normalize();
    const inv=orrery.bodies.earth.mesh.getWorldQuaternion(new THREE.Quaternion()).invert();dir.applyQuaternion(inv).normalize();
    shadowMark.position.copy(dir).multiplyScalar(1.004);shadowMark.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),dir);
    const obsc=state.catalogExact?event.catalogRecord.site.obscuration:1,umbra=state.catalogExact?event.catalogRecord.site.umbra:!c.isCatalogSite;
    shadowOuter.scale.setScalar(0.045+0.11*Math.sqrt(Math.max(0,obsc)));shadowCore.scale.setScalar(umbra?.052:.018);shadowCore.visible=umbra;
    shadowMark.visible=true;
  }
  function fromEqDate(vector) {
    return eclScene(A.RotateVector(A.Rotation_EQD_EQJ(state.time),new A.Vector(vector[0],vector[1],vector[2],state.time)));
  }
  function selectedPosition(name) { return orrery.bodies[name] ? orrery.bodyPosition(name) : phenomena.positions[name] || phenomena.streamNode; }
  function setLayers() {
    phenomena.groups.oumuamua.visible=$('layer-oumuamua').checked;
    phenomena.groups.nine.visible=$('layer-nine').checked;
    phenomena.groups.perseids.visible=$('layer-perseids').checked;
    phenomena.groups.satellites.visible=$('layer-satellites').checked;
  }
  function nextPerseidPassage() {
    let year=date.getUTCFullYear(), start=new Date(Date.UTC(year,7,9)), end=new Date(Date.UTC(year,7,16));
    const nearest=y=>{
      let best=null,dist=Infinity;
      for(let t=Date.UTC(y,7,9);t<=Date.UTC(y,7,16);t+=30*60000){
        const d=new Date(t),v=eclScene(A.HelioVector(A.Body.Earth,A.MakeTime(d))).multiplyScalar(15),gap=v.distanceTo(phenomena.streamNode);
        if(gap<dist){dist=gap;best=d;}
      }
      return best;
    };
    let hit=nearest(year);if(hit<date)hit=nearest(++year);return hit;
  }
  let stationRec=null, stationEpoch='', stationPathAt=0;
  function temeToScene(pos,when) {
    const t=A.MakeTime(when);
    const eqj=A.RotateVector(A.Rotation_EQD_EQJ(t),new A.Vector(pos.x/EARTH_A,pos.y/EARTH_A,pos.z/EARTH_A,t));
    const ecl=A.RotateVector(A.Rotation_EQJ_ECL(),eqj);
    return new THREE.Vector3(ecl.x,ecl.z,-ecl.y).add(orrery.bodyPosition('earth'));
  }
  async function loadStations() {
    try {
      const res=await fetch('https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=tle',{cache:'no-store'});
      if(!res.ok)throw new Error(`CelesTrak HTTP ${res.status}`);
      const rows=(await res.text()).trim().split(/\r?\n/);
      for(let i=0;i+2<rows.length;i++)if(/ISS \(ZARYA\)/i.test(rows[i])){stationRec=window.satellite.twoline2satrec(rows[i+1],rows[i+2]);stationEpoch=new Date().toISOString();break;}
      if(!stationRec)throw new Error('ISS TLE not found');
      stationPathAt=0;$('extras-status').textContent=`ISS orbit from CelesTrak · TLE fetched ${stationEpoch.slice(0,10)} UTC.`;updateOrrery();
    } catch(error) { $('extras-status').textContent='Satellite TLE unavailable; the other layers work offline.';console.warn('Satellite TLE:',error); }
  }
  function updateOrrery() {
    orrery.setJulianDay(state.jd);
    const oldJupiter=orrery.bodyPosition('jupiter');
    for(const name of ['mercury','venus','earth','mars','jupiter','saturn','uranus','neptune']){
      const p=eclScene(A.HelioVector(bodyNames[name],state.time)).multiplyScalar(15);
      orrery.bodies[name].holder.position.copy(p);
    }
    const jupiterDelta=orrery.bodyPosition('jupiter').sub(oldJupiter);
    for(const name of ['io','europa','ganymede','callisto'])orrery.bodies[name].holder.position.add(jupiterDelta);
    const m=eclScene(A.GeoMoon(state.time));
    const off=moonOffsetUnits({x:m.x,y:m.y,z:m.z},'earth',mode);
    // moonOffsetUnits accepts a vector; its scale operation is frame independent.
    orrery.bodies.moon.holder.position.copy(orrery.bodyPosition('earth')).add(new THREE.Vector3(off.x,off.y,off.z));
    for(const [name,b] of Object.entries(orrery.bodies)){
      b.marker.visible=true;
      if(name==='earth') {
        const g=state.gast*rad;
        const x=fromEqDate([Math.cos(g),Math.sin(g),0]);
        const y=fromEqDate([0,0,1]);const z=fromEqDate([Math.sin(g),-Math.cos(g),0]);
        b.mesh.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,y,z));
      } else if(bodyNames[name]&& !['io','europa','ganymede','callisto'].includes(name)) {
        const axis=A.RotationAxis(bodyNames[name],state.time);
        const pole=eclScene(axis.north).normalize();
        b.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),pole);
        b.mesh.rotateY(axis.spin*rad);
      }
    }
    const saturnRing=orrery.bodies.saturn.mesh.children[0];
    if(saturnRing)saturnRing.quaternion.setFromAxisAngle(new THREE.Vector3(1,0,0),-Math.PI/2);
    phenomena.update(date);
    if(stationRec){
      const pv=window.satellite.propagate(stationRec,date);
      if(pv.position){const sat=temeToScene(pv.position,date);phenomena.setSatellitePosition(sat);phenomena.positions.satellites=sat;}
      if(!stationPathAt||Math.abs(+date-stationPathAt)>300000){const path=[];for(let m=0;m<=95;m++){const d=new Date(+date+m*60000),q=window.satellite.propagate(stationRec,d);if(q.position)path.push(temeToScene(q.position,d));}
        phenomena.setSatelliteOrbit(path);stationPathAt=+date;}
    }
  }
  function cosmosTransform() {
    const r=A.Rotation_ECL_EQD(state.time);
    const basis=[[1,0,0],[0,0,1],[0,-1,0]].map(v=>{
      const p=A.RotateVector(r,new A.Vector(...v,state.time));return new THREE.Vector3(p.x,p.z,-p.y);
    });
    eclipticToEquatorial.makeBasis(...basis);
    cosmos.group.quaternion.setFromRotationMatrix(view==='orrery'?new THREE.Matrix4():eclipticToEquatorial);
  }
  function dateBox() {
    const iso=date.toISOString(),parts=iso.split('T');$('clock').textContent=`${parts[0]} ${parts[1].slice(0,8)} UTC · JD ${state.jd.toFixed(6)}`;
    if(document.activeElement!==$('date')){$('date').value=date.getUTCFullYear()>0?parts[0]+'T'+parts[1].slice(0,8):'';$('date').title=date.getUTCFullYear()>0?'UTC date and time':'For BCE dates, use History year or choose a chapter.';}
    const offset=(date-event.eclipse.peak.date)/60000;
    $('scrub').value=Math.max(-120,Math.min(120,offset));$('offset').textContent=`${offset>=0?'+':''}${offset.toFixed(1)} min`;
  }
  function setDate(next) {
    const requestedDate=new Date(next);if(!Number.isFinite(+requestedDate))return;date=requestedDate;
    const previousGast=state.gast;
    state=ephemeris(date);
    if(event.catalogRecord&&Math.abs(+date-+event.eclipse.peak.date)<1000){
      const g=event.catalogRecord.geometry,r=event.catalogRecord;state={...state,sun:g.sun_eqd_km,moon:g.moon_eqd_km,gast:g.earth_gast_deg,catalogExact:true,
        catalogSite:{lat:r.site.latitude_deg,lon:r.site.longitude_deg_east}};
    }
    updateOrrery();eclipse.update(state,lat,lon);updateShadowMark();cosmosTransform();dateBox();
    if(view==='sky'){
      skyCamera.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),(state.gast-previousGast)*rad));
      anchorSky();if(sunLock)skyCamera.lookAt(eclipse.sun.position);
    }
    if(view==='earth'&&following){
      const center=eclipse.center?.position;
      if(center){const p=new THREE.Vector3(...sceneVector(center));const delta=p.clone().sub(lastEarth);
        if(lastEarth.lengthSq()){earthCamera.position.add(delta);earthControls.target.add(delta);}lastEarth.copy(p);}
    }
    if(view==='orrery'&&focus){const p=selectedPosition(focus),delta=p.clone().sub(lastFocus);orbitCamera.position.add(delta);orbitControls.target.add(delta);lastFocus.copy(p);}
    eclipse.path.visible=$('track').checked&&!book?.enabled&&Math.abs(+date-+event.eclipse.peak.date)<3*3600000;
    book?.update(date.getUTCFullYear());$('history-year').value=date.getUTCFullYear();$('history-time').value=date.getUTCFullYear();
    const center=eclipse.center;
    const shadowLabel=center?.isCatalogSite?`Catalog greatest-eclipse site${event.catalogRecord.site.umbra?' · inside umbra':' · no umbra at this site'}: `:'Calculated shadow axis: ';
    $('shadow').textContent=center?shadowLabel+`${Math.abs(center.lat).toFixed(4)}° ${center.lat<0?'S':'N'} · ${Math.abs(center.lon).toFixed(4)}° ${center.lon<0?'W':'E'}`:'Shadow axis does not intersect Earth at this time';
    const local=atPoint(state,observer(state,lat,lon));
    $('sky-status').textContent=`At observer: ${local.kind} · ${(local.obscuration*100).toFixed(2)}% Sun covered · altitude ${local.altitude.toFixed(1)}°`;
    eclipse.corona.visible=view==='sky'&&local.kind==='Total';
    eclipse.corona.position.copy(eclipse.sun.position).multiplyScalar(.9999);
    eclipse.corona.quaternion.copy(skyCamera.quaternion);
  }
  function anchorSky() {
    const p=new THREE.Vector3(...sceneVector(observer(state,lat,lon,10)));
    skyCamera.position.copy(p);skyCamera.up.copy(p).normalize();
  }
  function lookSun(close=true) {
    sunLock=true;
    skyCamera.fov=close?.85:70;skyCamera.updateProjectionMatrix();
    skyCamera.lookAt(eclipse.sun.position);$('fov').value=skyCamera.fov;
  }
  function wideSky() {
    sunLock=false;
    skyCamera.fov=70;skyCamera.updateProjectionMatrix();$('fov').value=70;
    const p=skyCamera.position.clone();skyCamera.lookAt(p.clone().add(p.clone().normalize()));
  }
  function frameEarth() {
    eclipse.frame($('vantage').value,earthCamera,earthControls);
    if(eclipse.center)lastEarth.set(...sceneVector(eclipse.center.position));
  }
  function frameOrbit() {
    orbitCamera.fov=45;orbitCamera.updateProjectionMatrix();
    if(!focus){orbitCamera.position.set(0,350,650);orbitControls.target.set(0,0,0);}
    else{const p=selectedPosition(focus),r=focus==='perseids'?4.5:orrery.bodies[focus]?orrery.bodyRadius(focus):0.8;
      orbitControls.target.copy(p);orbitCamera.position.copy(p).add(new THREE.Vector3(0,.35,1).normalize().multiplyScalar(r*6));lastFocus.copy(p);}
    orbitControls.update();
  }
  function setView(next) {
    view=next;orbitControls.enabled=next==='orrery';earthControls.enabled=next==='earth';
    for(const b of document.querySelectorAll('[data-view]'))b.classList.toggle('active',b.dataset.view===view);
    $('earth-tools').hidden=next!=='earth'||!!book?.enabled;$('orrery-tools').hidden=next!=='orrery';$('sky-tools').hidden=next!=='sky';
    $('selection').hidden=true;
    eclipse.beacon.visible=next==='earth';
    (next==='orrery'?orbitScene:eclipse.scene).add(cosmos.group);cosmosTransform();
    if(next==='orrery')frameOrbit();else if(next==='earth'){if(!book?.enabled)earthCamera.clearViewOffset();frameEarth();}else {anchorSky();wideSky();}
    setDate(date);
  }
  function useEvent(id) {
    event=ALL_EVENTS.find(e=>e.id===id)||EVENTS[0];date=event.eclipse.peak.date;
    lat=event.eclipse.latitude;lon=event.eclipse.longitude;$('lat').value=lat.toFixed(4);$('lon').value=lon.toFixed(4);
    eclipse.setEvent(event);$('nasa-source').href=event.source==='catalog'?'https://github.com/qv4rk/GrokBotPlayground/blob/main/atlas-cosmogram/previews/orrery-sky-eclipse/data/eclipse-catalog.json':event.source;
    $('nasa-source').textContent=event.catalogRecord?'Uploaded eclipse catalog':'NASA eclipse reference';setDate(date);
    const info=$('event-info');
    if(event.catalogRecord){const r=event.catalogRecord,s=r.site,miss=r.greatest.axis_miss_km,dur=s.totality_duration_seconds;
      info.textContent=`Uploaded catalog · ${title(r.type)} eclipse · ${s.umbra?'umbra at selected site':'penumbra only at selected site'} · ${(s.obscuration*100).toFixed(2)}% obscuration · `+
        `site ${Math.abs(s.latitude_deg).toFixed(4)}° ${s.latitude_deg<0?'S':'N'}, ${Math.abs(s.longitude_deg_east).toFixed(4)}° ${s.longitude_deg_east<0?'W':'E'} · `+
        `axis miss ${miss.toFixed(1)} km${dur==null?'':` · totality ${dur.toFixed(1)} s`}. Exact catalog geometry is applied at greatest eclipse; between-event track points are not in this catalog.`;
    } else info.textContent='Reference eclipse · calculated from the Atlas ephemeris.';
    if(view==='earth')frameEarth();if(view==='sky')lookSun();
  }
  const camera=()=>view==='orrery'?orbitCamera:view==='earth'?earthCamera:skyCamera;
  const scene=()=>view==='orrery'?orbitScene:eclipse.scene;
  const tapPoints=()=>view==='orrery'?[...Object.values(orrery.bodies).map(b=>b.mesh),...phenomena.markers]:[eclipse.moon,eclipse.sun,eclipse.earth,...(eclipse.beacon.visible?[eclipse.beacon]:[]),...[...eclipse.planets.values()]];
  function tapAt(x,y) {
    if(book?.pick(x,y,camera(),view))return;
    const ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2(x/innerWidth*2-1,1-y/innerHeight*2),camera());
    const hit=ray.intersectObjects(tapPoints(),false)[0];let name=hit?.object.name;
    if(hit?.object===eclipse.earth){const p=[hit.point.x*EARTH_A,-hit.point.z*EARTH_A,hit.point.y*EARTH_A];
      const g=atPoint(state,p);name=`Earth · ${(g.obscuration*100).toFixed(1)}% Sun covered`;}
    if(!name){let nearest=Infinity;for(const body of tapPoints()){
      const p=body.getWorldPosition(new THREE.Vector3()).project(camera());if(p.z<-1||p.z>1)continue;
      const d=Math.hypot((p.x+1)*innerWidth/2-x,(1-p.y)*innerHeight/2-y);
      if(d<24&&d<nearest){nearest=d;name=body.name;}
    }}
    if(!name&&cosmos.group.visible){
      const points=cosmos.group.children[0].geometry.getAttribute('position');let nearest=12;
      for(let i=0;i<points.count;i++){const p=new THREE.Vector3().fromBufferAttribute(points,i).applyMatrix4(cosmos.group.matrixWorld).project(camera());
        if(p.z<-1||p.z>1)continue;const d=Math.hypot((p.x+1)*innerWidth/2-x,(1-p.y)*innerHeight/2-y);
        if(d<nearest){nearest=d;const star=cosmos.stars[i];name=star.properties.name||`Catalog star ${star.id} · mag ${star.properties.mag}`;}}
    }
    const label=$('selection');label.hidden=!name;
    if(name){label.textContent=title(name);label.style.left=`${Math.max(8,Math.min(x+12,innerWidth-245))}px`;label.style.top=`${Math.max(55,y-40)}px`;}
  }
  let gesture=null;const pointers=new Map();let pinch=null;
  $('space').addEventListener('pointerdown',e=>{
    gesture=e.isPrimary?{id:e.pointerId,x:e.clientX,y:e.clientY,moved:false}:null;
    if(view!=='sky')return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});pinch=null;
    if(pointers.size===2){const [a,b]=[...pointers.values()];pinch=Math.hypot(a.x-b.x,a.y-b.y);}
    $('space').setPointerCapture(e.pointerId);
  });
  function fov(next){skyCamera.fov=Math.max(.65,Math.min(100,next));skyCamera.updateProjectionMatrix();$('fov').value=skyCamera.fov;}
  $('space').addEventListener('pointermove',e=>{
    if(gesture?.id===e.pointerId&&Math.hypot(e.clientX-gesture.x,e.clientY-gesture.y)>8)gesture.moved=true;
    if(view!=='sky'||!pointers.has(e.pointerId))return;
    const old=pointers.get(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pointers.size===1){sunLock=false;const k=skyCamera.fov*rad/innerHeight;
      skyCamera.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),-(e.clientX-old.x)*k));
      skyCamera.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),-(e.clientY-old.y)*k));
    }else if(pointers.size===2){const [a,b]=[...pointers.values()],d=Math.hypot(a.x-b.x,a.y-b.y);if(pinch&&d>0)fov(skyCamera.fov*pinch/d);pinch=d;}
  });
  function end(e){if(gesture?.id===e.pointerId&&!gesture.moved&&e.type==='pointerup')tapAt(e.clientX,e.clientY);
    if(gesture?.id===e.pointerId)gesture=null;pointers.delete(e.pointerId);pinch=null;}
  for(const type of ['pointerup','pointercancel','lostpointercapture'])$('space').addEventListener(type,end);
  $('space').addEventListener('wheel',e=>{if(view==='sky'){e.preventDefault();fov(skyCamera.fov*Math.exp(e.deltaY*(e.ctrlKey?.00035:.001)));}}, {passive:false});
  for(const b of document.querySelectorAll('[data-view]'))b.onclick=()=>setView(b.dataset.view);
  $('event').onchange=()=>{playing=false;$('play').textContent='Play';useEvent($('event').value);};
  $('date').onchange=()=>{playing=false;$('play').textContent='Play';setDate(new Date($('date').value+'Z'));};
  $('peak').onclick=()=>{playing=false;$('play').textContent='Play';useEvent(event.id);};
  $('scrub').oninput=()=>{playing=false;$('play').textContent='Play';setDate(new Date(event.eclipse.peak.date.getTime()+Number($('scrub').value)*60000));};
  $('back').onclick=()=>setDate(new Date(+date-60000));$('forward').onclick=()=>setDate(new Date(+date+60000));
  $('play').onclick=()=>{playing=!playing;$('play').textContent=playing?'Pause':'Play';};
  $('vantage').onchange=frameEarth;
  $('track-center').onclick=()=>{following=!following;$('track-center').classList.toggle('active',following);if(following)frameEarth();};
  $('focus').onchange=()=>{focus=$('focus').value;frameOrbit();};
  $('perseid-season').onclick=()=>{
    playing=false;$('play').textContent='Play';$('layer-perseids').checked=true;setLayers();
    focus='perseids';$('focus').value=focus;setView('orrery');setDate(nextPerseidPassage());frameOrbit();
    $('extras-status').textContent='Earth’s calculated closest approach to the modeled Swift–Tuttle node. The stream width is illustrative.';
  };
  for(const id of ['layer-oumuamua','layer-nine','layer-perseids','layer-satellites'])$(id).onchange=()=>setLayers();
  $('layer-satellites').addEventListener('change',()=>{if($('layer-satellites').checked&&!stationRec)loadStations();});
  $('scale').onclick=()=>{mode=mode==='visible'?'true':'visible';orrery.setScaleMode(mode);setDate(date);frameOrbit();$('scale').textContent=mode==='visible'?'Show true scale':'Show visible scale';};
  const citySearch=bindPlaceSearch($('place'),$('place-results'),window.NATAL_CITIES||[],p=>{placeName=p.name;placeSelected=true;natalURL='';lat=p.lat;lon=p.lon;$('lat').value=lat;$('lon').value=lon;try{placeTimezone=window.tzlookup?.(lat,lon)||'';}catch{placeTimezone='';}$('place-status').textContent=placeName+(placeTimezone?' · '+placeTimezone:'');setDate(date);});
  $('place').addEventListener('input',()=>placeSelected=false);
  $('observer').onclick=()=>{if($('place').value.trim()&&!placeSelected&&!citySearch.selectFirst()){$('place-status').textContent='Choose a matching city from the list.';return;}const a=Number($('lat').value),b=Number($('lon').value);if(!Number.isFinite(a)||!Number.isFinite(b)||Math.abs(a)>90||Math.abs(b)>180)return;playing=false;$('play').textContent='Play';lat=a;lon=b;setView('sky');wideSky();};
  function framePlace(){if(innerWidth<700&&book?.enabled)earthCamera.setViewOffset(innerWidth,innerHeight,0,innerHeight*.2,innerWidth,innerHeight);else earthCamera.clearViewOffset();const p=new THREE.Vector3(...sceneVector(observer(state,lat,lon)));earthControls.target.set(0,0,0);earthCamera.position.copy(p.normalize()).multiplyScalar(3.5*Math.max(1,1/earthCamera.aspect));earthControls.update();}
  function setHistoryYear(y){if(!Number.isFinite(y)||y<-12000||y>12000)return;const d=new Date(date);d.setUTCFullYear(y);playing=false;$('play').textContent='Play';setDate(d);}
  $('history-year').onchange=e=>setHistoryYear(Number(e.target.value));$('history-time').oninput=e=>setHistoryYear(Number(e.target.value));
  $('book-all').addEventListener('change',()=>book?.update(date.getUTCFullYear()));
  function setBookEnabled(v){book?.setEnabled(v);$('book-toggle').classList.toggle('active',v);eclipse.uniforms.uAmbient.value=v?.28:.008;$('eclipse-picker').hidden=v;$('eclipse-timeline').hidden=v;$('earth-tools').hidden=v||view!=='earth';if(v){eclipse.path.visible=false;eclipse.cones.visible=false;eclipse.footprint.visible=false;}}
  $('book-toggle').onclick=()=>{if(!book)return;setBookEnabled(!book.enabled);$('book-toggle').classList.toggle('active',book.enabled);if(book.enabled){following=false;$('dock').classList.remove('collapsed');$('collapse').textContent='−';$('collapse').setAttribute('aria-expanded','true');book.open(book.selected||book.events[0].id,null,true);}};
  $('birth-chart').onclick=()=>{
    if($('place').value.trim()&&!placeSelected&&!citySearch.selectFirst()){$('place-status').textContent='Choose the birthplace from the matching cities.';$('dock').classList.remove('collapsed');return;}
    let u;try{u=new URL(natalURL||'https://feisttech.com/apps/webapps/natal-chart/');}catch{u=new URL('https://feisttech.com/apps/webapps/natal-chart/');}
    if(!natalURL){const zone=placeTimezone||'UTC',parts=new Intl.DateTimeFormat('en-GB',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date),f={};for(const p of parts)f[p.type]=p.value;for(const [k,v]of Object.entries({y:f.year,mo:f.month,d:f.day,h:f.hour,mi:f.minute,utc:'0',lat,lon,city:placeName,tz:placeTimezone}))u.searchParams.set(k,v);}
    u.searchParams.set('embed','atlas');$('natal-frame').src=u.href;$('natal-dialog').showModal();
  };
  $('close-natal').onclick=()=>$('natal-dialog').close();
  window.addEventListener('message',e=>{if(e.source!==$('natal-frame').contentWindow||!['https://feisttech.com','https://www.feisttech.com'].includes(e.origin)||e.data?.type!=='feisttech:natal')return;const p=e.data,t=new Date(p.date);if(!Number.isFinite(+t)||!Number.isFinite(p.lat)||!Number.isFinite(p.lon)||Math.abs(p.lat)>90||Math.abs(p.lon)>180)return;lat=p.lat;lon=p.lon;placeName=p.city||p.name||'Birthplace';placeTimezone=p.timezone||'';placeSelected=true;$('place').value=placeName;$('lat').value=lat;$('lon').value=lon;$('place-status').textContent=placeName+(placeTimezone?' · '+placeTimezone:'');try{const u=new URL(p.url);if(['https://feisttech.com','https://www.feisttech.com'].includes(u.origin)&&u.pathname.startsWith('/apps/webapps/natal-chart/'))natalURL=u.href;}catch{}playing=false;$('play').textContent='Play';setBookEnabled(false);setDate(t);setView('sky');if(p.action==='view-sky')$('natal-dialog').close();});
  $('sun').onclick=()=>lookSun();$('zenith').onclick=wideSky;$('fov').oninput=()=>fov(Number($('fov').value));
  $('culture').onchange=()=>{cosmos.setCulture($('culture').value);cosmos.group.visible=$('culture').value!=='off';};
  $('cones').onchange=()=>{eclipse.cones.visible=$('cones').checked;eclipse.footprint.visible=$('cones').checked;};
  $('track').onchange=()=>eclipse.path.visible=$('track').checked&&!book?.enabled&&Math.abs(+date-+event.eclipse.peak.date)<3*3600000;
  function exactViewURL() {
    const u=new URL('https://feisttech.com/cosmos/'),q=u.searchParams,c=camera();
    q.set('view',view);q.set('t',date.toISOString());q.set('event',event.id);if(placeName)q.set('place',placeName);if(placeTimezone)q.set('tz',placeTimezone);if(natalURL)q.set('natal',natalURL);if(book?.enabled){q.set('book','1');if(book.selected)q.set('chapter',book.selected);}
    q.set('lat',lat.toFixed(6));q.set('lon',lon.toFixed(6));q.set('focus',focus);q.set('scale',mode);
    q.set('culture',$('culture').value);q.set('cones',$('cones').checked?'1':'0');q.set('track',$('track').checked?'1':'0');q.set('names',$('names').checked?'1':'0');q.set('fov',skyCamera.fov.toFixed(2));
    q.set('layers',[ $('layer-oumuamua').checked?'oumuamua':'', $('layer-nine').checked?'nine':'', $('layer-perseids').checked?'perseids':'', $('layer-satellites').checked?'satellites':'' ].filter(Boolean).join(','));
    q.set('cam',c.position.toArray().map(n=>n.toFixed(4)).join(','));
    const look=view==='orrery'?orbitControls.target:view==='earth'?earthControls.target:null;
    if(look)q.set('look',look.toArray().map(n=>n.toFixed(4)).join(','));else q.delete('look');
    if(view==='sky')q.set('rot',skyCamera.quaternion.toArray().map(n=>n.toFixed(6)).join(','));else q.delete('rot');
    return u;
  }
  async function shareView() {
    const url=exactViewURL();
    try {
      if(navigator.share)await navigator.share({title:'The Atlas · Solar System & Sky',text:`${view} · ${date.toISOString()}`,url:url.href});
      else {await navigator.clipboard.writeText(url.href);$('extras-status').textContent='Exact Atlas view link copied.';}
    } catch(error) {if(error?.name!=='AbortError'){try{await navigator.clipboard.writeText(url.href);$('extras-status').textContent='Exact Atlas view link copied.';}catch{$('extras-status').textContent=url.href;}}}
  }
  $('share').onclick=shareView;
  $('collapse').onclick=()=>{const hidden=$('dock').classList.toggle('collapsed');$('collapse').textContent=hidden?'+':'−';$('collapse').setAttribute('aria-expanded',String(!hidden));};
  $('sources').onclick=()=>$('about').showModal();$('close-about').onclick=()=>$('about').close();
  $('png').onclick=()=>{const current=scene(),background=current.background;current.background=null;
    renderer.setClearColor(0,0);renderer.render(current,camera());const a=document.createElement('a');
    const output=document.createElement('canvas');output.width=renderer.domElement.width;output.height=renderer.domElement.height;
    const ctx=output.getContext('2d');ctx.drawImage(renderer.domElement,0,0);ctx.scale(output.width/innerWidth,output.height/innerHeight);
    ctx.textAlign='center';ctx.textBaseline='middle';
    for(const {el}of nameNodes)if(!el.hidden){const style=getComputedStyle(el);ctx.font=style.font;ctx.fillStyle=style.color;
      ctx.fillText(el.textContent,parseFloat(el.style.left),parseFloat(el.style.top));}
    a.download=`atlas-${view}-${date.toISOString().replaceAll(':','-')}.png`;a.href=output.toDataURL('image/png');a.click();current.background=background;};
  window.addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);for(const c of [orbitCamera,earthCamera,skyCamera]){c.aspect=innerWidth/innerHeight;c.updateProjectionMatrix();}});
  try{book=await makeBook(eclipse.earthFrame,orrery.bodies.earth.mesh,(e,site,jump)=>{lat=site.lat;lon=site.lon;placeName=site.name;placeSelected=true;natalURL='';try{placeTimezone=window.tzlookup(lat,lon);}catch{placeTimezone='';}$('place').value=placeName;$('place-status').textContent=placeName;$('lat').value=lat;$('lon').value=lon;following=false;if(jump)setDate(chapterDate(e));setView('earth');framePlace();if(innerWidth<700){$('dock').classList.add('collapsed');$('collapse').textContent='+';$('collapse').setAttribute('aria-expanded','false');}});}catch(error){$('book-toggle').disabled=true;console.warn('Book layer:',error);}
  useEvent('1999');setView('earth');if(innerWidth<700){$('dock').classList.add('collapsed');$('collapse').textContent='+';$('collapse').setAttribute('aria-expanded','false');}
  const query=new URLSearchParams(location.search);if(query.get('event'))useEvent(query.get('event'));if(query.get('view'))setView(query.get('view'));
  if(query.get('scale')==='true'){mode='true';orrery.setScaleMode(mode);$('scale').textContent='Show visible scale';}
  if(['both','western','chinese','off'].includes(query.get('culture'))){$('culture').value=query.get('culture');cosmos.setCulture(query.get('culture'));}
  if(query.has('cones'))$('cones').checked=query.get('cones')==='1';if(query.has('track'))$('track').checked=query.get('track')==='1';if(query.has('names'))$('names').checked=query.get('names')==='1';
  const layers=(query.get('layers')||'').split(',');$('layer-oumuamua').checked=layers.includes('oumuamua');$('layer-nine').checked=layers.includes('nine');$('layer-perseids').checked=layers.includes('perseids');$('layer-satellites').checked=layers.includes('satellites');setLayers();if($('layer-satellites').checked)loadStations();
  if(query.get('focus')){$('focus').value=query.get('focus');focus=$('focus').value;}
  if(query.has('lat')&&query.has('lon')){const a=Number(query.get('lat')),b=Number(query.get('lon'));if(Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a)<=90&&Math.abs(b)<=180){lat=a;lon=b;$('lat').value=a;$('lon').value=b;}}
  placeName=query.get('place')||'';placeTimezone=query.get('tz')||'';if(placeName){$('place').value=placeName;placeSelected=true;$('place-status').textContent=placeName;}
  try{const u=new URL(query.get('natal'));if(['https://feisttech.com','https://www.feisttech.com'].includes(u.origin)&&u.pathname.startsWith('/apps/webapps/natal-chart/'))natalURL=u.href;}catch{}
  if(query.get('t'))setDate(new Date(query.get('t')));else setDate(date);
  if(query.get('book')==='1'&&book){setBookEnabled(true);$('book-toggle').classList.add('active');if(query.get('chapter'))book.open(query.get('chapter'),null,false);}
  if(focus&&!query.has('cam'))frameOrbit();if(view==='sky'&&query.has('fov'))fov(Number(query.get('fov')));
  if(query.get('culture')==='off')cosmos.group.visible=false;
  const vec=(key,n)=>{const a=(query.get(key)||'').split(',').map(Number);return a.length===n&&a.every(Number.isFinite)?a:null;};
  const cam=vec('cam',3);if(cam)camera().position.fromArray(cam);
  const look=vec('look',3);if(look&&view==='orrery')orbitControls.target.fromArray(look);else if(look&&view==='earth')earthControls.target.fromArray(look);
  const rot=vec('rot',4);if(rot&&view==='sky')skyCamera.quaternion.fromArray(rot);
  if(cam||look){orbitControls.update();earthControls.update();}
  if(query.get('chart')==='1'&&natalURL)$('birth-chart').click();
  let previous=performance.now(),elapsed=0;
  renderer.setAnimationLoop(now=>{
    const dt=Math.min(.1,(now-previous)/1000);previous=now;elapsed+=dt;
    if(playing&&elapsed>.1){setDate(new Date(+date+elapsed*Number($('speed').value)*1000));elapsed=0;}
    if(view==='orrery')orbitControls.update();else if(view==='earth')earthControls.update();
    const c=camera();cosmos.group.position.copy(c.position);
    if(view!=='orrery')for(const p of eclipse.planets.values())p.position.copy(p.userData.realPosition).sub(c.position).normalize().multiplyScalar(7300).add(c.position);
    eclipse.corona.quaternion.copy(skyCamera.quaternion);
    for(const n of nameNodes){const visible=$('names').checked&&cosmos.group.visible&&$('culture').value!=='chinese'&&c.fov>6;
      if(!visible){n.el.hidden=true;continue;}
      const direction=n.dir.clone().applyQuaternion(cosmos.group.quaternion);
      if(view!=='orrery'&&rayEllipsoid([c.position.x*EARTH_A,-c.position.z*EARTH_A,c.position.y*EARTH_A],[direction.x,-direction.z,direction.y])){n.el.hidden=true;continue;}
      const p=direction.multiplyScalar(7900).add(c.position).project(c);
      n.el.hidden=p.z<-1||p.z>1||Math.abs(p.x)>.94||Math.abs(p.y)>.88;
      if(!n.el.hidden){n.el.style.left=`${(p.x+1)*innerWidth/2}px`;n.el.style.top=`${(1-p.y)*innerHeight/2}px`;}}
    renderer.render(scene(),c);
  });
  window.__atlas={renderer,orrery,eclipse,cosmos,book,exactViewURL,get observer(){return {lat,lon,placeName};},setDate,setView,useEvent,get state(){return state;},get view(){return view;},camera,scene};
} catch(error) {$('error').hidden=false;$('error').textContent=`Could not start the Atlas: ${error.message}`;console.error(error);}
