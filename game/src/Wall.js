import * as THREE from 'three';

export class Wall {
    constructor(scene, position, rotation) {
        this.scene = scene;
        const geometry = new THREE.BoxGeometry(2, 1, 0.1); // Width of a tile, height, depth
        const material = new THREE.MeshStandardMaterial({ color: 0x8B4513 }); // SaddleBrown
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(position);
        this.mesh.rotation.copy(rotation);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;

        this.scene.add(this.mesh);
    }

    destroy() {
        this.scene.remove(this.mesh);
    }
}
