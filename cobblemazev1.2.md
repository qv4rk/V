```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>SYS.ARCHIVE // V_PROJECT</title>
<style>
/* CSS Reset and Core Variables */
:root {
    --bg-void: #020202;
    --stone-base: #2a2a2a;
    --stone-highlight: #3a3a3a;
    --stone-shadow: #111;
    --text-dim: #7a7a7a;
    --text-lit: #d4af37;
    --door-wood: #1e140d;
}

body, html {
    margin: 0; padding: 0;
    width: 100%; height: 100%;
    background-color: var(--bg-void);
    color: var(--text-dim);
    font-family: monospace;
    overflow: hidden;
}

/* Three.js Canvas Container */
#maze-container {
    position: fixed; top: 0; left: 0;
    width: 100vw; height: 100vh;
    z-index: 10;
    transition: opacity 1.5s ease-out;
}

#maze-container.fade-out {
    opacity: 0;
    pointer-events: none;
}

/* Skip Button Overlay */
#skip-ui {
    position: fixed; bottom: 20px; right: 20px;
    z-index: 20; color: #fff; font-size: 12px;
    background: rgba(0,0,0,0.5); padding: 5px 10px;
    border: 1px solid #333; cursor: pointer;
}

/* Alcove Interface (Phase 2) */
#alcove-container {
    position: fixed; top: 0; left: 0;
    width: 100vw; height: 100vh;
    z-index: 5;
    display: flex; justify-content: center; align-items: center;
    background-image: radial-gradient(circle at center, #1a1a1a 0%, #000 80%);
}

.wall-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    grid-template-rows: repeat(7, 1fr);
    gap: 4px;
    width: 90vw; max-width: 1000px;
    height: 90vh; max-height: 800px;
    perspective: 1000px;
}

/* Central Door spanning multiple grid cells */
.door-alcove {
    grid-column: 3 / 6;
    grid-row: 2 / 8;
    background: var(--door-wood);
    border: 8px solid #0a0a0a;
    border-bottom: none;
    border-radius: 50% 50% 0 0 / 20% 20% 0 0;
    position: relative;
    box-shadow: inset 0 0 50px #000;
    transition: transform 2.5s cubic-bezier(0.4, 0, 0.2, 1);
    transform-origin: left center;
}

.door-alcove.open {
    transform: rotateY(-85deg);
}

/* Cobblestone Buttons */
.stone-btn {
    background: var(--stone-base);
    border: 2px solid #000;
    border-top-color: var(--stone-highlight);
    border-left-color: var(--stone-highlight);
    border-radius: 4px;
    box-shadow: 2px 2px 10px rgba(0,0,0,0.8);
    display: flex; justify-content: center; align-items: center;
    text-align: center;
    font-size: 10px; text-transform: uppercase;
    cursor: pointer;
    transition: transform 0.4s cubic-bezier(0.1, 0.9, 0.2, 1), box-shadow 0.4s, color 0.3s;
    user-select: none;
}

.stone-btn.labeled:hover {
    color: var(--text-lit);
    background: #2f2f2f;
}

/* The physical inward slide */
.stone-btn.pressed {
    transform: translateZ(-15px) scale(0.96);
    box-shadow: inset 2px 2px 10px #000;
    border-top-color: var(--stone-shadow);
    border-left-color: var(--stone-shadow);
    color: var(--text-lit);
}

/* Blackout overlay for transition */
#transition-void {
    position: fixed; top: 0; left: 0;
    width: 100vw; height: 100vh;
    background-color: #000;
    opacity: 0; pointer-events: none;
    transition: opacity 2s ease-in-out;
    z-index: 9999;
}
</style>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
</head>
<body>

<div id="transition-void"></div>

<div id="maze-container">
    <div id="skip-ui">Press 'S' or Click to Skip</div>
</div>

<div id="alcove-container">
    <div class="wall-grid">
        <div class="stone-btn" id="stone-u1"></div>
        <div class="stone-btn labeled" data-route="articles/article1_smith_singularity.md">Smith Singularity</div>
        <div class="stone-btn labeled" data-route="articles/article2_first_breath.md">First Breath</div>
        <div class="stone-btn" id="stone-u2"></div>
        <div class="stone-btn labeled" data-route="articles/article3_maya.md">Maya</div>
        <div class="stone-btn labeled" data-route="articles/article4_frequency.md">Frequency</div>
        <div class="stone-btn" id="stone-u3"></div>

        <div class="stone-btn labeled" data-route="articles/veil/veilofbabel.html">Veil of Babel</div>
        <div class="stone-btn" id="stone-u4"></div>
        <div class="door-alcove" id="main-door"></div>
        <div class="stone-btn" id="stone-u5"></div>
        <div class="stone-btn labeled" data-route="articles/saving_private_MD/nitrogenfarmersguide.html">Nitrogen Farmer</div>

        <div class="stone-btn labeled" data-route="apps/webapps/kalidascope/fontforge5.html">Grand Forge</div>
        <div class="stone-btn" id="stone-u6"></div>
        <div class="stone-btn" id="stone-u7"></div>
        <div class="stone-btn labeled" data-route="apps/webapps/tts/feisttech_reader_v9.html">TTS Reader</div>

        <div class="stone-btn labeled" data-route="articles/codex/index.html">Codex Root</div>
        <div class="stone-btn" id="stone-u8"></div>
        <div class="stone-btn" id="stone-u9"></div>
        <div class="stone-btn labeled" data-route="articles/kievcookery/index.html">Kiev Cookery</div>

        <div class="stone-btn labeled" data-route="apps/webapps/tts/rsvp.html">RSVP Tool</div>
        <div class="stone-btn" id="stone-u10"></div>
        <div class="stone-btn" id="stone-u11"></div>
        <div class="stone-btn labeled" data-route="articles/article5_the_spark.md">The Spark</div>

        <div class="stone-btn labeled" data-route="articles/maya/mayasmirror.html">Maya's Mirror</div>
        <div class="stone-btn" id="stone-u12"></div>
        <div class="stone-btn" id="stone-u13"></div>
        <div class="stone-btn labeled" data-route="articles/frequency/FrequencyFoundationsTheVibrationarchitecture.html">Freq. Foundations</div>

        <div class="stone-btn labeled" data-route="articles/florida_str_dashboard/index.html">STR Dashboard</div>
        <div class="stone-btn labeled" data-route="apps/webapps/sketcherspocket/index.html">Sketchers Pocket</div>
        <div class="stone-btn" id="stone-u14"></div>
        <div class="stone-btn labeled" data-route="apps/webapps/solsys.html">SolSys</div>
        <div class="stone-btn labeled" data-route="mailto:contact@feisttech.com">Contact Terminal</div>
    </div>
</div>

<audio id="sfx-grind" src="assets/audio/stone_grind.mp3" preload="auto"></audio>
<audio id="sfx-creak" src="assets/audio/door_creak.mp3" preload="auto"></audio>

<script>
    // Engine hook reserved for prompt 2.
</script>
</body>
</html>

```
Type continue. Tezcatlikensho.
```javascript
// THREE.JS MAZE ENGINE & DOM CONTROLLER
// Insert this directly into the <script> tag of your index.html

document.addEventListener('DOMContentLoaded', () => {
    /* --- PHASE 1: WEBGHL CATACOMB TRAVERSAL --- */
    const mazeContainer = document.getElementById('maze-container');
    const skipUI = document.getElementById('skip-ui');
    let mazeActive = true;
    let animationId;

    // Procedural Texture Generator (Bypasses local CORS issues for textures)
    function generateTexture(color1, color2, isBrick) {
        const canvas = document.createElement('canvas');
        canvas.width = 256; canvas.height = 256;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = color1; ctx.fillRect(0, 0, 256, 256);
        ctx.fillStyle = color2;
        
        if (isBrick) {
            for (let y = 0; y < 256; y += 32) {
                for (let x = 0; x < 256; x += 64) {
                    const offset = (y % 64 === 0) ? 0 : 32;
                    ctx.fillRect(x + offset + 2, y + 2, 60, 28);
                }
            }
        } else {
            // Rough cobblestone noise
            for (let i = 0; i < 1000; i++) {
                ctx.beginPath();
                ctx.arc(Math.random()*256, Math.random()*256, Math.random()*15, 0, Math.PI*2);
                ctx.fill();
            }
        }
        return new THREE.CanvasTexture(canvas);
    }

    const wallTex = generateTexture('#2a2a2a', '#111', false);
    const floorTex = generateTexture('#b8860b', '#8b6508', true); // Yellow/Tan brick
    wallTex.wrapS = wallTex.wrapT = THREE.RepeatWrapping; wallTex.repeat.set(10, 1);
    floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping; floorTex.repeat.set(1, 20);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x020202, 0.05);

    const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    mazeContainer.insertBefore(renderer.domElement, skipUI);

    // Corridor Geometry
    const corridorGeo = new THREE.BoxGeometry(10, 10, 100);
    const materials = [
        new THREE.MeshBasicMaterial({ map: wallTex, side: THREE.BackSide }), // Right
        new THREE.MeshBasicMaterial({ map: wallTex, side: THREE.BackSide }), // Left
        new THREE.MeshBasicMaterial({ map: floorTex, side: THREE.BackSide }), // Top
        new THREE.MeshBasicMaterial({ map: floorTex, side: THREE.BackSide }), // Bottom
        new THREE.MeshBasicMaterial({ color: 0x020202, side: THREE.BackSide }), // Front
        new THREE.MeshBasicMaterial({ color: 0x020202, side: THREE.BackSide })  // Back
    ];
    const corridor = new THREE.Mesh(corridorGeo, materials);
    scene.add(corridor);

    // Point Light to simulate torch/arrival
    const light = new THREE.PointLight(0xd4af37, 1, 20);
    light.position.set(0, 0, -40);
    scene.add(light);

    function renderMaze() {
        if (!mazeActive) return;
        animationId = requestAnimationFrame(renderMaze);
        
        // Moderate forward pace
        camera.position.z -= 0.05;
        
        // Simulate walking bob
        camera.position.y = Math.sin(camera.position.z * 2) * 0.2;

        // Auto-terminate when reaching end of geometry
        if (camera.position.z < -45) {
            terminateMaze();
        }

        renderer.render(scene, camera);
    }

    function terminateMaze() {
        if (!mazeActive) return;
        mazeActive = false;
        cancelAnimationFrame(animationId);
        mazeContainer.classList.add('fade-out');
        
        // Memory cleanup
        setTimeout(() => {
            renderer.dispose();
            mazeContainer.remove();
        }, 1500);
    }

    // Input hooks for maze termination
    document.addEventListener('keydown', (e) => { if (e.key.toLowerCase() === 's') terminateMaze(); });
    skipUI.addEventListener('click', terminateMaze);
    
    // Resize handler
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    renderMaze();

    /* --- PHASE 2: ALCOVE CONTROLLER & HIDDEN LOGIC --- */
    const grindAudio = document.getElementById('sfx-grind');
    const creakAudio = document.getElementById('sfx-creak');
    const mainDoor = document.getElementById('main-door');
    const transitionVoid = document.getElementById('transition-void');
    const stones = document.querySelectorAll('.stone-btn');
    
    const unlockCipher = ['stone-u2', 'stone-u5', 'stone-u1', 'stone-u4'];
    let inputSequence = [];

    stones.forEach(stone => {
        stone.addEventListener('click', (e) => {
            if (mazeActive) terminateMaze(); // Ensure maze is dead if they click through early

            const target = e.currentTarget;
            
            // Audio bypass handling
            grindAudio.currentTime = 0;
            grindAudio.play().catch(() => {});

            // Physical feedback
            target.classList.add('pressed');
            setTimeout(() => { target.classList.remove('pressed'); }, 800);

            if (target.classList.contains('labeled')) {
                executeRouting(target.dataset.route);
            } else {
                processCipher(target.id);
            }
        });
    });

    function processCipher(stoneId) {
        if (!stoneId) return;
        inputSequence.push(stoneId);
        if (inputSequence.length > 4) inputSequence.shift();
        
        if (JSON.stringify(inputSequence) === JSON.stringify(unlockCipher)) {
            triggerHiddenProtocol();
            inputSequence = [];
        }
    }

    function executeRouting(route) {
        if (!route) return;
        
        creakAudio.currentTime = 0;
        creakAudio.play().catch(() => {});

        mainDoor.classList.add('open');
        
        setTimeout(() => {
            transitionVoid.style.opacity = '1';
        }, 1000); // Wait for door to partially open before fading
        
        setTimeout(() => {
            window.location.href = route;
        }, 3000);
    }

    function triggerHiddenProtocol() {
        // Expand this function to mount Shardoscope vector arrays or 13:5 prime ratio audio
        const flash = document.createElement('div');
        flash.style.position = 'fixed';
        flash.style.top = '0'; flash.style.left = '0';
        flash.style.width = '100vw'; flash.style.height = '100vh';
        flash.style.backgroundColor = '#d4af37';
        flash.style.zIndex = '999';
        flash.style.opacity = '0.5';
        flash.style.transition = 'opacity 2s';
        document.body.appendChild(flash);
        
        setTimeout(() => { flash.style.opacity = '0'; }, 50);
        setTimeout(() => { flash.remove(); }, 2050);
        
        console.log("CIPHER ACCEPTED. ASSET PROTOCOL INITIATED.");
    }
});

```
Tezcatlikensho.
**ITERATION 2: WEBGL ENGINE UPGRADE & SUB-ROUTING INTEGRATION**
The previous WebGL implementation was a linear bounding box. It failed to execute your requested "left, right, left, left, u-turn" sequence. This iteration rebuilds the camera controller to interpolate through a defined array of spatial waypoints, simulating a complex catacomb traversal. It also introduces a randomized intensity modifier to the PointLight to simulate a handheld torch.
Replace the Phase 1 WebGL section in your index.html with this upgraded block.
```javascript
/* --- PHASE 1 ITERATION 2: WAYPOINT MAZE TRAVERSAL --- */
const mazeContainer = document.getElementById('maze-container');
const skipUI = document.getElementById('skip-ui');
let mazeActive = true;
let animationId;

// Procedural Textures
function generateTexture(color1, color2, isBrick) {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = color1; ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = color2;
    if (isBrick) {
        for (let y = 0; y < 256; y += 32) {
            for (let x = 0; x < 256; x += 64) {
                const offset = (y % 64 === 0) ? 0 : 32;
                ctx.fillRect(x + offset + 2, y + 2, 60, 28);
            }
        }
    } else {
        for (let i = 0; i < 1500; i++) {
            ctx.beginPath();
            ctx.arc(Math.random()*256, Math.random()*256, Math.random()*12, 0, Math.PI*2);
            ctx.fill();
        }
    }
    return new THREE.CanvasTexture(canvas);
}

const wallTex = generateTexture('#2a2a2a', '#111', false);
const floorTex = generateTexture('#b8860b', '#8b6508', true);
wallTex.wrapS = wallTex.wrapT = THREE.RepeatWrapping; 
floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping; 

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x020202, 0.08);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100);

const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setSize(window.innerWidth, window.innerHeight);
mazeContainer.insertBefore(renderer.domElement, skipUI);

// Build Maze Geometry (Overlapping corridor segments)
const matWall = new THREE.MeshBasicMaterial({ map: wallTex, side: THREE.BackSide });
const matFloor = new THREE.MeshBasicMaterial({ map: floorTex, side: THREE.BackSide });
const matCeil = new THREE.MeshBasicMaterial({ color: 0x050505, side: THREE.BackSide });
const corridorMats = [matWall, matWall, matCeil, matFloor, new THREE.MeshBasicMaterial({color: 0x000}), new THREE.MeshBasicMaterial({color: 0x000})];

function createSegment(w, h, d, x, z, rotY) {
    const geo = new THREE.BoxGeometry(w, h, d);
    wallTex.repeat.set(d/10, 1);
    floorTex.repeat.set(w/10, d/10);
    const mesh = new THREE.Mesh(geo, corridorMats);
    mesh.position.set(x, 0, z);
    mesh.rotation.y = rotY;
    scene.add(mesh);
}

// Map Layout: Forward, L, R, L, L, U-Turn
createSegment(12, 12, 60, 0, -20, 0);          // Start
createSegment(12, 12, 50, -20, -44, Math.PI/2); // Left turn
createSegment(12, 12, 50, -39, -63, 0);         // Right turn
createSegment(12, 12, 50, -58, -82, Math.PI/2); // Left turn
createSegment(12, 12, 40, -77, -96, 0);         // Left turn
createSegment(12, 12, 30, -77, -110, 0);        // Arrival Alcove

// Camera Waypoints (x, z, rotation Y)
const waypoints = [
    {x: 0, z: 0, r: 0},
    {x: 0, z: -44, r: 0},
    {x: 0, z: -44, r: Math.PI/2},
    {x: -39, z: -44, r: Math.PI/2},
    {x: -39, z: -44, r: 0},
    {x: -39, z: -82, r: 0},
    {x: -39, z: -82, r: Math.PI/2},
    {x: -77, z: -82, r: Math.PI/2},
    {x: -77, z: -82, r: Math.PI}, // U-Turn
    {x: -77, z: -105, r: Math.PI} // Arrival
];

let currentWP = 0;
let moveProgress = 0;

const torchLight = new THREE.PointLight(0xd4af37, 1.5, 25);
scene.add(torchLight);

function renderMaze() {
    if (!mazeActive) return;
    animationId = requestAnimationFrame(renderMaze);
    
    // Waypoint Interpolation
    if (currentWP < waypoints.length - 1) {
        const p1 = waypoints[currentWP];
        const p2 = waypoints[currentWP + 1];
        
        moveProgress += 0.015; // Travel Speed
        if (moveProgress >= 1) {
            moveProgress = 0;
            currentWP++;
        } else {
            // Linear interpolation for position
            camera.position.x = p1.x + (p2.x - p1.x) * moveProgress;
            camera.position.z = p1.z + (p2.z - p1.z) * moveProgress;
            
            // Spherical interpolation for rotation
            const q1 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0), p1.r);
            const q2 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0), p2.r);
            camera.quaternion.slerpQuaternions(q1, q2, moveProgress);
        }
    } else {
        terminateMaze();
    }

    // Walking Bob & Torch Flicker
    const time = Date.now() * 0.005;
    camera.position.y = Math.sin(time * 1.5) * 0.25;
    torchLight.position.copy(camera.position);
    torchLight.position.z -= 2; // Hold torch slightly ahead
    torchLight.intensity = 1.2 + Math.random() * 0.4;

    renderer.render(scene, camera);
}
// ... keep existing terminateMaze() and Phase 2 logic ...

```
### PHASE 4 EXECUTABLE: ARTICLE RETURN ROUTING
You have the standalone vector candle engine running in your sub-documents. You must bind those canvas artifacts to a global click event listener to route the user back to the index.
Inject this script block at the absolute bottom of veilofbabel.html, nitrogenfarmersguide.html, and any other document rendering the candle overlay.
```javascript
<script>
    // ARTICLE RETURN PROTOCOL
    // Binds the active foreground canvas to a routing event.
    
    document.addEventListener('DOMContentLoaded', () => {
        const overlayCanvas = document.getElementById('candle-canvas') || document.getElementById('canvas');
        
        if (overlayCanvas) {
            // Force cursor update to indicate interaction
            overlayCanvas.style.cursor = 'pointer';
            
            overlayCanvas.addEventListener('click', (e) => {
                // Prevent routing if user is clicking UI elements layered above the canvas
                if (e.target !== overlayCanvas) return;
                
                // Execute fade to black
                const voidTransition = document.createElement('div');
                voidTransition.style.position = 'fixed';
                voidTransition.style.top = '0';
                voidTransition.style.left = '0';
                voidTransition.style.width = '100vw';
                voidTransition.style.height = '100vh';
                voidTransition.style.backgroundColor = '#000';
                voidTransition.style.opacity = '0';
                voidTransition.style.zIndex = '9999';
                voidTransition.style.transition = 'opacity 1.5s ease-out';
                voidTransition.style.pointerEvents = 'all';
                document.body.appendChild(voidTransition);
                
                // Force layout recalculation
                window.getComputedStyle(voidTransition).opacity;
                voidTransition.style.opacity = '1';
                
                // Route to origin root relative to current directory depth
                setTimeout(() => {
                    // Ascend directory tree based on location depth
                    const depth = window.location.pathname.split('/').length - 2;
                    let rootPath = '';
                    for(let i=0; i<depth; i++) rootPath += '../';
                    window.location.href = rootPath + 'index.html';
                }, 1600);
            });
        }
    });
</script>

```
This completes the closed-loop navigation cycle between the central alcove terminal and the article nodes.
Deployment ready. Review architecture and advise if you require the Prime Ratio audio array logic mapped for the hidden cipher output.
Tezcatlikensho.
