const {chromium}=require('playwright');
const fs=require('fs');
const assert=require('assert/strict');
(async()=>{
 const path=require('path'),http=require('http');
 const out=process.env.ATLAS_OUTPUT||path.join(__dirname,'test-output');
 const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.jpg':'image/jpeg'};
 const server=http.createServer((req,res)=>{const name=decodeURIComponent(req.url.split('?')[0]);
   const file=path.join(__dirname,name==='/'?'index.html':name);
   if(!file.startsWith(__dirname)){res.writeHead(403);res.end();return;}
   fs.readFile(file,(err,data)=>{if(err){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',types[path.extname(file)]||'text/plain');res.end(data);});});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||chromium.executablePath(),headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text().slice(0,1400));});
 await page.goto(process.env.ATLAS_URL||`http://127.0.0.1:${server.address().port}/`,{waitUntil:'networkidle'});
 await page.waitForFunction(()=>window.__atlas||!document.querySelector('#error').hidden);
 console.log('boot',await page.locator('#error').textContent());
 if(!await page.evaluate(()=>!!window.__atlas)){console.log(errors);await browser.close();process.exit(1);}
 fs.mkdirSync(out,{recursive:true});
 await page.screenshot({path:path.join(out,'earth-shadow-desktop.png')});
 console.log('state',await page.evaluate(()=>({view:__atlas.view,center:__atlas.eclipse.center,counts:__atlas.cosmos.counts})));
 const validEpoch=await page.evaluate(()=>__atlas.state.jd);
 await page.locator('#date').fill('');await page.locator('#back').click();
 assert(Math.abs(await page.evaluate(()=>__atlas.state.jd)-(validEpoch-1/1440))<1e-8);
 await page.locator('#peak').click();
 const gpuErrors=await page.evaluate(async()=>{
   const T=await import('./vendor/three.module.js'),physics=await import('./physics.mjs');
   const {overlapGLSL}=await import('./eclipse-scene.js');
   const s=__atlas.state,c=__atlas.eclipse.center,r=__atlas.renderer;
   const material=new T.ShaderMaterial({uniforms:{...__atlas.eclipse.uniforms,uPoint:{value:new T.Vector3()}},
     vertexShader:'void main(){gl_Position=vec4(position.xy,0.,1.);}',
     fragmentShader:`uniform vec3 uSun,uMoon,uPoint;uniform float uSunRadius,uMoonRadius;${overlapGLSL}void main(){float x=eclipseAt(uPoint);gl_FragColor=vec4(x,x,x,1.);}`});
   const test=new T.Scene();test.add(new T.Mesh(new T.PlaneGeometry(2,2),material));
   const target=new T.WebGLRenderTarget(1,1),camera=new T.OrthographicCamera(-1,1,1,-1,0,10),pixels=new Uint8Array(4),errors=[];
   for(const offset of [0,.25,.6,1.5,5]){
     const p=physics.observer(s,c.lat+offset,c.lon);
     material.uniforms.uPoint.value.set(...physics.sceneVector(p));r.setRenderTarget(target);r.render(test,camera);r.readRenderTargetPixels(target,0,0,1,1,pixels);
     errors.push(Math.abs(pixels[0]/255-physics.atPoint(s,p).obscuration));
   }
   r.setRenderTarget(null);target.dispose();material.dispose();test.children[0].geometry.dispose();return errors;
 });
 console.log('GPU overlap errors',gpuErrors);assert(Math.max(...gpuErrors)<.008);
 await page.locator('[data-view="orrery"]').click();await page.screenshot({path:path.join(out,'solar-system-desktop.png')});
 await page.locator('[data-view="sky"]').click();await page.screenshot({path:path.join(out,'constellations-desktop.png')});
 await page.locator('#culture').selectOption('chinese');
 assert.deepEqual(await page.evaluate(()=>[__atlas.cosmos.group.children[1].visible,__atlas.cosmos.group.children[2].visible]),[false,true]);
 await page.screenshot({path:path.join(out,'chinese-constellations-desktop.png')});
 await page.locator('#culture').selectOption('both');
 const direction=await page.evaluate(()=>__atlas.camera().getWorldDirection(__atlas.eclipse.sun.position.clone()).toArray());
 await page.mouse.move(1100,160);await page.mouse.down();await page.mouse.move(1200,160,{steps:8});await page.mouse.up();
 const afterDirection=await page.evaluate(()=>__atlas.camera().getWorldDirection(__atlas.eclipse.sun.position.clone()).toArray());
 const turn=Math.acos(Math.max(-1,Math.min(1,direction.reduce((v,x,i)=>v+x*afterDirection[i],0))));
 assert(turn>.1&&turn<.2,'Horizontal zenith drag should change direction smoothly, not only roll');
 const before=await page.evaluate(()=>__atlas.camera().fov);
 await page.mouse.move(1200,180);await page.keyboard.down('Control');await page.mouse.wheel(0,-100);await page.keyboard.up('Control');
 await page.waitForTimeout(100);assert(await page.evaluate(()=>__atlas.camera().fov)<before);
 await page.locator('#sun').click();await page.screenshot({path:path.join(out,'eclipse-sky-desktop.png')});
 await page.mouse.click(720,450);assert.equal(await page.locator('#selection').textContent(),'Moon');
 const download=page.waitForEvent('download');await page.locator('#png').click();
 await (await download).saveAs(path.join(out,'transparent-sky.png'));
 await page.locator('#event').selectOption('2023');
 console.log('annular',await page.locator('#sky-status').textContent());
 await page.locator('#event').selectOption('1999');
 await page.setViewportSize({width:412,height:915});
 await page.locator('[data-view="earth"]').click();await page.locator('#collapse').click();
 await page.screenshot({path:path.join(out,'earth-shadow-phone.png')});
 await page.locator('#collapse').click();await page.locator('#vantage').selectOption('orbital');await page.locator('#collapse').click();
 await page.screenshot({path:path.join(out,'footprint-orbital-phone.png')});
 await page.locator('[data-view="sky"]').click();
 const cdp=await page.context().newCDPSession(page);const start=await page.evaluate(()=>__atlas.camera().fov);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:140,y:250,id:1},{x:220,y:250,id:2}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:100,y:250,id:1},{x:260,y:250,id:2}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 assert(await page.evaluate(()=>__atlas.camera().fov)<start);
 console.log('PASS: cultures, Ctrl+wheel, pinch, Moon tap label, transparent export, annular view, desktop/mobile rendering.');
 console.log('errors',errors);await browser.close();server.close();
 if(errors.some(e=>!e.includes('404')))process.exitCode=1;
})().catch(e=>{console.error(e);process.exit(1);});
