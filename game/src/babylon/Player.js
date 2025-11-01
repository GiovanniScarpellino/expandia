import * as BABYLON from '@babylonjs/core';
import { COLLISION_GROUPS } from '../BabylonGame.js';
import { Projectile } from './Projectile.js';

const ANIMATIONS_NAME = {
    IDLE: 'idle',
    RUN: 'run',
    ATTACK: 'punch'
}

export class Player {
    constructor(game, mesh, scene, animationGroups) {
        this.game = game;
        this.scene = scene;

        const hitboxHeight = 1.0;

        // The visual mesh that the player sees
        this.mesh = mesh;
        this.mesh.scaling = new BABYLON.Vector3(0.3, 0.3, 0.3);
        this.mesh.rotation = new BABYLON.Vector3(0, Math.PI * 2, 0);
        this.mesh.getChildMeshes(true).forEach(m => m.checkCollisions = false);

        // The invisible collision hitbox
        const hitboxWidth = 0.5;
        const hitboxDepth = 0.5;
        this.hitbox = BABYLON.MeshBuilder.CreateBox("playerHitbox", { width: hitboxWidth, height: hitboxHeight, depth: hitboxDepth }, scene);
        this.hitbox.position = new BABYLON.Vector3(0, hitboxHeight / 2, 0);
        this.hitbox.checkCollisions = true;
        this.hitbox.ellipsoid = new BABYLON.Vector3(hitboxWidth / 4, hitboxHeight / 2, hitboxDepth / 4);
        this.hitbox.isVisible = false;
        this.hitbox.applyGravity = false; // We will handle gravity manually

        // Parent the visual mesh to the hitbox, so it follows automatically
        this.mesh.parent = this.hitbox;
        this.mesh.position.y = -0.5;

        // Collision groups
        this.hitbox.collisionGroup = COLLISION_GROUPS.PLAYER;
        this.hitbox.collisionMask = COLLISION_GROUPS.TERRAIN | COLLISION_GROUPS.WALL | COLLISION_GROUPS.NPC;

        // Movement
        this.walkSpeed = 5;
        this.keys = { z: false, s: false, q: false, d: false };
        this.inputHandler = this.setupInput();
        this._verticalVelocity = 0;
        this.lastSafePosition = this.hitbox.position.clone();

        // Animations
        this.animations = {};
        this.activeAnimation = null;
        this.activeAnimationName = null;
        this.isAttacking = false;
        animationGroups.forEach(group => {
            let newName = group.name.toLowerCase();
            if(group.name.includes('|')) newName = newName.split('|').pop();
            if(group.name.includes('_')) newName = newName.split('_').pop();
            this.animations[newName] = group;
            group.stop();
        });

        // State & Stats
        this.maxHealth = 100;
        this.health = this.maxHealth;
        this.attackSpeed = 500;
        this.lastAttackTime = 0;
        this.projectileSpeedModifier = 1;

        // Progression
        this.level = 1;
        this.xp = 0;
        this.xpForNextLevel = 100;

        // Link takeDamage to hitbox metadata
        this.hitbox.metadata = {
            type: 'player',
            instance: this,
            takeDamage: (amount) => this.takeDamage(amount)
        };

        // Initial UI update
        this.game.ui.updateXpBar(this.xp, this.xpForNextLevel, this.level);
        this.playAnimation(ANIMATIONS_NAME.IDLE);
    }

    addXp(amount) {
        this.xp += amount;
        this.game.ui.updateXpBar(this.xp, this.xpForNextLevel, this.level);
        if (this.xp >= this.xpForNextLevel) {
            this.levelUp();
        }
    }

    levelUp() {
        this.level++;
        this.xp -= this.xpForNextLevel;
        this.xpForNextLevel = Math.floor(this.xpForNextLevel * 1.5);
        console.log(`%cLEVEL UP! Now level ${this.level}`, 'color: yellow; font-size: 1.2em;');
        this.game.ui.updateXpBar(this.xp, this.xpForNextLevel, this.level);
        this.game.startLevelUp();
    }

    playAnimation(name, loop = true, speed = 1.0) {
        if (this.activeAnimationName === name) return null;

        const animation = this.animations[name];
        if (animation) {
            if (this.activeAnimation) {
                this.activeAnimation.stop();
            }
            animation.start(loop, speed, animation.from, animation.to, false);
            this.activeAnimation = animation;
            this.activeAnimationName = name;
            return animation;
        } else {
            console.warn(`Animation not found: ${name}`);
        }
        return null;
    }

