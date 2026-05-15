/**
 * PROJECT V // CATACOMBS ENGINE: RUN 1
 * Interactive WebGL Maze with GLTF Asset Loading and Canvas Textures.
 */

(function() {
    // --- SCENE SETUP ---
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x020202, 0.08);

    const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100);
    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('maze-container').insertBefore(renderer.domElement, document.getElementById('skip-ui'));

    const torchLight = new THREE.PointLight(0xd4af37, 1.5, 25);
    scene.add(torchLight);
    scene.add(new THREE.AmbientLight(0x111111));

    // --- ASSET MANAGEMENT (GLTF & Fallbacks) ---
    const loader = new THREE.GLTFLoader();
    let wallModel = null;
    let skeletonHandModel = null;
    let ojGloveModel = null;

    // Load placeholder models (Silently fails back to basic geometry if files don't exist yet)
    loader.load('cobble/assets/models/catacomb_wall.glb', (gltf) => { wallModel = gltf.scene; }, undefined, () => { console.log("Wall GLB not found yet. Using fallback blocks."); });
    loader.load('cobble/assets/models/skeleton_hand.glb', (gltf) => { skeletonHandModel = gltf.scene; }, undefined, () => { console.log("Skeleton GLB not found yet."); });
    loader.load('cobble/assets/models/oj_glove.glb', (gltf) => { ojGloveModel = gltf.scene; }, undefined, () => { console.log("Glove GLB not found yet."); });

    // --- VECTOR CANDLE SPRITE GENERATOR ---
    function createVectorCandleSprite() {
        const canvas = document.createElement('canvas');
        canvas.width = 64; canvas.height = 128;
        const ctx = canvas.getContext('2d');
        const texture = new THREE.CanvasTexture(canvas);
        
        const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, blending: THREE.AdditiveBlending });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.scale.set(4, 8, 1);
        
        // Custom update function attached to the sprite to animate the vector flicker
        let time = Math.random() * 100;
        sprite.userData.update = function() {
            time++;
            ctx.clearRect(0, 0, 64, 128);
            ctx.save();
            ctx.translate(32, 100);
            const flicker = (Math.random() * 0.2 + 0.8);
            const sway = Math.sin(time * 0.1) * 2;
            ctx.translate(sway, 0);
            ctx.shadowBlur = 15 * flicker;
            ctx.shadowColor = "#ffaa00";
            ctx.strokeStyle = `rgba(255, 180, 0, ${0.9 * flicker})`;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(-15 * flicker, -30, 0, -60 * flicker); 
            ctx.quadraticCurveTo(15 * flicker, -30, 0, 0); 
            ctx.stroke();
            ctx.restore();
            texture.needsUpdate = true;
        };
        return sprite;
    }

    // --- ENVIRONMENT BUILDER ---
    const candles = [];
    const interactiveWalls = []; // Track specific walls for the 'U' sequence dissolve

    function buildCorridor(x, z, rotY, isJunction = false, hasSecret = false) {
        const group = new THREE.Group();
        group.position.set(x, 0, z);
        group.rotation.y = rotY;

        // Fallback Geometry
        const matWall = new THREE.MeshLambertMaterial({ color: 0x2a2a2a });
        const geoWall = new THREE.BoxGeometry(1, 12, 20);
        
        // Left & Right Walls
        const leftWall = wallModel ? wallModel.clone() : new THREE.Mesh(geoWall, matWall);
        leftWall.position.set(-6, 0, 0);
        group.add(leftWall);

        const rightWall = wallModel ? wallModel.clone() : new THREE.Mesh(geoWall, matWall);
        rightWall.position.set(6, 0, 0);
        group.add(rightWall);

        if (hasSecret) {
            interactiveWalls.push(leftWall); // Mark for OJ sequence destruction
            if(skeletonHandModel) {
                const skel = skeletonHandModel.clone();
                skel.position.set(-5, 0, 0); // Protruding from left wall
                group.add(skel);
            } else {
                // Fallback white box for skeleton
                const box = new THREE.Mesh(new THREE.BoxGeometry(1,1,3), new THREE.MeshBasicMaterial({color:0xffffff}));
                box.position.set(-5, 0, 0);
                group.add(box);
            }
        }

        // Add a vector candle to this segment
        const candle = createVectorCandleSprite();
        candle.position.set(Math.random() > 0.5 ? 5.5 : -5.5, 2, 0); // Randomly on left or right wall
        group.add(candle);
        candles.push(candle);

        scene.add(group);
    }

    // Level Layout
    buildCorridor(0, -10, 0); // Start
    buildCorridor(0, -30, 0); // Segment 2
    buildCorridor(0, -50, 0, true, true); // Junction 1 (Has the Secret OJ Wall)
    
    // --- INTERACTIVE NAVIGATION (NODE SYSTEM) ---
    const nodes = [
        { id: 0, x: 0, z: 0, r: 0 },
        { id: 1, x: 0, z: -50, r: 0, choices: { 'w': 'win', 'a': 'lose', 'd': 'lose' } } 
    ];
    
    let currentNode = 0;
    let isMoving = false;
    let uiLocked = false;

    camera.position.set(nodes[0].x, 0, nodes[0].z);

    function handleInput(e) {
        if (uiLocked || !mazeActive) return;
        const key = e.key.toLowerCase();
        
        // Secret Sequence Override
        if (key === 'u') {
            triggerOJSequence();
            return;
        }

        if (currentNode === 0 && key === 'w') {
            moveToNode(1);
        } else if (currentNode === 1 && nodes[1].choices[key]) {
            if (nodes[1].choices[key] === 'win') {
                uiLocked = true;
                // Move forward then terminate to Alcove
                gsap.to(camera.position, { z: camera.position.z - 20, duration: 2, ease: "power1.inOut", onComplete: () => {
                    if(typeof terminateMaze === 'function') terminateMaze();
                }});
            } else {
                // Wrong Turn: Fade to black, loop to start
                uiLocked = true;
                gsap.to(camera.rotation, { y: camera.rotation.y + (key === 'a' ? Math.PI/2 : -Math.PI/2), duration: 1 });
                gsap.to(document.getElementById('transition-void'), { opacity: 1, duration: 1.5, delay: 0.5, onComplete: () => {
                    camera.position.set(nodes[0].x, 0, nodes[0].z);
                    camera.rotation.y = 0;
                    currentNode = 0;
                    gsap.to(document.getElementById('transition-void'), { opacity: 0, duration: 1 });
                    uiLocked = false;
                }});
            }
        }
    }
    document.addEventListener('keydown', handleInput);

    function moveToNode(targetIndex) {
        isMoving = true;
        uiLocked = true;
        const target = nodes[targetIndex];
        
        gsap.to(camera.position, {
            x: target.x, z: target.z,
            duration: 3, ease: "power2.inOut",
            onComplete: () => {
                currentNode = targetIndex;
                isMoving = false;
                uiLocked = false;
            }
        });
    }

    // --- THE SECRET 'U' SEQUENCE (OJ GLOVE) ---
    function triggerOJSequence() {
        uiLocked = true;
        isMoving = false;

        const tl = gsap.timeline();

        // 1. Pan Left slowly
        tl.to(camera.rotation, { y: Math.PI / 4, duration: 2, ease: "power1.inOut" });
        
        // 2. Pan sweeping Right, locking onto the wall at x=-6 (left wall of node 1)
        tl.to(camera.rotation, { y: -Math.PI / 3.5, duration: 3, ease: "power1.inOut" });

        // 3. Spawn OJ Glove in front of camera
        tl.add(() => {
            const glove = ojGloveModel ? ojGloveModel : new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), new THREE.MeshBasicMaterial({color: 0x5c4033}));
            glove.position.copy(camera.position);
            glove.position.z -= 1; // In front of face
            glove.position.y -= 0.5;
            scene.add(glove);

            // 4. Move glove forward to meet skeleton
            gsap.to(glove.position, { x: -4, z: -50, y: 0, duration: 2, ease: "power2.in" });
        });

        // 5. Shift/Dissolve the bricks
        tl.add(() => {
            interactiveWalls.forEach(wall => {
                gsap.to(wall.position, { x: -15, y: Math.random() * 10 - 5, z: wall.position.z - 10, duration: 2, ease: "back.in(2)" });
                if(wall.material) gsap.to(wall.material, { opacity: 0, transparent: true, duration: 2 });
            });
        }, "+=1.5");

        // 6. Warp camera into the newly created void
        tl.to(camera.position, { x: -20, z: -55, duration: 1.5, ease: "power4.in" }, "+=0.5");
        tl.to(document.getElementById('transition-void'), { opacity: 1, duration: 1 }, "-=1");

        // 7. Route to door
        tl.add(() => {
            if(typeof terminateMaze === 'function') terminateMaze();
        });
    }

    // --- RENDER LOOP ---
    function animate() {
        if (!mazeActive) return;
        requestAnimationFrame(animate);

        // Update all vector candles
        candles.forEach(c => c.userData.update());

        // Head bobbing & Torch flicker
        if (!uiLocked) {
            const time = Date.now() * 0.005;
            if (isMoving) camera.position.y = Math.sin(time * 2) * 0.3; // Walk bob
            torchLight.position.copy(camera.position);
            torchLight.position.z -= 1; // Hold torch forward
            torchLight.intensity = 1.2 + Math.random() * 0.4;
        }

        renderer.render(scene, camera);
    }
    animate();

})();

