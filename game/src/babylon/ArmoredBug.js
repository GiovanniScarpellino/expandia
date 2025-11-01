import * as BABYLON from '@babylonjs/core';
import { COLLISION_GROUPS } from '../BabylonGame.js';

export class ArmoredBug {
    constructor(game, position) {
        this.game = game;
        this.scene = game.scene;
        this.speed = 0.6; // Slower than the normal bug
        this.isDisposed = false;

        // Stats - tougher than the normal bug
        this.maxHealth = 80;
        this.health = this.maxHealth;
        this.attackDamage = 15;
        this.attackRange = 1.2;
        this.attackCooldown = 1500; // ms
        this.lastAttackTime = 0;
        this.xpValue = 50;

        // Flash effect
        this.flashTimeout = null;
        this.originalEmissiveColor = new BABYLON.Color3(0.1, 0.1, 0.1);

        // Visual representation
        const hitboxWidth = 0.8;
        const hitboxDepth = 1.8;
        this.mesh = BABYLON.MeshBuilder.CreateBox("armoredBugHitbox", { width: hitboxWidth, height: 0.6, depth: hitboxDepth }, this.scene);
        this.mesh.position = position;
        this.mesh.isVisible = false; // The main hitbox is invisible

        const segmentMaterial = new BABYLON.StandardMaterial("armoredBugMat", this.scene);
        segmentMaterial.diffuseColor = new BABYLON.Color3(0.3, 0.3, 0.3); // Grey
        segmentMaterial.emissiveColor = this.originalEmissiveColor;
        segmentMaterial.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);

        // Create visible segments
        const segmentCount = 3;
        for (let i = 0; i < segmentCount; i++) {
            const segment = BABYLON.MeshBuilder.CreateBox(`armoredbug_segment_${i}`, { size: 0.7 }, this.scene);
            segment.material = segmentMaterial;
            segment.parent = this.mesh; // Parent to the main hitbox
            segment.position.z = (i - (segmentCount - 1) / 2) * 0.6;
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
        this.mesh.ellipsoid = new BABYLON.Vector3(hitboxWidth / 2, 0.3, hitboxDepth / 2);
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
        if (this.flashTimeout) {
            clearTimeout(this.flashTimeout);
        }

        this.mesh.getChildMeshes().forEach(child => {
            if (child.material) {
                child.material.emissiveColor = new BABYLON.Color3(1, 1, 1);
            }
        });

        this.flashTimeout = setTimeout(() => {
            if (!this.isDisposed) {
                this.mesh.getChildMeshes().forEach(child => {
                    if (child.material) {
                        child.material.emissiveColor = this.originalEmissiveColor;
                    }
                });
            }
            this.flashTimeout = null;
        }, 100);
    }

    update(delta) {
        if (this.isDisposed || !this.game.player) return;

        const playerPosition = this.game.player.hitbox.position;
        const myPosition = this.mesh.position;
        const direction = playerPosition.subtract(myPosition);
        const distance = direction.length();

        if (distance <= this.attackRange) {
            const now = Date.now();
            if (now - this.lastAttackTime > this.attackCooldown) {
                this.lastAttackTime = now;
                this.game.player.takeDamage(this.attackDamage);
            }
        } else {
            direction.normalize();
            const moveVector = direction.scale(this.speed * delta);
            this.mesh.moveWithCollisions(moveVector);
            this.mesh.rotationQuaternion = BABYLON.Quaternion.FromEulerAngles(0, Math.atan2(direction.x, direction.z), 0);
        }
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
