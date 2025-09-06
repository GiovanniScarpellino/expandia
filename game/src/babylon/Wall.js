import * as BABYLON from '@babylonjs/core';

export class Wall {
    constructor(scene, position, rotation) {
        this.scene = scene;

        // Create the wall mesh
        this.mesh = BABYLON.MeshBuilder.CreateBox("wall", { width: 2, height: 1, depth: 0.2 }, scene);
        this.mesh.position = position;
        this.mesh.rotationQuaternion = rotation;
        this.mesh.checkCollisions = true;
        
        const wallMat = new BABYLON.StandardMaterial("wallMat", scene);
        wallMat.diffuseColor = BABYLON.Color3.FromHexString("#8B4513"); // SaddleBrown
        this.mesh.material = wallMat;

        this.mesh.receiveShadows = true;

        // Wall stats
        this.health = 100;
        this.maxHealth = 100;

        this.mesh.metadata = { 
            type: 'wall',
            instance: this
        };
    }

    takeDamage(amount) {
        this.health -= amount;
        if (this.health <= 0) {
            this.dispose();
        }
    }

    dispose() {
        this.mesh.dispose();
    }
}