    setupInput() {
        const keydown = (e) => {
            const key = e.key.toLowerCase();
            if (key in this.keys) this.keys[key] = true;
        };

        const keyup = (e) => {
            const key = e.key.toLowerCase();
            if (key in this.keys) this.keys[key] = false;
        };

        window.addEventListener('keydown', keydown);
        window.addEventListener('keyup', keyup);

        return {
            dispose: () => {
                window.removeEventListener('keydown', keydown);
                window.removeEventListener('keyup', keyup);
            }
        };
    }

    attack() {
        if (this.isAttacking) return;
        const now = Date.now();
        if (now - this.lastAttackTime < this.attackSpeed) return;

        this.lastAttackTime = now;
        this.isAttacking = true;

        const targetPosition = this.game.mousePositionInWorld.clone();
        targetPosition.y = this.hitbox.position.y;

        this.game.addProjectile(new Projectile(this.game, this.hitbox.position.clone(), targetPosition, this.projectileSpeedModifier));
        
        const anim = this.playAnimation(ANIMATIONS_NAME.ATTACK, false, 1.5);
        if (anim) {
            anim.onAnimationEndObservable.addOnce(() => {
                this.isAttacking = false;
            });
        } else {
            // If no attack animation, reset state after a short delay
            setTimeout(() => { this.isAttacking = false; }, 300);
        }
    }

    harvest(resourceMesh) {
        const resourceType = this.game.resourceManager.harvestResource(resourceMesh);
        if (resourceType) {
            this.game.addResource(resourceType, 1);
        }
    }

    takeDamage(amount) {
        this.health -= amount;
        this.game.ui.updateHealth(this.health, this.maxHealth);

        if (this.health <= 0) {
            this.health = 0;
            console.error("GAME OVER - Le joueur a été vaincu !");
            this.game.gameOver();
        }
    }

    update(delta) {
        const isMoving = this.keys.z || this.keys.s || this.keys.q || this.keys.d;

        // --- Gravity ---
        this._verticalVelocity += this.scene.gravity.y * delta;
        const moveVector = new BABYLON.Vector3(0, this._verticalVelocity, 0);

        // --- Rotation --- 
        const mousePosition = this.game.mousePositionInWorld;
        if (mousePosition) {
            const direction = mousePosition.subtract(this.hitbox.position);
            direction.y = 0; // Keep rotation on the horizontal plane
            if (direction.lengthSquared() > 0.01) { // Add a small deadzone
                 this.hitbox.rotationQuaternion = BABYLON.Quaternion.FromEulerAngles(0, Math.atan2(direction.x, direction.z), 0);
            }
        }

        // --- Animations & Movement ---
        if (this.isAttacking) {
            // Do nothing, let the attack animation play
        } else if (isMoving) {
            this.playAnimation(ANIMATIONS_NAME.RUN);
            const direction = new BABYLON.Vector3(0, 0, 0);
            if (this.keys.z) direction.z += 1;
            if (this.keys.s) direction.z -= 1;
            if (this.keys.q) direction.x -= 1;
            if (this.keys.d) direction.x += 1;

            if (direction.lengthSquared() > 0) {
                direction.normalize();
                const horizontalMove = direction.scale(this.walkSpeed * delta);

                // Check if the next position is on a valid (unlocked) tile
                const nextPosition = this.hitbox.position.add(horizontalMove);
                if (this.game.world.canMoveTo(nextPosition)) {
                    moveVector.x = horizontalMove.x;
                    moveVector.z = horizontalMove.z;
                } else {
                    // To avoid getting stuck on corners, try moving along one axis at a time
                    const nextPositionX = this.hitbox.position.add(new BABYLON.Vector3(horizontalMove.x, 0, 0));
                    if (this.game.world.canMoveTo(nextPositionX)) {
                        moveVector.x = horizontalMove.x;
                    }
                    const nextPositionZ = this.hitbox.position.add(new BABYLON.Vector3(0, 0, horizontalMove.z));
                    if (this.game.world.canMoveTo(nextPositionZ)) {
                        moveVector.z = horizontalMove.z;
                    }
                }
            }
        } else {
            this.playAnimation(ANIMATIONS_NAME.IDLE);
        }

        this.hitbox.moveWithCollisions(moveVector);

        if (this.hitbox.position.y < 0.5) {
            this.hitbox.position.y = 0.5;
            this._verticalVelocity = 0;
        }

        // --- Safety Net --- 
        if (this.game.world.canMoveTo(this.hitbox.position)) {
            this.lastSafePosition = this.hitbox.position.clone();
        } else {
            // Player is on a locked tile, teleport back to safety
            console.warn("Player is on a locked tile! Teleporting back to safety.");
            this.hitbox.position = this.lastSafePosition.clone();
            this._verticalVelocity = 0; // Reset vertical velocity to prevent falling through floor
        }
    }

    dispose() {
        this.inputHandler.dispose();
        this.hitbox.dispose();
    }
}