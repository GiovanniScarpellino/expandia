import * as BABYLON from '@babylonjs/core';
import { COLLISION_GROUPS } from '../BabylonGame.js';

export class Bug {
    constructor(game, position) {
        this.game = game;
        this.scene = game.scene;
        this.speed = 1.0; // units per second
        this.isDisposed = false;

        // Stats
        this.maxHealth = 30;
        this.health = this.maxHealth;
        this.attackDamage = 10;
        this.attackRange = 1.2;
        this.attackCooldown = 1000; // ms
        this.lastAttackTime = 0;
        this.xpValue = 25;

        // Flash effect
        this.flashTimeout = null;
        this.originalEmissiveColor = new BABYLON.Color3(0.4, 0, 0);

        // Visual representation
        const hitboxWidth = 0.6;
        const hitboxDepth = 1.5;
        this.mesh = BABYLON.MeshBuilder.CreateBox("bugHitbox", { width: hitboxWidth, height: 0.5, depth: hitboxDepth }, this.scene);
        this.mesh.position = position;
        this.mesh.isVisible = false; // The main hitbox is invisible

        const segmentMaterial = new BABYLON.StandardMaterial("bugMat", this.scene);
        segmentMaterial.diffuseColor = new BABYLON.Color3(1.0, 0, 0); // Red
        segmentMaterial.emissiveColor = this.originalEmissiveColor;

        // Create visible segments
        const segmentCount = 4;
        for (let i = 0; i < segmentCount; i++) {
            const segment = BABYLON.MeshBuilder.CreateBox(`bug_segment_${i}`, { size: 0.4 }, this.scene);
            segment.material = segmentMaterial;
            segment.parent = this.mesh; // Parent to the main hitbox
            segment.position.z = (i - (segmentCount - 1) / 2) * 0.4;
            segment.checkCollisions = false;
            this.game.addShadowCaster(segment);
        }

        // Metadata and collision are set on the main invisible mesh
        this.mesh.metadata = { 
            type: 'enemy',
            instance: this,
            takeDamage: (amount) => this.takeDamage(amount)
        };
        this.mesh.checkCollisions = true;
        this.mesh.collisionGroup = COLLISION_GROUPS.NPC;
        this.mesh.collisionMask = COLLISION_GROUPS.TERRAIN | COLLISION_GROUPS.WALL | COLLISION_GROUPS.PLAYER;
        this.mesh.ellipsoid = new BABYLON.Vector3(hitboxWidth / 2, 0.25, hitboxDepth / 2);
    }

    takeDamage(amount) {
        if (this.isDisposed) return;

        this.health -= amount;
        this.flash();

        if (this.health <= 0) {
            this.dispose();
        }
    }

    flash() {
        // Clear any existing flash timeout to reset the timer
        if (this.flashTimeout) {
            clearTimeout(this.flashTimeout);
        }

        // Set to white
        this.mesh.getChildMeshes().forEach(child => {
            if (child.material) {
                child.material.emissiveColor = new BABYLON.Color3(1, 1, 1);
            }
        });

        // Schedule the color restoration
        this.flashTimeout = setTimeout(() => {
            if (!this.isDisposed) {
                this.mesh.getChildMeshes().forEach(child => {
                    if (child.material) {
                        child.material.emissiveColor = this.originalEmissiveColor;
                    }
                });
            }
            this.flashTimeout = null; // Clear the timeout handle
        }, 100);
    }

    update(delta) {
        if (this.isDisposed || !this.game.player) return;

        const playerPosition = this.game.player.hitbox.position;
        const myPosition = this.mesh.position;
        const direction = playerPosition.subtract(myPosition);
        const distance = direction.length();

        // Attack or Move
        if (distance <= this.attackRange) {
            // Attack
            const now = Date.now();
            if (now - this.lastAttackTime > this.attackCooldown) {
                this.lastAttackTime = now;
                this.game.player.takeDamage(this.attackDamage);
                console.log(`Bug attacked player for ${this.attackDamage} damage!`);
            }
        } else {
            // Move
            direction.normalize();
            const moveVector = direction.scale(this.speed * delta);
            this.mesh.moveWithCollisions(moveVector);

            // Rotate to face the player
            this.mesh.rotationQuaternion = BABYLON.Quaternion.FromEulerAngles(0, Math.atan2(direction.x, direction.z), 0);
        }
    }

    dispose() {
        if (this.isDisposed) return;
        this.isDisposed = true;
        
        if (this.game.player) {
            this.game.player.addXp(this.xpValue);
        }

        // Notify EnemyManager
        this.game.enemyManager.removeEnemy(this);

        this.mesh.dispose();
    }
}
