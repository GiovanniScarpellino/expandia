import * as BABYLON from '@babylonjs/core';

export class Projectile {
    constructor(game, startPosition, targetPosition, speedModifier = 1) {
        this.game = game;
        this.scene = game.scene;
        this.baseSpeed = 15;
        this.speed = this.baseSpeed * speedModifier;
        this.damage = 10;
        this.isDisposed = false;

        // Create an egg-shaped mesh
        this.mesh = BABYLON.MeshBuilder.CreateSphere("projectile", { diameterX: 0.25, diameterY: 0.35, diameterZ: 0.25 }, this.scene);
        this.mesh.position = startPosition.clone();

        const material = new BABYLON.StandardMaterial("projectileMat", this.scene);
        material.diffuseColor = new BABYLON.Color3(0.95, 0.95, 0.85); // Eggshell color
        this.mesh.material = material;

        // Calculate initial direction
        const direction = targetPosition.subtract(startPosition).normalize();
        this.velocity = direction.scale(this.speed);

        this.mesh.metadata = { projectileInstance: this };

        // Self-destruct timer
        setTimeout(() => this.dispose(false), 2000); // Dispose without impact effects if timer runs out
    }

    update(delta) {
        if (this.isDisposed) return;

        // Move projectile
        const moveVector = this.velocity.scale(delta);
        this.mesh.position.addInPlace(moveVector);

        // Add a tumbling rotation effect
        this.mesh.rotation.x += 0.1;
        this.mesh.rotation.z += 0.1;

        // Check for collision with enemies
        for (const enemy of this.game.enemyManager.enemies) {
            if (this.mesh.intersectsMesh(enemy.mesh, false)) {
                enemy.takeDamage(this.damage);
                this.dispose(true); // Dispose with impact effects
                return; 
            }
        }
    }

    dispose(hit) {
        if (this.isDisposed) return;
        this.isDisposed = true;

        if (hit) {
            this.createImpactEffects();
        }

        this.game.removeProjectile(this);
        this.mesh.dispose();
    }

    createImpactEffects() {
        const impactPosition = this.mesh.position.clone();

        // 1. Yolk Splat Decal
        const decal = BABYLON.MeshBuilder.CreatePlane("yolkSplat", { size: 0.8 }, this.scene);
        decal.position = new BABYLON.Vector3(impactPosition.x, 0.01, impactPosition.z);
        decal.rotation.x = Math.PI / 2;
        decal.material = this.game.yolkSplatMaterial;

        setTimeout(() => decal.dispose(), 5000);

        // 2. Shell Particle Explosion
        const particleSystem = new BABYLON.ParticleSystem("particles", 50, this.scene);
        particleSystem.particleTexture = new BABYLON.Texture("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/wcAAwAB/epv2AAAAABJRU5ErkJggg==", this.scene); // 1x1 white pixel
        particleSystem.emitter = impactPosition;
        particleSystem.minEmitBox = new BABYLON.Vector3(-0.1, 0, -0.1);
        particleSystem.maxEmitBox = new BABYLON.Vector3(0.1, 0, 0.1);

        particleSystem.color1 = new BABYLON.Color4(0.95, 0.95, 0.85, 1.0);
        particleSystem.color2 = new BABYLON.Color4(0.8, 0.8, 0.7, 1.0);
        particleSystem.colorDead = new BABYLON.Color4(0, 0, 0, 0.0);

        particleSystem.minSize = 0.05;
        particleSystem.maxSize = 0.1;

        particleSystem.minLifeTime = 0.3;
        particleSystem.maxLifeTime = 0.8;

        particleSystem.emitRate = 500;
        particleSystem.manualEmitCount = 50;
        particleSystem.minEmitPower = 1;
        particleSystem.maxEmitPower = 3;
        particleSystem.updateSpeed = 0.01;

        particleSystem.direction1 = new BABYLON.Vector3(-1, 4, -1);
        particleSystem.direction2 = new BABYLON.Vector3(1, 8, 1);
        particleSystem.gravity = new BABYLON.Vector3(0, -9.81, 0);

        particleSystem.disposeOnStop = true;
        particleSystem.start();
    }
}