import * as BABYLON from '@babylonjs/core';

export class Projectile {
    constructor(game, startPosition, targetPosition, speedModifier = 1) {
        this.game = game;
        this.scene = game.scene;
        this.baseSpeed = 15;
        this.speed = this.baseSpeed * speedModifier;
        this.damage = 10;
        this.isDisposed = false;

        // Create mesh
        this.mesh = BABYLON.MeshBuilder.CreateSphere("projectile", { diameter: 0.2 }, this.scene);
        this.mesh.position = startPosition.clone();

        const material = new BABYLON.StandardMaterial("projectileMat", this.scene);
        material.diffuseColor = new BABYLON.Color3(0, 1, 0); // Green
        material.emissiveColor = new BABYLON.Color3(0, 0.5, 0);
        this.mesh.material = material;

        // Calculate initial direction
        const direction = targetPosition.subtract(startPosition).normalize();
        this.velocity = direction.scale(this.speed);

        this.mesh.metadata = { projectileInstance: this };

        // Self-destruct timer
        setTimeout(() => this.dispose(), 2000);
    }

    update(delta) {
        if (this.isDisposed) return;

        // Move projectile
        const moveVector = this.velocity.scale(delta);
        this.mesh.position.addInPlace(moveVector);

        // Check for collision with enemies
        for (const bug of this.game.bugManager.bugs) {
            if (this.mesh.intersectsMesh(bug.mesh, false)) {
                bug.takeDamage(this.damage);
                this.dispose();
                return; // Stop processing after hitting one enemy
            }
        }
    }

    dispose() {
        if (this.isDisposed) return;
        this.isDisposed = true;
        this.game.removeProjectile(this); // Notify game to remove it from the main array
        this.mesh.dispose();
    }
}