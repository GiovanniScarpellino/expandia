import * as THREE from 'three';

export class Resource {
    constructor(scene, type, position) {
        this.scene = scene;
        this.type = type;
        let geometry, material;
        if (type === 'tree') {
            geometry = new THREE.BoxGeometry(0.2, 0.5, 0.2);
            material = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
        } else { // rock
            geometry = new THREE.IcosahedronGeometry(0.2, 0);
            material = new THREE.MeshStandardMaterial({ color: 0x808080 });
        }
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(position);
        this.mesh.castShadow = true;
        this.mesh.userData = { type, targeted: false };
        this.scene.add(this.mesh);
    }

    destroy() {
        this.scene.remove(this.mesh);
    }
}
