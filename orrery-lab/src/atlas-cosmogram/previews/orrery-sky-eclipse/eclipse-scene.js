import * as THREE from './vendor/three.module.js';
import {Astronomy,EARTH_A,EARTH_B,SUN_RADIUS,MOON_RADIUS,sceneVector,shadowCenter,shadowBoundary,cone,unit,sub,mul,add,cross,observer,ephemeris,geographical} from './physics.mjs';

const point = p => new THREE.Vector3(...sceneVector(p));
export const overlapGLSL = `
float overlap(float a,float b,float d) {
  if(d>=a+b) return 0.0;
  if(d<=abs(a-b)) return b>=a ? 1.0 : b*b/(a*a);
  float x=acos(clamp((d*d+a*a-b*b)/(2.0*d*a),-1.0,1.0));
  float y=acos(clamp((d*d+b*b-a*a)/(2.0*d*b),-1.0,1.0));
  return clamp((a*a*(x-sin(x)*cos(x))+b*b*(y-sin(y)*cos(y)))/(3.14159265359*a*a),0.0,1.0);
}
float eclipseAt(vec3 p) {
  vec3 s=uSun-p,m=uMoon-p;
  float a=asin(uSunRadius/length(s)),b=asin(uMoonRadius/length(m));
  vec3 sn=normalize(s),mn=normalize(m);
  float d=atan(length(cross(sn,mn)),dot(sn,mn));
  return overlap(a,b,d);
}`;
const vertex = `
#include <common>
#include <logdepthbuf_pars_vertex>
varying vec3 vWorld,vNormal; varying vec2 vUv;
void main(){vUv=uv;vWorld=(modelMatrix*vec4(position,1.0)).xyz;
vNormal=normalize(mat3(modelMatrix)*normal);
gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
#include <logdepthbuf_vertex>
}`;

