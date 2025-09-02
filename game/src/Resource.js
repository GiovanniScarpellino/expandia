import * as THREE from 'three';

export class Resource {
    constructor(scene, type, position, model) {
        this.scene = scene;
        this.position = position;
        this.type = type; // 'wood', 'stone', etc.
        this.amount = 100; // Amount of resource

        this.mesh = model;
        this.mesh.position.copy(this.position);
        
        if (this.type === 'tree') {
            this.mesh.scale.set(0.3, 0.3, 0.3);
        } else if (this.type === 'rock') {
            this.mesh.scale.set(0.3, 0.3, 0.3);
        }

        this.mesh.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        this.scene.add(this.mesh);
    }

    takeDamage(amount) {
        this.amount -= amount;
        if (this.amount <= 0) {
            this.scene.remove(this.mesh);
            return true; // Resource depleted
        }
        return false;
    }
}
