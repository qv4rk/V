import { baseMeshGroup, inkGroup, masterGroup } from './scene.js';
import { domElements } from './state.js';

export function clearInk() {
    while(inkGroup.children.length > 0) { 
        inkGroup.remove(inkGroup.children[0]); 
    }
}

export function loadModel() {
    const type = domElements.modelSelect.value;
    
    while(baseMeshGroup.children.length > 0) { 
        baseMeshGroup.remove(baseMeshGroup.children[0]); 
    }
    clearInk();
    masterGroup.rotation.set(0, 0, 0);

    if (type === 'male') {
        const man = new Male();
        man.scale.setScalar(25);
        man.position.y = -22;
        man.torso.turn = -25;
        man.r_arm.raise = 60;
        man.r_elbow.bend = 80;
        man.l_arm.straddle = 20;
        man.l_elbow.bend = 30;
        man.l_leg.raise = 25;
        man.l_knee.bend = 30;
        man.head.turn = 25;
        man.head.tilt = -10;
        baseMeshGroup.add(man);
    } else if (type === 'female') {
        const woman = new Female();
        woman.scale.setScalar(25);
        woman.position.y = -22;
        woman.torso.bend = 15;
        woman.r_arm.raise = 130;
        woman.r_elbow.bend = 120;
        woman.l_arm.straddle = -15;
        woman.r_leg.raise = 10;
        woman.l_leg.straddle = 15;
        woman.head.turn = -20;
        baseMeshGroup.add(woman);
    } else if (type === 'child') {
        const kid = new Child();
        kid.scale.setScalar(25);
        kid.position.y = -15;
        kid.r_arm.raise = 150;
        kid.l_arm.raise = 150;
        kid.r_elbow.bend = 20;
        kid.l_elbow.bend = 20;
        kid.head.tilt = -20;
        baseMeshGroup.add(kid);
    } else if (type === 'canvas') {
        const mat = new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.8 });
        const geo = new THREE.BoxGeometry(80, 100, 2);
        const mesh = new THREE.Mesh(geo, mat);
        baseMeshGroup.add(mesh);
    } else if (type === 'tunnel') {
        const cylMat = new THREE.MeshStandardMaterial({ color: 0x00d9ff, wireframe: true, side: THREE.DoubleSide });
        const geo = new THREE.CylinderGeometry(10, 12, 2, 6, 1, true);
        for (let i = 0; i < 150; i++) {
            const mesh = new THREE.Mesh(geo, cylMat);
            mesh.position.z = -i * 4;
            mesh.rotation.z = i * 0.15;
            mesh.rotation.x = Math.sin(i * 0.05) * 0.2; 
            mesh.rotation.y = Math.cos(i * 0.05) * 0.2;
            const scaleModifier = 1 + (i * 0.015);
            mesh.scale.set(scaleModifier, scaleModifier, 1);
            baseMeshGroup.add(mesh);
        }
    }
}