export class EclipseScene {
  constructor() {
    this.scene=new THREE.Scene();
    this.scene.background=new THREE.Color(0x020306);
    this.earthFrame=new THREE.Group();this.scene.add(this.earthFrame);
    this.uniforms={uSun:{value:new THREE.Vector3()},uMoon:{value:new THREE.Vector3()},
      uSunRadius:{value:SUN_RADIUS/EARTH_A},uMoonRadius:{value:MOON_RADIUS/EARTH_A},uMap:{value:null},uAmbient:{value:.008}};
    const loader=new THREE.TextureLoader();
    this.uniforms.uMap.value=loader.load(new URL('./assets/earth.jpg',import.meta.url).href);
    this.uniforms.uMap.value.colorSpace=THREE.SRGBColorSpace;
    const earthMaterial=new THREE.ShaderMaterial({uniforms:this.uniforms,vertexShader:vertex,
      fragmentShader:`
      #include <logdepthbuf_pars_fragment>
      uniform sampler2D uMap;uniform vec3 uSun,uMoon;uniform float uSunRadius,uMoonRadius,uAmbient;
      varying vec3 vWorld,vNormal;varying vec2 vUv;${overlapGLSL}
      void main(){
      #include <logdepthbuf_fragment>
      vec3 n=normalize(vNormal);
      vec3 scaled=vec3(vWorld.x,vWorld.y/${EARTH_B/EARTH_A},vWorld.z);
      vec3 surface=vWorld/length(scaled),light=normalize(uSun-surface);
      float daylight=max(0.0,dot(n,light));float shadow=eclipseAt(surface);
      vec3 terrain=texture2D(uMap,vUv).rgb;
      gl_FragColor=vec4(terrain*(uAmbient+1.25*daylight*(1.0-shadow)),1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`});
    const earthGeometry=new THREE.SphereGeometry(1,192,128);
    const positions=earthGeometry.getAttribute('position'),normals=earthGeometry.getAttribute('normal'),uv=earthGeometry.getAttribute('uv');
    const eccentricity=1-(EARTH_B/EARTH_A)**2;
    for(let i=0;i<positions.count;i++){
      const latitude=(uv.getY(i)-.5)*Math.PI,longitude=(uv.getX(i)-.5)*2*Math.PI;
      const c=Math.cos(latitude),s=Math.sin(latitude),n=1/Math.sqrt(1-eccentricity*s*s);
      positions.setXYZ(i,n*c*Math.cos(longitude),n*(1-eccentricity)*s,-n*c*Math.sin(longitude));
      normals.setXYZ(i,c*Math.cos(longitude),s,-c*Math.sin(longitude));
    }
    positions.needsUpdate=true;normals.needsUpdate=true;earthGeometry.computeBoundingSphere();
    this.earth=new THREE.Mesh(earthGeometry,earthMaterial);this.earth.name='Earth';
    this.earthFrame.add(this.earth);
    const atmospheric=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.BackSide,
      uniforms:{uSun:this.uniforms.uSun},vertexShader:vertex,
      fragmentShader:`
      #include <logdepthbuf_pars_fragment>
      uniform vec3 uSun;varying vec3 vWorld,vNormal;varying vec2 vUv;
      void main(){
      #include <logdepthbuf_fragment>
      vec3 n=normalize(vNormal),v=normalize(cameraPosition-vWorld);
      float rim=pow(1.0-abs(dot(n,v)),3.0);float day=max(0.06,dot(n,normalize(uSun-vWorld)));
      gl_FragColor=vec4(0.16,0.48,0.95,rim*day*0.6);}`});
    this.atmosphere=new THREE.Mesh(earthGeometry,atmospheric);this.atmosphere.scale.setScalar(1.012);
    this.earthFrame.add(this.atmosphere);
    const moonMap=loader.load(new URL('./assets/moon.jpg',import.meta.url).href);moonMap.colorSpace=THREE.SRGBColorSpace;
    this.moon=new THREE.Mesh(new THREE.SphereGeometry(MOON_RADIUS/EARTH_A,96,64),
      new THREE.MeshStandardMaterial({map:moonMap,roughness:1}));this.moon.name='Moon';this.scene.add(this.moon);
    const sunMap=loader.load(new URL('./assets/2k_sun.jpg',import.meta.url).href);sunMap.colorSpace=THREE.SRGBColorSpace;
    this.sun=new THREE.Mesh(new THREE.SphereGeometry(SUN_RADIUS/EARTH_A,96,64),
      new THREE.MeshBasicMaterial({map:sunMap}));this.sun.name='Sun';this.scene.add(this.sun);
    this.planets=new Map();
    for(const [name,color]of Object.entries({Mercury:0xc6c3b9,Venus:0xffe4ae,Mars:0xe58663,Jupiter:0xe6d2a9,Saturn:0xdace9d,Uranus:0x9cdad6,Neptune:0x779ce6})){
      const p=new THREE.Points(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute([0,0,0],3)),
        new THREE.PointsMaterial({color,size:5,sizeAttenuation:false}));p.name=name;p.userData.realPosition=new THREE.Vector3();
      this.planets.set(name,p);this.scene.add(p);
    }
    this.light=new THREE.DirectionalLight(0xffffff,2.3);this.scene.add(this.light);
    this.scene.add(new THREE.AmbientLight(0xffffff,.015));
    this.cones=new THREE.Group();this.scene.add(this.cones);this.cones.visible=false;
    this.path=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:0xeac568,transparent:true,opacity:.8}));
    this.earthFrame.add(this.path);
    this.footprint=new THREE.LineSegments(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:0xeac568,transparent:true,opacity:.8}));
    this.scene.add(this.footprint);this.footprint.visible=false;
    this.beacon=new THREE.Mesh(new THREE.SphereGeometry(.0006,16,12),new THREE.MeshBasicMaterial({color:0x79f3e3}));
    this.beacon.name='Observer';this.scene.add(this.beacon);
    this.corona=new THREE.Mesh(new THREE.PlaneGeometry(12,12),new THREE.ShaderMaterial({transparent:true,
      depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,
      vertexShader:`
      #include <common>
      #include <logdepthbuf_pars_vertex>
      varying vec2 p;void main(){p=uv*12.0-6.0;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
      #include <logdepthbuf_vertex>
      }`,
      fragmentShader:`
      #include <logdepthbuf_pars_fragment>
      varying vec2 p;void main(){
      #include <logdepthbuf_fragment>
      float r=length(p),a=atan(p.y,p.x);
      float rays=0.58+0.22*sin(a*9.0+sin(a*5.0))+0.13*sin(a*27.0+r*3.0)+0.07*sin(a*53.0-r*7.0);
      float limb=smoothstep(0.96,1.03,r);float halo=exp(-(r-1.0)*5.0)*0.5;
      float stream=pow(max(rays,0.0),3.0)*exp(-(r-1.0)*1.65)*0.2;
      float opacity=limb*(halo+stream)*(1.0-smoothstep(3.5,6.0,r));
      gl_FragColor=vec4(0.94,0.97,1.0,clamp(opacity,0.0,.85));}`}));
    this.corona.scale.setScalar(SUN_RADIUS/EARTH_A);this.scene.add(this.corona);this.corona.visible=false;
  }
  update(state,lat,lon) {
    this.state=state;this.center=shadowCenter(state);
    if(!this.center&&state.catalogExact&&state.catalogSite){
      const site=state.catalogSite;this.center={position:observer(state,site.lat,site.lon),lat:site.lat,lon:site.lon,isCatalogSite:true};
    }
    this.earthFrame.rotation.y=state.gast*Math.PI/180;
    this.sun.position.copy(point(state.sun));this.moon.position.copy(point(state.moon));
    for(const [name,p]of this.planets){const v=Astronomy.RotateVector(state.rotation,Astronomy.GeoVector(name,state.time,true));
      p.userData.realPosition.set(v.x*149597870.7/EARTH_A,v.z*149597870.7/EARTH_A,-v.y*149597870.7/EARTH_A);}
    const axis=Astronomy.RotationAxis('Moon',state.time);
    const north=Astronomy.RotateVector(state.rotation,axis.north);
    this.moon.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(north.x,north.z,-north.y).normalize());
    this.moon.rotateY(axis.spin*Math.PI/180);
    this.uniforms.uSun.value.copy(this.sun.position);this.uniforms.uMoon.value.copy(this.moon.position);
    this.light.position.copy(this.sun.position).normalize().multiplyScalar(100);
    this.beacon.position.copy(point(observer(state,lat,lon))).multiplyScalar(1.0002);
    this.updateCones(state);
    const vertices=[];
    const outline=shadowBoundary(state,'umbra',160);
    for(let i=1;i<outline.length;i++)if(outline[i-1]&&outline[i]){
      const a=point(outline[i-1]).multiplyScalar(1.00015),b=point(outline[i]).multiplyScalar(1.00015);
      vertices.push(a.x,a.y,a.z,b.x,b.y,b.z);
    }
    this.footprint.geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
    this.footprint.geometry.computeBoundingSphere();
  }
  updateCones(state) {
    for(const child of [...this.cones.children]){child.geometry.dispose();child.material.dispose();this.cones.remove(child);}
    const length=Math.min(85,Math.hypot(...state.moon)/EARTH_A+3);
    for(const kind of ['penumbra','umbra']) {
      const c=cone(state,kind),k=new THREE.Vector3(...sceneVector(mul(c.direction,EARTH_A)));
      const a=new THREE.Vector3().crossVectors(k,Math.abs(k.y)>.9?new THREE.Vector3(1,0,0):new THREE.Vector3(0,1,0)).normalize();
      const b=new THREE.Vector3().crossVectors(k,a).normalize();
      const origin=point(state.moon),geometry=new THREE.BufferGeometry(),positions=[];
      const end=kind==='umbra'?Math.min(length,c.vertexDistance/EARTH_A):length;
      const startRadius=c.tangentRadius/EARTH_A;
      const endRadius=kind==='umbra'?Math.max(0,startRadius-end*Math.tan(c.angle)):startRadius+end*Math.tan(c.angle);
      for(let i=0;i<72;i++){
        const rim=t=>a.clone().multiplyScalar(Math.cos(t)).addScaledVector(b,Math.sin(t));
        const r1=rim(i/72*Math.PI*2),r2=rim((i+1)/72*Math.PI*2);
        const p=origin.clone().addScaledVector(r1,startRadius),q=origin.clone().addScaledVector(r2,startRadius);
        const x=origin.clone().addScaledVector(k,end).addScaledVector(r1,endRadius),y=origin.clone().addScaledVector(k,end).addScaledVector(r2,endRadius);
        for(const v of [p,q,x,q,y,x])positions.push(v.x,v.y,v.z);
      }
      if(kind==='umbra'&&length>c.vertexDistance/EARTH_A){
        const apex=origin.clone().addScaledVector(k,c.vertexDistance/EARTH_A);
        const radius=(length-c.vertexDistance/EARTH_A)*Math.tan(c.angle);
        for(let i=0;i<72;i++){
          const rim=t=>a.clone().multiplyScalar(Math.cos(t)).addScaledVector(b,Math.sin(t));
          const p=origin.clone().addScaledVector(k,length).addScaledVector(rim(i/72*Math.PI*2),radius);
          const q=origin.clone().addScaledVector(k,length).addScaledVector(rim((i+1)/72*Math.PI*2),radius);
          for(const v of [apex,p,q])positions.push(v.x,v.y,v.z);
        }
      }
      geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
      this.cones.add(new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color:kind==='umbra'?0xeac568:0x76c8e7,
        transparent:true,opacity:kind==='umbra'?.16:.045,side:THREE.DoubleSide,depthWrite:false})));
    }
  }
  setEvent(event) {
    if(event.catalogRecord){this.path.geometry.setFromPoints([]);return;}
    const points=[];
    for(let minutes=-110;minutes<=110;minutes+=1.5){
      const s=ephemeris(new Date(event.eclipse.peak.date.getTime()+minutes*60000)),c=shadowCenter(s);
      if(!c)continue;
      const lat=c.lat*Math.PI/180,lon=c.lon*Math.PI/180;
      const n=EARTH_A/Math.sqrt(1-(1-(EARTH_B/EARTH_A)**2)*Math.sin(lat)**2);
      points.push(new THREE.Vector3(n*Math.cos(lat)*Math.cos(lon)/EARTH_A,
        n*(EARTH_B/EARTH_A)**2*Math.sin(lat)/EARTH_A,-n*Math.cos(lat)*Math.sin(lon)/EARTH_A).multiplyScalar(1.0003));
    }
    this.path.geometry.setFromPoints(points);
  }
  frame(kind,camera,controls) {
    const center=this.center?.position || observer(this.state,0,0);
    const p=point(center),normal=p.clone().normalize();
    const tangent=new THREE.Vector3().crossVectors(normal,new THREE.Vector3(0,1,0)).normalize();
    camera.fov=45;camera.near=1e-5;camera.far=100000;camera.updateProjectionMatrix();
    if(kind==='alignment') {
      const m=this.moon.position.clone();
      controls.target.copy(m).multiplyScalar(.5);
      camera.position.copy(controls.target).addScaledVector(tangent,42).add(new THREE.Vector3(0,18,0));
    } else if(kind==='moon') {
      controls.target.set(0,0,0);
      camera.position.copy(this.moon.position).addScaledVector(tangent,MOON_RADIUS/EARTH_A*1.15);
      camera.fov=6;camera.updateProjectionMatrix();
    } else if(kind==='orbital') {
      controls.target.copy(p);
      camera.position.copy(point(observer(this.state,(this.center?.lat||0)-1,(this.center?.lon||0)+8,400000)));
      camera.fov=70;camera.near=1e-6;camera.updateProjectionMatrix();
    } else {
      controls.target.set(0,0,0);
      const framing=Math.max(1,1/camera.aspect);
      camera.position.copy(p).multiplyScalar((kind==='overhead'?3.2:2.8)*framing).addScaledVector(tangent,(kind==='overhead'?0:1.3)*framing);
    }
    controls.update();
  }
}
