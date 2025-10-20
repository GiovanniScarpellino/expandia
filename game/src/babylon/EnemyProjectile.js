import * as BABYLON from '@babylonjs/core';

export class EnemyProjectile {
    constructor(game, startPosition, targetPosition) {
        this.game = game;
        this.scene = game.scene;
        this.speed = 10;
        this.damage = 15;
        this.isDisposed = false;

        // Create mesh
        this.mesh = BABYLON.MeshBuilder.CreateSphere("enemyProjectile", { diameter: 0.3 }, this.scene);
        this.mesh.position = startPosition.clone();

        const material = new BABYLON.StandardMaterial("enemyProjectileMat", this.scene);
        material.diffuseColor = new BABYLON.Color3(1, 0.2, 0.2);
        material.emissiveColor = new BABYLON.Color3(0.8, 0.1, 0.1);
        this.mesh.material = material;

        // Calculate initial direction
        const direction = targetPosition.subtract(startPosition).normalize();
        this.velocity = direction.scale(this.speed);

        this.mesh.metadata = { projectileInstance: this };

        // Self-destruct timer
        setTimeout(() => this.dispose(), 3000);
    }

    update(delta) {
        if (this.isDisposed) return;

        // Move projectile
        const moveVector = this.velocity.scale(delta);
        this.mesh.position.addInPlace(moveVector);

        // Check for collision with the player
        if (this.mesh.intersectsMesh(this.game.player.hitbox, true)) {
            this.game.player.takeDamage(this.damage);
            this.dispose();
            return;
        }
    }

    dispose() {
        if (this.isDisposed) return;
        this.isDisposed = true;
        this.game.removeEnemyProjectile(this); // Will be implemented in BabylonGame.js
        this.mesh.dispose();
    }
}
