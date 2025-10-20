import * as BABYLON from '@babylonjs/core';
import { COLLISION_GROUPS } from '../BabylonGame.js';
import { EnemyProjectile } from './EnemyProjectile.js';

export class Watchtower {
    constructor(game, position) {
        this.game = game;
        this.scene = game.scene;
        this.isDisposed = false;

        // Stats
        this.maxHealth = 50;
        this.health = this.maxHealth;
        this.attackRange = 15;
        this.attackCooldown = 2000; // ms
        this.lastAttackTime = 0;
        this.xpValue = 50;

        // Visual representation
        this.mesh = BABYLON.MeshBuilder.CreateCylinder("watchtower", { height: 2, diameter: 0.8 }, this.scene);
        this.mesh.position = position;
        this.mesh.position.y = 1;

        const material = new BABYLON.StandardMaterial("watchtowerMat", this.scene);
        material.diffuseColor = new BABYLON.Color3(0.2, 0.2, 0.3);
        material.emissiveColor = new BABYLON.Color3(0.8, 0.1, 0.1);
        this.mesh.material = material;

        // Metadata and collision
        this.mesh.metadata = { 
            type: 'enemy',
            instance: this,
            takeDamage: (amount) => this.takeDamage(amount)
        };
        this.mesh.checkCollisions = true;
        this.mesh.collisionGroup = COLLISION_GROUPS.NPC;
        this.mesh.collisionMask = COLLISION_GROUPS.TERRAIN | COLLISION_GROUPS.WALL | COLLISION_GROUPS.PLAYER | COLLISION_GROUPS.PROJECTILE;

        this.game.addShadowCaster(this.mesh);
    }

    takeDamage(amount) {
        if (this.isDisposed) return;

        this.health -= amount;
        // Add a flash effect later if needed

        if (this.health <= 0) {
            this.dispose();
        }
    }

    update(delta) {
        if (this.isDisposed || !this.game.player) return;

        const playerPosition = this.game.player.hitbox.position;
        const myPosition = this.mesh.position;
        const direction = playerPosition.subtract(myPosition);
        const distance = direction.length();

        // Rotate to face the player
        if (direction.lengthSquared() > 0.01) {
            this.mesh.rotation.y = Math.atan2(direction.x, direction.z) + Math.PI;
        }

        // Attack if player is in range
        if (distance <= this.attackRange) {
            const now = Date.now();
            if (now - this.lastAttackTime > this.attackCooldown) {
                this.lastAttackTime = now;
                this.fire();
            }
        }
    }

    fire() {
        const startPosition = this.mesh.position.clone().add(new BABYLON.Vector3(0, 0.5, 0));
        const targetPosition = this.game.player.hitbox.position.clone();
        const projectile = new EnemyProjectile(this.game, startPosition, targetPosition);
        this.game.addEnemyProjectile(projectile);
    }

    dispose() {
        if (this.isDisposed) return;
        this.isDisposed = true;
        
        if (this.game.player) {
            this.game.player.addXp(this.xpValue);
        }

        this.game.enemyManager.removeEnemy(this);

        this.mesh.dispose();
    }
}
